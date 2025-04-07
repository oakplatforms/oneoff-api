import request from 'supertest'
import express from 'express'
import { userRouter } from './user'

const app = express()
app.use(express.json())
app.use(userRouter)

describe('User API', () => {
  test('creates a user', async () => {
    const res = await request(app).post('/user').send({ authId: 'auth_test' })
    expect(res.status).toBe(200)
    expect(res.body.authId).toBe('auth_test')
  })

  test('gets users', async () => {
    const res = await request(app).get('/users')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
  })
})