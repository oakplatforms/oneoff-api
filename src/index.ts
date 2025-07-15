import express, { Request, Response } from 'express'
import router from './routers/all_routes'
import cors from 'cors'

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason)
})

const app = express()

app.use(cors({
  origin: 'https://tcgx-admin-dev.s3.us-east-1.amazonaws.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '10mb' }))
app.use('/api/v1', router)

app.use((err: Error, req: Request, res: Response) => {
  if (!res.headersSent) {
    res.status(err.message ? 400 : 500).json({
      errorMessage: err.message || 'Internal Server Error',
    })
  }
})

export { app }
