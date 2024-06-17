import express from 'express'
import { tcgRouter } from './routers/tcgRouter'
import { collectionRouter } from './routers/collectionRouter'
import { deckRouter } from './routers/deckRouter'
import { productRouter } from './routers/productRouter'

const app = express()
app.use(express.json())

app.use(tcgRouter)
app.use(collectionRouter)
app.use(deckRouter)
app.use(productRouter)


const server = app.listen(3000, () =>
  console.log(`Server ready at: http://localhost:3000`),
)
