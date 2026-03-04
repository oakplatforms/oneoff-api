import express, { Request, Response } from 'express'
import { prismaClient } from '../utils/prismaHelpers'
import { createInvoiceWithTransactions } from '../services/invoice'
import { validateAccount, AuthenticatedUser } from '../validation/user'

export const cartRouter = express.Router()
const prisma = prismaClient()

// Create cart for account
cartRouter.post('/cart', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')

    const cart = await prisma.cart.create({
      data: {
        accountId,
        status: 'ACTIVE',
      },
      include: {
        orders: true,
      },
    })

    return res.status(201).json(cart)
  } catch (error) {
    console.error('Error creating cart:', error)
    return res.status(500).json({ error: 'Failed to create cart' })
  }
})

// Get cart with orders for an account
cartRouter.get('/cart/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params
    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')

    const cart = await prisma.cart.findFirst({
      where: {
        accountId,
        status: 'ACTIVE',
      },
      include: {
        orders: {
          where: {
            status: 'CREATED',
          },
          include: {
            orderListings: {
              include: {
                listing: {
                  include: {
                    entity: {
                      include: {
                        content: true,
                      },
                    },
                  },
                },
              },
            },
            seller: {
              include: {
                account: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' })
    }

    return res.status(200).json(cart)
  } catch (error) {
    console.error('Error fetching cart:', error)
    return res.status(500).json({ error: 'Failed to fetch cart' })
  }
})

// Add order to cart
cartRouter.post('/cart/:cartId/orders', async (req: Request, res: Response) => {
  try {
    const { cartId } = req.params
    const { listingId, customerId, sellerId, quantity = 1 } = req.body

    if (!listingId || !customerId || !sellerId) {
      return res.status(400).json({ error: 'listingId, customerId, and sellerId are required' })
    }
    const cart = await prisma.cart.findUnique({ where: { id: cartId } })
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' })
    }
    await validateAccount(req.user as AuthenticatedUser, cart.accountId, 'authenticated')

    // Get listing details
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        entity: true,
      },
    })

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    if (listing.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient quantity available' })
    }

    // Create order with CREATED status (not yet purchased)
    const order = await prisma.order.create({
      data: {
        status: 'CREATED',
        customerId,
        sellerId,
        cartId,
        subTotal: listing.price,
        orderListings: {
          create: {
            listingId,
            quantity,
            price: listing.price,
          },
        },
      },
      include: {
        orderListings: {
          include: {
            listing: {
              include: {
                entity: {
                  include: {
                    content: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return res.status(201).json(order)
  } catch (error) {
    console.error('Error adding order to cart:', error)
    return res.status(500).json({ error: 'Failed to add order to cart' })
  }
})

// Remove order from cart
cartRouter.delete('/cart/:cartId/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { cartId, orderId } = req.params
    const cart = await prisma.cart.findUnique({ where: { id: cartId } })
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' })
    }
    await validateAccount(req.user as AuthenticatedUser, cart.accountId, 'authenticated')

    // Verify order belongs to cart and is in CREATED status
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        cartId,
        status: 'CREATED',
      },
    })

    if (!order) {
      return res.status(404).json({ error: 'Order not found in cart' })
    }

    // Delete the order
    await prisma.order.delete({
      where: { id: orderId },
    })

    return res.status(200).json({ message: 'Order removed from cart' })
  } catch (error) {
    console.error('Error removing order from cart:', error)
    return res.status(500).json({ error: 'Failed to remove order from cart' })
  }
})

// Checkout - create invoice and process payment
cartRouter.put('/cart/:cartId/checkout', async (req: Request, res: Response) => {
  try {
    const { cartId } = req.params

    // Get all orders in cart
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        orders: {
          where: {
            status: 'CREATED',
          },
        },
      },
    })

    if (!cart || cart.orders.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' })
    }
    await validateAccount(req.user as AuthenticatedUser, cart.accountId, 'authenticated')

    const orderIds = cart.orders.map(order => order.id)

    // Create invoice and process payment
    const invoice = await createInvoiceWithTransactions(orderIds)

    return res.status(200).json({ invoice, message: 'Checkout successful' })
  } catch (error) {
    console.error('Error during checkout:', error)
    return res.status(500).json({ error: 'Failed to checkout' })
  }
})

