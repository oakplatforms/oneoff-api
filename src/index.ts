import express from 'express'
import { marketplaceRouter } from './routers/marketplace'
import { brandRouter } from './routers/brand'
import { categoryRouter } from './routers/category'
import { brandCategoryRouter } from './routers/brandCategory'
import { setRouter } from './routers/set'
import { productRouter } from './routers/product'


const app = express()
app.use(express.json())

app.use(marketplaceRouter)
app.use(brandRouter)
app.use(categoryRouter)
app.use(brandCategoryRouter)
app.use(setRouter)
app.use(productRouter)

const server = app.listen(3000, () =>
  console.log(`Server ready at: http://localhost:3000`),
)
