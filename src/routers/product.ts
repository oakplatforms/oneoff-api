
import { PrismaClient } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'

const prisma = new PrismaClient()
export const productRouter = express.Router()

productRouter.get('/:marketplaceName/:brandName/list/products', async (req, res) => {
  const { brandName } = req.params
  const { include, category } = req.query
  const brandCategory = await prisma.brandCategory.findFirstOrThrow({
    where: {
      brandName: brandName,
      categoryName: category as string || ''
    }
  })
  if (brandCategory) {
    const categories = await prisma.product.findMany({
      where: {
        brandCategoryId: brandCategory.id as string
      },
      include: generateIncludes(include)
    })
    res.json(categories)
  }
})

productRouter.post(`/:marketplaceName/:brandName/product`, async (req, res) => {
  const { name, type, displayName, description, sku, card, brandCategoryId, setId, productImage, price, releaseDate } = req.body
  const result = await prisma.product.create({
    data: {
      name,
      type,
      displayName,
      description,
      sku,
      price,
      productImage,
      releaseDate,
      card: {
        create: {
          ...card,
          brandCategory: { connect: { id: brandCategoryId }
        }},
      },
      set: { connect: { id: setId } },
      brandCategory: { connect: { id: brandCategoryId } }
    },
  })
  res.json(result)
})

productRouter.get('/:marketplaceName/:brandName/product/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query
  const products = await prisma.product.findUnique({
    where: {
      id
    },
    include: generateIncludes(include)
  })

  res.json(products)
})

productRouter.delete(`/:marketplaceName/:brandName/product/:id`, async (req, res) => {
  const { id } = req.params
  const product = await prisma.product.delete({
    where: {
      id: id
    },
  })
  res.json(product)
})
