import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export type OrderDetails = {
  listingIds?: string[],
  bidIds?: string[],
  createdById: string,
  purchasedById: string,
  soldById: string,
}

export const createInvoiceBasedOnBidsInOrderSummary = async (orderSummary: OrderDetails[]) => {
  return prisma.$transaction(async (prisma) => {
    // Create empty invoice
    const invoice = await prisma.invoice.create({
      data: {},
    })

    for (const orderDetails of orderSummary) {
      const uniqueBidIds = orderDetails.bidIds
        ?.filter((id, index, self) => self.indexOf(id) === index)
        .map((id) => ({
          id,
          quantityInOrder: orderDetails.bidIds?.filter((bidId) => bidId === id).length || 0,
        })) || []

      const bidsInOrder = await prisma.bid.findMany({
        where: { id: { in: uniqueBidIds.map(({ id }) => id) } },
      })

      const bidsInOrderWithQuantity = uniqueBidIds.map(({ id: uniqueBidId, quantityInOrder }) => {
        const selectedBid = bidsInOrder.find((bidInOrder) => bidInOrder.id === uniqueBidId)
        return { ...selectedBid, quantityInOrder }
      })
      
      const subTotal = bidsInOrderWithQuantity?.reduce((total, bid) => {
        if (bid?.price && bid.quantityInOrder) {
          return total + (Number(bid.price) * bid.quantityInOrder)
        } else {
          throw new Error(`Order failed: Issue with calculating subtotal`);
        }
      }, 0) || 0

       await prisma.order.create({
        data: {
          subTotal,
          total: subTotal,
          status: 'PENDING',
          invoiceId: invoice.id,
          createdById: orderDetails.createdById as string,
          purchasedById: orderDetails.purchasedById as string,
          soldById: orderDetails.soldById as string,
          orderBids: uniqueBidIds?.length
            ? {
                create: uniqueBidIds.map(({ id }) => ({
                  bidId: id as string,
                })),
              }
            : undefined,
          transactions: {
            create: [{
              amount: subTotal,
              status: 'PENDING'
            }],
          },
        },
      })

      for (const { id, multiTransactionsEnabled, quantity: bidQuantity, quantityInOrder } of bidsInOrderWithQuantity) {
        const remainingQuantity = bidQuantity && (bidQuantity - quantityInOrder);
        if (remainingQuantity !== undefined) {
          if (remainingQuantity < 0) {
            throw new Error(`Order failed: Insufficient quantity for bid ${id}.`);
          }
          if (!multiTransactionsEnabled && bidQuantity !== quantityInOrder) {
            throw new Error('Order failed: You must purchase all items for single seller bids.');
          }
          await prisma.bid.update({
            where: { id },
            data: {
              quantity: remainingQuantity,
              status: remainingQuantity === 0 ? 'INACTIVE' : 'ACTIVE',
            },
          })
        }
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

export const createInvoiceBasedOnListingsInOrderSummary = async (orderSummary: OrderDetails[]) => {
  return prisma.$transaction(async (prisma) => {
    // Create empty invoice
    const invoice = await prisma.invoice.create({
      data: {},
    })

    for (const orderDetails of orderSummary) {
      const uniqueListingIds = orderDetails.listingIds
        ?.filter((id, index, self) => self.indexOf(id) === index)
        .map((id) => ({
          id,
          quantityInOrder: orderDetails.listingIds?.filter((listingId) => listingId === id).length || 0,
        })) || []

      const listingsInOrder = await prisma.listing.findMany({
        where: { id: { in: uniqueListingIds.map(({ id }) => id) } },
      })

      const listingsInOrderWithQuantity = uniqueListingIds.map(({ id: uniqueListingId, quantityInOrder }) => {
        const selectedListing = listingsInOrder.find((listingInOrder) => listingInOrder.id === uniqueListingId)
        return { ...selectedListing, quantityInOrder }
      })
      
      const subTotal = listingsInOrderWithQuantity?.reduce((total, listing) => {
        if (listing?.price && listing.quantityInOrder) {
          return total + (Number(listing.price) * listing.quantityInOrder)
        } else {
          throw new Error(`Order failed: Issue with calculating subtotal`);
        }
      }, 0) || 0

      await prisma.order.create({
        data: {
          subTotal,
          total: subTotal,
          status: 'PENDING',
          invoiceId: invoice.id,
          createdById: orderDetails.createdById as string,
          purchasedById: orderDetails.purchasedById as string,
          soldById: orderDetails.soldById as string,
          orderListings: uniqueListingIds?.length
            ? {
                create: uniqueListingIds.map(({ id }) => ({
                  listingId: id as string,
                })),
              }
            : undefined,
          transactions: {
            create: [{ amount: subTotal, status: 'PENDING' }],
          },
        },
      });

      for (const { id, multiTransactionsEnabled, quantity: listingQuantity, quantityInOrder } of listingsInOrderWithQuantity) {
        const remainingQuantity = listingQuantity && (listingQuantity - quantityInOrder);
        if (remainingQuantity !== undefined) {
          if (remainingQuantity < 0) {
            throw new Error(`Order failed: Insufficient quantity for listing ${id}.`);
          }
          if (!multiTransactionsEnabled && listingQuantity !== quantityInOrder) {
            throw new Error('Order failed: You must purchase all items for single seller listings.');
          }
          await prisma.listing.update({
            where: { id },
            data: {
              quantity: remainingQuantity,
              status: remainingQuantity === 0 ? 'INACTIVE' : 'ACTIVE',
            },
          })
        }
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