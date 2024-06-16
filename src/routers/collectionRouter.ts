
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
const prisma = new PrismaClient()
export const collectionRouter = express.Router()

collectionRouter.get('/:tcgName/list/collections', async (req, res) => {
  const { tcgName } = req.params

  const collections = await prisma.collection.findMany({
    where: {
      tcgName: { contains: tcgName as string }
    }
  })

  res.json(collections)
})

collectionRouter.post(`/:tcgName/collection`, async (req, res) => {
  const { tcgName } = req.params
  const { name, type, displayName, description, products } = req.body

  const productData = products?.map((product: Prisma.ProductCreateInput) => {
    return { ...product, tcgName: tcgName }
  })
  const result = await prisma.collection.create({
    data: {
      name,
      type,
      displayName,
      description,
      products: {
        create: productData,
      },
      tcg: { connect: { name: tcgName } },
    },
  })
  res.json(result)
})

collectionRouter.get('/:tcgName/collection/:id', async (req, res) => {
  const { tcgName, id } = req.params

  const collection = await prisma.collection.findUnique({
    where: {
      id,
      tcgName: tcgName
    }
  })

  res.json(collection)
})

collectionRouter.delete(`/:tcgName/collection/:id`, async (req, res) => {
  const { id, tcgName } = req.params
  const collection = await prisma.collection.delete({
    where: {
      id: id,
      tcgName: { contains: tcgName as string }
    },
  })
  res.json(collection)
})
