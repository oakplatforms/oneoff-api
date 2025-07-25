import express, { Request, Response } from 'express'
import router from './routers/all_routes'

interface LambdaRequestContext {
  authorizer?: {
    principalId?: string
    role: string
    userPool: string
    sub?: string
    context?: {
      role: string
      userPool: string
      principalId?: string
      sub?: string
    }
    lambda?: {
      role: string
      userPool: string
      principalId?: string
      sub?: string
    }
  }
}

interface LambdaRequest extends Request {
  requestContext?: LambdaRequestContext
}

interface ExtendedRequest extends Request {
  requestContext?: LambdaRequestContext
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      principalId: string
      role: string
      userPool: string
    }
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason)
})

const app = express()

app.use(express.json({ limit: '10mb' }))

app.use((req, res, next) => {
  console.log('🔍 MIDDLEWARE CALLED for:', req.method, req.path)
  console.log('=== MIDDLEWARE DEBUG ===')
  console.log('Request headers:', req.headers)
  console.log('Request body:', req.body)
  console.log('Request context:', (req as LambdaRequest).requestContext)
  console.log('Full request object keys:', Object.keys(req))
  console.log('Request context keys:', Object.keys((req as LambdaRequest).requestContext || {}))

  const requestContext = (req as LambdaRequest).requestContext

  //For API Gateway v2 (HTTP API), the authorizer context is in requestContext.authorizer
  //but the structure might be different than v1
  console.log('Raw request context:', JSON.stringify(requestContext, null, 2))

  //Try different possible locations for authorizer data in v2
  const authorizerV1 = requestContext?.authorizer
  const authorizerV2 = (req as ExtendedRequest).requestContext?.authorizer
  const authorizerContext = requestContext?.authorizer?.context
  const authorizerLambda = requestContext?.authorizer?.lambda

  console.log('Authorizer V1:', authorizerV1)
  console.log('Authorizer V2:', authorizerV2)
  console.log('Authorizer Context:', authorizerContext)
  console.log('Authorizer Lambda:', authorizerLambda)

  //Try to find the authorizer data in the correct location
  const authorizer = authorizerV1 || authorizerV2 || authorizerContext || authorizerLambda

  //Also check for authorizer data in custom headers (for HTTP API v2)
  const headerRole = req.headers['x-authorizer-role'] as string
  const headerUserPool = req.headers['x-authorizer-userpool'] as string
  const headerPrincipalId = req.headers['x-authorizer-principalid'] as string

  console.log('Header Role:', headerRole)
  console.log('Header UserPool:', headerUserPool)
  console.log('Header PrincipalId:', headerPrincipalId)

  if (authorizer) {
    console.log('Found authorizer:', authorizer)
    console.log('Authorizer keys:', Object.keys(authorizer))

    req.user = {
      principalId: authorizer.principalId || authorizer.sub || 'unknown',
      role: authorizer.role,
      userPool: authorizer.userPool
    }
    console.log('Set req.user:', req.user)
  } else if (headerRole && headerUserPool) {
    console.log('Found authorizer data in headers')
    req.user = {
      principalId: headerPrincipalId || 'unknown',
      role: headerRole,
      userPool: headerUserPool
    }
    console.log('Set req.user from headers:', req.user)
  } else {
    console.log('No authorizer found - req.user will be undefined')
  }

  next()
})

app.use('/api/v1', router)

app.use((err: Error, req: Request, res: Response) => {
  if (!res.headersSent) {
    res.status(err.message ? 400 : 500).json({
      errorMessage: err.message || 'Internal Server Error',
    })
  }
})

export { app }
