import request from 'supertest'
import express from 'express'
import { userRouter } from './user'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
const app = express()
app.use(express.json())
app.use(userRouter)

const mockUser = { authId: 'auth123' }
let createdUserId: string

describe('User Routes', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany()

    const response = await request(app).post('/user').send(mockUser)
    createdUserId = response.body.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany()
  })

  test('POST /user should create a new user', async () => {
    const response = await request(app).post('/user').send(mockUser)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ authId: mockUser.authId })
  })

  test('GET /users should return a list of users', async () => {
    const response = await request(app).get('/users')
    
    expect(response.status).toBe(200)
    expect(response.body).toBeInstanceOf(Array)
    expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ authId: mockUser.authId })]))
  })

  test('GET /user/:authId should return a user by authId', async () => {
    const response = await request(app).get(`/user/${mockUser.authId}`)
    
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ authId: mockUser.authId })
  })

  test('DELETE /user/:id should delete a user', async () => {
    const response = await request(app).delete(`/user/${createdUserId}`)
    
    expect(response.status).toBe(200)
    expect(response.body.id).toBe(createdUserId)
  })
})
