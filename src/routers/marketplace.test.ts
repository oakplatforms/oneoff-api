import request from 'supertest'
import express from 'express'
import { marketplaceRouter } from './marketplace'
import { createTestUserAndAccount, cleanTestDatabase } from '../utils/testHelpers'

const app = express()
app.use(express.json())
app.use(marketplaceRouter)

const mockMarketplace = {
  name: 'test-marketplace',
  displayName: 'Test Marketplace',
}

describe('Marketplace Routes', () => {
  let accountId: string

  beforeAll(async () => {
    await cleanTestDatabase()
    const { account } = await createTestUserAndAccount()
    accountId = account.id
  })

  afterAll(async () => {
    await cleanTestDatabase()
  })

  test('POST /marketplace should create a marketplace', async () => {
    const res = await request(app)
      .post('/marketplace')
      .send({ ...mockMarketplace, createdById: accountId })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe(mockMarketplace.name)
  })

  test('GET /marketplaces should return a list of marketplaces', async () => {
    await request(app)
      .post('/marketplace')
      .send({ ...mockMarketplace, createdById: accountId })

    const res = await request(app)
      .get('/marketplaces')

    expect(res.status).toBe(200)
    expect(res.body).toBeInstanceOf(Array)
    expect(res.body.length).toBeGreaterThan(0)

    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: mockMarketplace.name,
          displayName: mockMarketplace.displayName,
        }),
      ])
    )
  })
})
