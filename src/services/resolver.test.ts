import express from 'express'
import { marketplaceRouter } from '../routers/marketplace'
import { brandRouter } from '../routers/brand'
import { getPrismaClient } from '../utils/prismaHelpers'
import { resolveListings, resolveBids } from './resolver'

const prisma = getPrismaClient()
const app = express()
app.use(express.json())
app.use(marketplaceRouter)
app.use(brandRouter)

describe('Resolver Service', () => {
  let createdById: string
  let sellerCreatedById: string
  let entityId: string
  let brandName: string
  let categoryName: string
  let marketplaceName: string

  beforeAll(async () => {
    await prisma.listing.deleteMany()
    await prisma.bid.deleteMany()
    await prisma.profile.deleteMany()
    await prisma.entity.deleteMany()
    await prisma.brandCategory.deleteMany()
    await prisma.brand.deleteMany()
    await prisma.category.deleteMany()
    await prisma.marketplace.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()

    const user = await prisma.user.create({
      data: { authId: 'test-auth' },
    })

    const account = await prisma.account.create({
      data: { id: 'test-account', userId: user.id },
    })

    const profile = await prisma.profile.create({
      data: {
        username: 'test-user',
        fullName: 'Test User',
        accountId: account.id,
      },
    })

    createdById = profile.id

    const sellerUser = await prisma.user.create({
      data: { authId: 'seller-auth' },
    })

    const sellerAccount = await prisma.account.create({
      data: { id: 'seller-account', userId: sellerUser.id },
    })

    const sellerProfile = await prisma.profile.create({
      data: {
        username: 'seller-user',
        fullName: 'Seller User',
        accountId: sellerAccount.id,
      },
    })

    sellerCreatedById = sellerProfile.id

    const marketplace = await prisma.marketplace.create({
      data: { name: 'test-marketplace' },
    })

    marketplaceName = marketplace.name

    const brand = await prisma.brand.create({
      data: { name: 'Test Brand', marketplaceName },
    })

    brandName = brand.name

    const category = await prisma.category.create({
      data: { name: 'Test Category', marketplaceName },
    })

    categoryName = category.name

    const brandCategory = await prisma.brandCategory.create({
      data: { brandName, categoryName },
    })

    const entity = await prisma.entity.create({
      data: {
        name: 'Test Entity',
        displayName: 'Test Entity Display',
        description: 'Test Description',
        brandCategoryId: brandCategory.id,
      },
    })

    entityId = entity.id
  })

  afterAll(async () => {
    await prisma.listing.deleteMany()
    await prisma.bid.deleteMany()
    await prisma.profile.deleteMany()
    await prisma.entity.deleteMany()
    await prisma.brandCategory.deleteMany()
    await prisma.brand.deleteMany()
    await prisma.category.deleteMany()
    await prisma.marketplace.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
  })

  test('resolveListings should return active listings matching bid criteria', async () => {
    const mockBid = {
      entityId,
      price: '100',
      createdById,
    }

    await prisma.listing.create({
      data: {
        entityId,
        price: '90',
        status: 'ACTIVE',
        quantity: 5,
        createdById: sellerCreatedById,
      },
    })

    const listings = await resolveListings(mockBid)
    expect(listings).toBeInstanceOf(Array)
    expect(listings.length).toBeGreaterThan(0)
    expect(listings[0]).toMatchObject({ entityId })
  })

  test('resolveBids should return active bids matching listing criteria', async () => {
    const mockListing = {
      entityId,
      price: '80',
      createdById: sellerCreatedById,
    }

    await prisma.bid.create({
      data: {
        entityId,
        price: '85',
        status: 'ACTIVE',
        quantity: 3,
        createdById: sellerCreatedById
      },
    })

    const bids = await resolveBids(mockListing)
    expect(bids).toBeInstanceOf(Array)
    expect(bids.length).toBeGreaterThan(0)
    expect(bids[0]).toMatchObject({ entityId })
  })
})
