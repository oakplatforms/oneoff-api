import express, { Request, Response } from 'express'
import router from './routers/all_routes'

interface LambdaRequestContext {
  authorizer?: {
    principalId: string
    role: string
    userPool: string
  }
}

interface LambdaRequest extends Request {
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
  const authorizer = requestContext?.authorizer

  console.log('Authorizer:', authorizer)
  console.log('Authorizer keys:', authorizer ? Object.keys(authorizer) : 'No authorizer')
  console.log('Raw request context:', JSON.stringify(requestContext, null, 2))
  console.log('Request context authorizer:', requestContext?.authorizer)
  console.log('Request context authorizer type:', typeof requestContext?.authorizer)

  if (authorizer) {
    //The authorizer context only contains role and userPool
    //The principalId should be available in requestContext.authorizer.principalId
    req.user = {
      principalId: authorizer.principalId,
      role: authorizer.role,
      userPool: authorizer.userPool
    }
    console.log('Set req.user:', req.user)
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
