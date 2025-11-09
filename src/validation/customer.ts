import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const validateCustomer = async (accountId?: string) => {
  if (!accountId) {
    throw new Error('createdById is required')
  }
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      customer: true,
    },
  })
  if (!account) {
    throw new Error('Account does not exist')
  }
  if (account.type !== 'CUSTOMER' && account.type !== 'SELLER') {
    throw new Error('Account type must be either CUSTOMER or SELLER')
  }
  if (!account.customer) {
    throw new Error('Account does not have an associated customer')
  }
  if (!account.customer.hasPaymentMethod) {
    throw new Error('The customer does not have an associated payment method')
  }
}

interface NewCustomerRequest {
  firstName?: string
  lastName?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

export const validateNewCustomer = (reqBody: NewCustomerRequest) => {
  const { firstName, lastName, address, city, state, zipCode } = reqBody

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    throw new Error('First name is required and must be a non-empty string')
  }

  if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
    throw new Error('Last name is required and must be a non-empty string')
  }

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    throw new Error('Address is required and must be a non-empty string')
  }

  if (!city || typeof city !== 'string' || city.trim().length === 0) {
    throw new Error('City is required and must be a non-empty string')
  }

  if (!state || typeof state !== 'string' || state.trim().length === 0) {
    throw new Error('State is required and must be a non-empty string')
  }

  if (!zipCode || typeof zipCode !== 'string' || zipCode.trim().length === 0) {
    throw new Error('Zip code is required and must be a non-empty string')
  }

  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    address: address.trim(),
    city: city.trim(),
    state: state.trim(),
    zipCode: zipCode.trim()
  }
}