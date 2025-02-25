import request from 'supertest'
import express from 'express'
import { marketplaceRouter } from './marketplace'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
const app = express()
app.use(express.json())
app.use(marketplaceRouter)

const mockMarketplaceOne = {
  name: 'test-marketplace-1',
  displayName: 'Test Marketplace 1',
}

const mockMarketplaceTwo = {
  name: 'test-marketplace-2',
  displayName: 'Test Marketplace 2',
}

describe('Marketplace Routes', () => {
  beforeAll(async () => {
    await prisma.marketplace.deleteMany()
    await request(app).post('/marketplace').send(mockMarketplaceOne)
  })

  afterAll(async () => {
    await prisma.marketplace.deleteMany()
  })

  test('POST /marketplace should create a new marketplace', async () => {
    const response = await request(app).post('/marketplace').send(mockMarketplaceTwo)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      name: mockMarketplaceTwo.name,
      displayName: mockMarketplaceTwo.displayName,
    })
  })

  test('GET /marketplaces should return a list of marketplaces', async () => {
    const response = await request(app).get('/marketplaces')

    expect(response.status).toBe(200)
    expect(response.body).toBeInstanceOf(Array)
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: mockMarketplaceOne.name,
          displayName: mockMarketplaceOne.displayName
        })
      ])
    )
  })
})
