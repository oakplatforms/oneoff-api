import { APIGatewayProxyResult } from 'aws-lambda'
import jwt from 'jsonwebtoken'
import { getSecrets, OneoffSecrets } from '../src/utils/secretsManager'

let cachedSecrets: OneoffSecrets | null = null

export const handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    if (!cachedSecrets) {
      cachedSecrets = await getSecrets()
    }

    const payload = {
      role: 'guest',
      permissions: ['read-only'],
      exp: Math.floor(Date.now() / 1000) + 900
    }

    console.log('tempJwtSecret:', cachedSecrets.tempJwtSecret)

    const token = jwt.sign(payload, cachedSecrets.tempJwtSecret, { algorithm: 'HS256' })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({ token })
    }
  } catch (err) {
    console.error('Failed to generate guest token', err)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({ error: 'Could not generate guest token' })
    }
  }
}
