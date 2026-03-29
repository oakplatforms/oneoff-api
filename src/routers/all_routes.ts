import express from 'express'
const router = express.Router()
import { userRouter } from './user'
import { accountRouter } from './account'
import { authRouter } from './auth'
import { tagRouter } from './tag'
import { supportedTagValueRouter } from './supportedTagValue'
import { listRouter } from './list'
import { entityRouter } from './entity'
import { entityTagRouter } from './entityTag'
import { entityListRouter } from './entityList'
import { listingRouter } from './listing'
import { orderRouter } from './order'
import { transactionRouter } from './transaction'
import { invoiceRouter } from './invoice'
import { sellerRouter } from './seller'
import { customerRouter } from './customer'
import { profileRouter } from './profile'
import { contentRouter } from './content'
import { warmupRouter } from './warmup'
import { universalRouter } from './universal'
import { feedRouter } from './feed'
import { savedItemRouter } from './savedItem'
import { searchRouter } from './search'
import { activityRouter } from './activity'

router.use(warmupRouter)
router.use(userRouter)
router.use(accountRouter)
router.use(authRouter)
router.use(customerRouter)
router.use(sellerRouter)
router.use(tagRouter)
router.use(supportedTagValueRouter)
router.use(listRouter)
router.use(entityRouter)
router.use(entityTagRouter)
router.use(entityListRouter)
router.use(listingRouter)
router.use(transactionRouter)
router.use(orderRouter)
router.use(invoiceRouter)
router.use(contentRouter)
router.use(feedRouter)
router.use(savedItemRouter)
router.use(searchRouter)
router.use(activityRouter)

router.use(profileRouter)
router.use(universalRouter)

export default router
