import request from 'supertest'
import express from 'express'
import { marketplaceRouter } from './marketplace'
import { brandRouter } from './brand'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
const app = express()
app.use(express.json())
app.use(marketplaceRouter)
app.use(brandRouter)

const mockMarketplaceBrandOne = {
  name: 'test-marketplace-brand-1',
  displayName: 'Test Marketplace Brand 1',
  brands: [],
}

const mockBrandOne = {
  name: 'test-brand-1',
  displayName: 'Test Brand 1',
}

const mockBrandTwo = {
  name: 'test-brand-2',
  displayName: 'Test Brand 2',
}

let createdBrandId: string

describe('Marketplace and Brand Routes', () => {
  beforeAll(async () => {
    await prisma.marketplace.deleteMany()
    await prisma.brand.deleteMany()
    await request(app).post('/marketplace').send(mockMarketplaceBrandOne)

    const brandResponse = await request(app)
      .post(`/test-marketplace-brand-1/brand`)
      .send(mockBrandOne)

    createdBrandId = brandResponse.body.id
  })

  afterAll(async () => {
    await prisma.brand.deleteMany()
    await prisma.marketplace.deleteMany()
  })

  test('POST /:marketplaceName/brand should create a new brand', async () => {
    const response = await request(app).post(`/test-marketplace-brand-1/brand`).send(mockBrandTwo)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      name: mockBrandTwo.name,
      displayName: mockBrandTwo.displayName,
    })
  })

  test('GET /:marketplaceName/brands should return a list of brands', async () => {
    const response = await request(app).get(`/test-marketplace-brand-1/brands`)

    expect(response.status).toBe(200)
    expect(response.body).toBeInstanceOf(Array)
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: mockBrandOne.name, displayName: mockBrandOne.displayName })
      ])
    )
  })

  test('GET /:marketplaceName/brand/:id should return a brand by ID', async () => {
    const response = await request(app).get(`/test-marketplace-brand-1/brand/${createdBrandId}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ name: mockBrandOne.name, displayName: mockBrandOne.displayName })
  })

  test('DELETE /:marketplaceName/brand/:id should delete a brand', async () => {
    const response = await request(app).delete(`/test-marketplace-brand-1/brand/${createdBrandId}`)

    expect(response.status).toBe(200)
    expect(response.body.id).toBe(createdBrandId)
  })
})
