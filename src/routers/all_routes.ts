import express from 'express'
const router = express.Router()
import { userRouter } from './user'
import { marketplaceRouter } from './marketplace'
import { brandRouter } from './brand'
import { categoryRouter } from './category'
import { tagRouter } from './tag'
import { supportedTagValueRouter } from './supportedTagValue'
import { brandCategoryRouter } from './brandCategory'
import { listRouter } from './list'
import { entityRouter } from './entity'
import { entityTagRouter } from './entityTag'
import { bidRouter } from './bid'
import { listingRouter } from './listing'
import { shippingCategoryRouter } from './shippingCategory'
import { orderRouter } from './order'
import { transactionRouter } from './transaction'
import { invoiceRouter } from './invoice'

router.use(userRouter)
router.use(marketplaceRouter)
router.use(brandRouter)
router.use(categoryRouter)
router.use(tagRouter)
router.use(supportedTagValueRouter)
router.use(brandCategoryRouter)
router.use(listRouter)
router.use(entityRouter)
router.use(entityTagRouter)
router.use(bidRouter)
router.use(listingRouter)
router.use(shippingCategoryRouter)
router.use(transactionRouter)
router.use(orderRouter)
router.use(invoiceRouter)

export default router

