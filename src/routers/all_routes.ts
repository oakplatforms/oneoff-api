import express from 'express'
const router = express.Router()
import { userRouter } from './user'
import { marketplaceRouter } from './marketplace'
import { brandRouter } from './brand'
import { categoryRouter } from './category'
import { tagRouter } from './tag'
import { brandCategoryRouter } from './brandCategory'
import { collectionRouter } from './collection'
import { productRouter } from './product'
import { productTagRouter } from './productTag'

router.use(userRouter)
router.use(marketplaceRouter)
router.use(brandRouter)
router.use(categoryRouter)
router.use(tagRouter)
router.use(brandCategoryRouter)
router.use(collectionRouter)
router.use(productRouter)
router.use(productTagRouter)

export default router



