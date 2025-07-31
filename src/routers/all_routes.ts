import express from 'express'
const router = express.Router()
import { userRouter } from './user'
import { accountRouter } from './account'
import { authRouter } from './auth'
import { cartRouter } from './cart'
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
import { sellerRouter } from './seller'
import { customerRouter } from './customer'
import { shipmentRouter } from './shipment'
import { offerRouter } from './offer'

router.use(userRouter)
router.use(accountRouter)
router.use(authRouter)
router.use(cartRouter)
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
router.use(shipmentRouter)
router.use(offerRouter)

export default router
