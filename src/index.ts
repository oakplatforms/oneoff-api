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
  const requestContext = (req as LambdaRequest).requestContext
  const authorizer = requestContext?.authorizer

  if (authorizer) {
    req.user = {
      principalId: authorizer.principalId,
      role: authorizer.role,
      userPool: authorizer.userPool
    }
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
