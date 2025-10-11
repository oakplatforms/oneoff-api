import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import type { APIGatewayAuthorizerEvent } from 'aws-lambda'

type ExtendedAuthorizerEvent = APIGatewayAuthorizerEvent & {
  headers?: Record<string, string>
  multiValueHeaders?: Record<string, string[]>
  authorizationToken?: string
  methodArn?: string
  routeArn?: string
  requestContext?: {
    http?: {
      method?: string
    }
  }
  httpMethod?: string
}

const COGNITO_REGION = 'us-east-1'
const USER_POOLS = {
  admin: process.env.ADMIN_USER_POOL_ID,
  consumer: process.env.CONSUMER_USER_POOL_ID,
}
const TEMP_JWT_SECRET = process.env.TEMP_JWT_SECRET

function getJwksUrl(userPoolId: string) {
  return `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
}

async function getPublicKey(kid: string, jwksUrl: string) {
  const client = jwksClient({ jwksUri: jwksUrl })
  const key = await client.getSigningKey(kid)
  return key.getPublicKey()
}

function deny(resource: string) {
  return {
    principalId: 'unauthorized',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Deny',
          Resource: resource,
        },
      ],
    },
    context: {},
  }
}

function generatePolicy(
  principalId: string,
  effect: string,
  resource: string,
  context: Record<string, unknown> = {}
) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  }
}

function pickHeader(
  event: ExtendedAuthorizerEvent,
  name: string
): string | undefined {
  const h = event.headers || {}
  const mv = event.multiValueHeaders || {}
  //try exact + lowercase in headers (string)
  const str = h[name] ?? h[name.toLowerCase()]
  if (str) return str
  //try multiValueHeaders (array)
  const arr = mv[name] ?? mv[name.toLowerCase()]
  if (Array.isArray(arr) && arr.length) return arr[0]
  return undefined
}

function extractBearer(raw?: string): string | undefined {
  if (!raw) return undefined
  //Handle weird cases like '["Bearer XXX"]'
  if (raw.startsWith('["') || raw.startsWith("['")) {
    try {
      const arr = JSON.parse(raw.replace(/'/g, '"'))
      raw = Array.isArray(arr) ? arr[0] : raw
    } catch {
      //ignore
    }
  }
  const match = raw?.match(/Bearer\s+(.+)/i)
  return match ? match[1].trim() : undefined
}

export async function handler(event: ExtendedAuthorizerEvent) {
  try {
    const isTokenEvent = !!event.authorizationToken

    console.log('Event type:', event.type)
    console.log('Is token event:', isTokenEvent)
    console.log('Event headers:', JSON.stringify(event.headers, null, 2))
    console.log('Event multiValueHeaders:', JSON.stringify(event.multiValueHeaders, null, 2))
    console.log('Event authorizationToken:', event.authorizationToken)

    let rawHeader: string | undefined

    if (isTokenEvent) {
      rawHeader = event.authorizationToken
    } else {
      const authHeader = pickHeader(event, 'authorization') || pickHeader(event, 'Authorization')
      const xAuthHeader = pickHeader(event, 'x-authorization') || pickHeader(event, 'X-Authorization')
      console.log('Authorization header:', authHeader)
      console.log('X-Authorization header:', xAuthHeader)
      rawHeader = xAuthHeader || authHeader
    }

    console.log('Raw header:', rawHeader)
    const token = extractBearer(rawHeader)

    const routeArn = event.methodArn || event.routeArn || '*'
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET'

    console.log('Route ARN:', routeArn)
    console.log('Method:', method)
    console.log('Token:', token)

    if (!token) {
      console.warn('Missing token')
      return deny(routeArn)
    }

    console.log('Token (first 20):', token.slice(0, 20), '…')
    const decodedHeader = jwt.decode(token, { complete: true }) as { header?: { alg?: string; kid?: string } } | null
    if (!decodedHeader?.header) {
      console.warn('Malformed token, no header')
      return deny(routeArn)
    }

    const alg = decodedHeader.header.alg

    if (alg === 'HS256') {
      try {
        if (!TEMP_JWT_SECRET) throw new Error('TEMP_JWT_SECRET not configured')
        const decodedGuest = jwt.verify(token, TEMP_JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload
        if (decodedGuest?.role === 'guest') {
          //Guest users can only make GET requests to read-only endpoints
          if (method !== 'GET') {
            console.warn(`Guest user attempted ${method} request - denied`)
            return deny(routeArn)
          }

          const guestPolicy = generatePolicy('guest', 'Allow', routeArn, {
            role: 'guest',
            userPool: 'temporary',
            principalId: 'guest',
          })
          console.log('Generated guest policy:', JSON.stringify(guestPolicy, null, 2))
          return guestPolicy
        } else {
          console.warn('Invalid guest token role')
          return deny(routeArn)
        }
      } catch (err) {
        const error = err as Error
        console.error('Guest token verification failed:', error.message)
        return deny(routeArn)
      }
    }

    //🔐 Cognito token
    const decodedPayload = jwt.decode(token) as jwt.JwtPayload | null
    const issuer = decodedPayload?.iss
    if (!issuer) throw new Error('Issuer not found in token')

    let userPoolId: string | undefined
    if (issuer === `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${USER_POOLS.admin}`) {
      userPoolId = USER_POOLS.admin
    } else if (issuer === `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${USER_POOLS.consumer}`) {
      userPoolId = USER_POOLS.consumer
    } else {
      throw new Error('Unknown issuer')
    }

    const jwksUrl = getJwksUrl(userPoolId as string)
    const publicKey = await getPublicKey(decodedHeader.header.kid as string, jwksUrl)
    const decodedUser = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload

    //Get the user's Cognito groups to determine their actual role
    const cognitoGroups = decodedUser['cognito:groups'] as string[] || []
    console.log('Cognito groups:', cognitoGroups)

    let role = 'registered'
    if (cognitoGroups.includes('admin')) {
      role = 'admin'
    } else if (cognitoGroups.includes('seller')) {
      role = 'seller'
    } else if (cognitoGroups.includes('customer')) {
      role = 'customer'
    } else if (cognitoGroups.includes('registered')) {
      role = 'registered'
    }

    const policy = generatePolicy(decodedUser.sub as string, 'Allow', routeArn, {
      role,
      userPool: userPoolId,
      principalId: decodedUser.sub as string
    })

    console.log('Generated policy:', JSON.stringify(policy, null, 2))
    return policy
  } catch (error) {
    const err = error as Error
    console.error('Authorization Error:', err.message)
    return deny(event.methodArn || event.routeArn || '*')
  }
}