
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
const prisma = new PrismaClient()
export const tcgRouter = express.Router()

tcgRouter.get('/list/tcgs', async (req, res) => {
  const result = await prisma.tcg.findMany()
  res.json(result)
})

tcgRouter.post(`/tcg`, async (req, res) => {
  const { name, displayName, type, cards } = req.body

  const cardData = cards?.map((card: Prisma.CardCreateInput) => {
    return { title: card?.title, description: card?.description }
  })

  const result = await prisma.tcg.create({
    data: {
      name,
      displayName,
      type,
      cards: {
        create: cardData,
      },
    },
  })
  res.json(result)
})
