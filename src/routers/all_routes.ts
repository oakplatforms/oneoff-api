import express from 'express'
const router = express.Router()
import { userRouter } from './user'
import { brandRouter } from './brand'
import { categoryRouter } from './category'
import { tagRouter } from './tag'
import { supportedTagValueRouter } from './supportedTagValue'
import { listRouter } from './list'
import { entityRouter } from './entity'
import { entityTagRouter } from './entityTag'
import { bidRouter } from './bid'
import { listingRouter } from './listing'
import { shippingMethodRouter } from './shippingMethod'
import { shippingOptionRouter } from './shippingOption'
import { orderRouter } from './order'
import { transactionRouter } from './transaction'
import { invoiceRouter } from './invoice'
import { accountRouter } from './account'
import { sellerRouter } from './seller'
import { customerRouter } from './customers'

router.use(userRouter)
router.use(accountRouter)
router.use(customerRouter)
router.use(sellerRouter)
router.use(brandRouter)
router.use(categoryRouter)
router.use(tagRouter)
router.use(supportedTagValueRouter)
router.use(listRouter)
router.use(entityRouter)
router.use(entityTagRouter)
router.use(bidRouter)
router.use(listingRouter)
router.use(shippingMethodRouter)
router.use(shippingOptionRouter)
router.use(transactionRouter)
router.use(orderRouter)
router.use(invoiceRouter)

export default router

