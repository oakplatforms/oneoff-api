import { Bid, Listing, Prisma } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export type OrderInCart = {
  listings?: Listing[],
  bids?: Bid[],
  createdById: string,
  purchasedById: string,
  soldById: string,
}

export const createInvoiceBasedOnListingsInCart = async (ordersInCart: OrderInCart[]) => {
  return prisma.$transaction(async (prisma) => {
    // Create empty invoice
    const invoice = await prisma.invoice.create({
      data: {},
    })

    for (const orderInCart of ordersInCart) {
      const subTotal = orderInCart.listings?.reduce((total, listing) => {
        return total + (Number(listing.price) || 0)
      }, 0) || 0

      const uniqueListings = orderInCart.listings
        ?.map((listing) => listing.id)
        .filter((id, index, self) => self.indexOf(id) === index)
        .map((id) => ({
          id,
          quantityToUse: orderInCart.listings?.filter((listing) => listing.id === id).length || 0,
        })) || []

       await prisma.order.create({
        data: {
          subTotal,
          total: subTotal,
          status: 'PENDING',
          invoiceId: invoice.id,
          createdById: orderInCart.createdById as string,
          purchasedById: orderInCart.purchasedById as string,
          soldById: orderInCart.soldById as string,
          orderListings: uniqueListings?.length
            ? {
                create: uniqueListings.map(({ id }) => ({
                  listingId: id as string,
                })),
              }
            : undefined,
          transactions: {
            create: [{ amount: subTotal, status: 'PENDING' }],
          },
        },
      })

      // Update listing quantities
      for (const { id, quantityToUse } of uniqueListings) {
        await prisma.listing.update({
          where: { id },
          data: {
            quantity: { decrement: quantityToUse },
            status: quantityToUse > 0 ? 'ACTIVE' : 'INACTIVE',
          },
        })
      }
    }

    // Delete invoice if it is still empty
    await prisma.invoice.deleteMany({
      where: {
        id: invoice.id,
        orders: { none: {} },
      },
    })

    return invoice
  })
}

export const createInvoiceBasedOnResolvedListings = async (bid: Prisma.BidWhereInput, listings: Prisma.ListingWhereInput[]) => {
  return prisma.$transaction(async (prisma) => {
    let remainingQuantity = bid.quantity as number
    try {
      // create empty invoice
      const invoice = await prisma.invoice.create({
        data: {},
      })
  
      for (const listing of listings) {
        if (remainingQuantity === 0) break
        const quantityToUse = Math.min(remainingQuantity, listing.quantity as number)
        const subTotal = quantityToUse * (listing.price as number)
  
        if  (bid.profile?.accountId && listing.profile?.accountId) {
          if (listing.quantity as number <= remainingQuantity || listing.quantity! as number > remainingQuantity && listing.multiTransactionsEnabled) {
            try {
              await prisma.order.create({
                data: {
                  subTotal: subTotal,
                  total: subTotal,
                  status: 'PENDING',
                  invoiceId: invoice.id,
                  createdById: bid.profile.accountId as string,
                  purchasedById: bid.profile.accountId as string,
                  soldById: listing.profile?.accountId as string,
                  orderBids: bid.id ? {
                    create: [
                      { bidId: bid.id as string, }
                    ]
                  } : undefined,
                  orderListings: listing.id ? {
                    create: [
                      { listingId: listing.id as string, }
                    ]
                  } : undefined,
                  transactions: {
                    create: [{
                      amount: subTotal,
                      status: "PENDING",
                    }]
                  }
                },
              })
              await prisma.listing.update({
                where: { id: listing.id as string },
                data: {
                  quantity: listing.quantity as number - quantityToUse,
                  status: (listing.quantity as number - quantityToUse) > 0 ? 'ACTIVE' : 'INACTIVE',
                }
              })
            } catch (error) {
              throw error
            }
            remainingQuantity -= quantityToUse
          }
        }
      }
  
      if (bid.quantity !== remainingQuantity) {
        try {
          await prisma.bid.update({
            where: { id: bid.id as string },
            data: {
              quantity: remainingQuantity,
              status: remainingQuantity > 0 ? 'ACTIVE' : 'INACTIVE',
            }
          })
        } catch (error) {
          throw error
        }
      }
      // delete invoice if it is still empty
      await prisma.invoice.deleteMany({
        where: {
          id: invoice.id,
          orders: { none: {} }
        }
      })
    } catch (error) {
      throw error
    }
  })
}

export const createInvoiceBasedOnResolvedBids = async (listing: Prisma.ListingWhereInput, bids: Prisma.BidWhereInput[]) => {
  return prisma.$transaction(async (prisma) => {
    let remainingQuantity = listing.quantity as number
    try {
      // create empty invoice
      const invoice = await prisma.invoice.create({
        data: {},
      })
      for (const bid of bids) {
        if (remainingQuantity === 0) break
        const quantityToUse = Math.min(remainingQuantity, bid.quantity as number)
        const subTotal = quantityToUse * (listing.price as number)
  
        if  (bid.profile?.accountId && listing.profile?.accountId) {
          if (bid.quantity as number <= remainingQuantity || bid.quantity! as number > remainingQuantity && bid.multiTransactionsEnabled) {
            try {
              await prisma.order.create({
                data: {
                  subTotal: subTotal,
                  total: subTotal,
                  status: 'PENDING',
                  invoiceId: invoice.id,
                  createdById: listing.profile.accountId as string,
                  purchasedById: bid.profile.accountId as string,
                  soldById: listing.profile?.accountId as string,
                  orderBids: bid.id ? {
                    create: [
                      { bidId: bid.id as string, }
                    ]
                  } : undefined,
                  orderListings: listing.id ? {
                    create: [
                      { listingId: listing.id as string, }
                    ]
                  } : undefined,
                  transactions: {
                    create: [{
                      amount: subTotal,
                      status: "PENDING",
                    }]
                  }
                },
              })
              await prisma.bid.update({
                where: { id: bid.id as string },
                data: {
                  quantity: bid.quantity as number - quantityToUse,
                  status: (bid.quantity as number - quantityToUse) > 0 ? 'ACTIVE' : 'INACTIVE',
                }
              })
            } catch (error) {
              throw error
            }
            remainingQuantity -= quantityToUse
          }
        }
      }
  
      if (listing.quantity !== remainingQuantity) {
        try {
          await prisma.listing.update({
            where: { id: listing.id as string },
            data: {
              quantity: remainingQuantity,
              status: remainingQuantity > 0 ? 'ACTIVE' : 'INACTIVE',
            }
          })
        } catch (error) {
          throw error
        }
      }
      // delete invoice if it is still empty
      await prisma.invoice.deleteMany({
        where: {
          id: invoice.id,
          orders: { none: {} }
        }
      })
    } catch (error) {
      throw error
    }
  })
}