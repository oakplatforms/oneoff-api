import express, { Request, Response } from 'express'
import router from './routers/all_routes'

interface ExtendedRequest extends Request {
  apiGateway?: {
    event: {
      requestContext?: {
        authorizer?: {
          lambda?: {
            principalId?: string
            role: string
            userPool: string
          }
        }
      }
    }
  }
  event?: unknown
  lambdaEvent?: unknown
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

  //Debug what's available on the request object
  console.log('Full req keys:', Object.keys(req))
  console.log('Request apiGateway:', (req as ExtendedRequest).apiGateway)
  console.log('Request event:', (req as ExtendedRequest).event)
  console.log('Request lambdaEvent:', (req as ExtendedRequest).lambdaEvent)

  const rawEvent = (req as ExtendedRequest).apiGateway?.event
  const lambdaContext = rawEvent?.requestContext?.authorizer?.lambda

  console.log('Raw event:', rawEvent ? 'Found' : 'Not found')
  console.log('Lambda context:', lambdaContext)

  if (!lambdaContext) {
    console.log('No authorizer context found - req.user will be undefined')
  } else {
    console.log('Found authorizer context:', lambdaContext)
    req.user = {
      principalId: lambdaContext.principalId || 'unknown',
      role: lambdaContext.role,
      userPool: lambdaContext.userPool
    }
    console.log('Set req.user:', req.user)
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
