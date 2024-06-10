import express from 'express'
import { tcgRouter } from './routers/tcgRouter'
import { cardRouter } from './routers/cardRouter'

const app = express()
app.use(express.json())

app.use(tcgRouter)
app.use(cardRouter)

const server = app.listen(3000, () =>
  console.log(`Server ready at: http://localhost:3000`),
)
