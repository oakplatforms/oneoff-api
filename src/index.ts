import express, { Request, Response } from 'express'
import router from './routers/all_routes'

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

app.use(express.json({ limit: '1mb' }))

app.use((req, res, next) => {
  console.log('🔍 MIDDLEWARE CALLED for:', req.method, req.path)

  //Read authorizer data from custom headers (set by Lambda handler)
  const headerRole = req.headers['x-authorizer-role'] as string
  const headerUserPool = req.headers['x-authorizer-userpool'] as string
  const headerPrincipalId = req.headers['x-authorizer-principalid'] as string

  console.log('Header Role:', headerRole)
  console.log('Header UserPool:', headerUserPool)
  console.log('Header PrincipalId:', headerPrincipalId)

  if (headerRole && headerUserPool) {
    console.log('Found authorizer data in headers')
    req.user = {
      principalId: headerPrincipalId || 'unknown',
      role: headerRole,
      userPool: headerUserPool
    }
    console.log('Set req.user from headers:', req.user)
  } else {
    console.log('No authorizer data found in headers - req.user will be undefined')
  }

  next()
})

app.use('/', router)

app.use((err: Error, req: Request, res: Response) => {
  if (!res.headersSent) {
    res.status(err.message ? 400 : 500).json({
      errorMessage: err.message || 'Internal Server Error',
    })
  }
  //Don't call next() after sending response - this can cause the request to hang
})

export { app }
