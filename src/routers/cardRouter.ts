
import { PrismaClient } from '@prisma/client'
import express from 'express'
const prisma = new PrismaClient()
export const cardRouter = express.Router()

cardRouter.get('/:tcgName/list/cards', async (req, res) => {
  const { tcgName } = req.params

  const cards = await prisma.card.findMany({
    where: {
      tcgName: { contains: tcgName as string }
    }
  })

  res.json(cards)
})

cardRouter.post(`/:tcgName/card`, async (req, res) => {
  const { tcgName } = req.params
  const { title, description, sku } = req.body
  const result = await prisma.card.create({
    data: {
      title,
      description,
      sku,
      tcg: { connect: { name: tcgName } },
    },
  })
  res.json(result)
})
  
cardRouter.put('/:tcgName/card/:id/views', async (req, res) => {
  const { id, tcgName } = req.params
  try {
    const card = await prisma.card.update({
      where: { id: id },
      data: {
        viewCount: {
          increment: 1,
        },
        tcg: { connect: { name: tcgName } },
      },
    })

    res.json(card)
  } catch (error) {
    res.json({ error: `card with ID ${id} does not exist in the database` })
  }
})

cardRouter.get('/:tcgName/card/:id', async (req, res) => {
  const { tcgName, id } = req.params

  const cards = await prisma.card.findUnique({
    where: {
      id,
      tcgName: tcgName
    }
  })

  res.json(cards)
})

cardRouter.delete(`/:tcgName/card/:id`, async (req, res) => {
  const { id, tcgName } = req.params
  const card = await prisma.card.delete({
    where: {
      id: id,
      tcgName: { contains: tcgName as string }
    },
  })
  res.json(card)
})
