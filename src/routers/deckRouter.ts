
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'

const prisma = new PrismaClient()
export const deckRouter = express.Router()

deckRouter.get('/:tcgName/list/decks', async (req, res) => {
  const { tcgName } = req.params
  const { include } = req.query
  const decks = await prisma.collection.findMany({
    where: {
      tcgName: { contains: tcgName as string }
    },
    include: generateIncludes(include)
  })

  res.json(decks)
})

deckRouter.post(`/:tcgName/deck`, async (req, res) => {
  const { tcgName } = req.params
  const { name, type, displayName, description, products } = req.body

  const productData = products?.map((product: Prisma.ProductCreateInput) => {
    return { ...product, tcgName: tcgName }
  })

  const result = await prisma.deck.create({
    data: {
      name,
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

deckRouter.get('/:tcgName/deck/:id', async (req, res) => {
  const { tcgName, id } = req.params
  const { include } = req.query
  const deck = await prisma.deck.findUnique({
    where: {
      id,
      tcgName: tcgName
    },
    include: generateIncludes(include)
  })

  res.json(deck)
})

deckRouter.delete(`/:tcgName/deck/:id`, async (req, res) => {
  const { id, tcgName } = req.params
  const deck = await prisma.deck.delete({
    where: {
      id: id,
      tcgName: { contains: tcgName as string }
    },
  })
  res.json(deck)
})
