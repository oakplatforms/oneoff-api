import express from 'express'
const router = express.Router()
import { userRouter } from './user'
import { accountRouter } from './account'
import { authRouter } from './auth'
import { cartRouter } from './cart'
import { brandRouter } from './brand'
import { categoryRouter } from './category'
import { tagRouter } from './tag'
import { brandTagRouter } from './brandTag'
import { supportedTagValueRouter } from './supportedTagValue'
import { listRouter } from './list'
import { entityRouter } from './entity'
import { entityTagRouter } from './entityTag'
import { entityListRouter } from './entityList'
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
import { profileRouter } from './profile'
import { conditionRouter } from './condition'
import { productRouter } from './product'
import { setRouter } from './set'
import { warmupRouter } from './warmup'
import { refundRouter } from './refund'
import { universalRouter } from './universal'

router.use(warmupRouter)
router.use(userRouter)
router.use(accountRouter)
router.use(authRouter)
router.use(cartRouter)
router.use(customerRouter)
router.use(sellerRouter)
router.use(brandRouter)
router.use(categoryRouter)
router.use(tagRouter)
router.use(brandTagRouter)
router.use(supportedTagValueRouter)
router.use(listRouter)
router.use(entityRouter)
router.use(entityTagRouter)
router.use(entityListRouter)
router.use(bidRouter)
router.use(listingRouter)
router.use(shippingMethodRouter)
router.use(shippingOptionRouter)
router.use(transactionRouter)
router.use(orderRouter)
router.use(invoiceRouter)
router.use(shipmentRouter)
router.use(offerRouter)
router.use(conditionRouter)
router.use(productRouter)
router.use(setRouter)
router.use(refundRouter)
router.use(profileRouter)

// Universal ticker router - MUST BE LAST to catch unmatched 6-char codes
router.use(universalRouter)

export default router
