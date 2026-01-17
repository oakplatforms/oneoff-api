import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export interface AuthenticatedUser {
  principalId: string
  role: string
  userPool: string
}

export const validateRole = (reqUser: AuthenticatedUser, requiredRole: string) => {
  if (!reqUser) {
    throw new Error('User authentication required')
  }

  if (reqUser.role !== requiredRole) {
    throw new Error(`User role '${reqUser.role}' does not match required role '${requiredRole}'`)
  }

  return true
}

export const validateAccount = async (reqUser: AuthenticatedUser, accountId?: string, requiredRole?: string) => {
  if (!reqUser) {
    throw new Error('User authentication required')
  }

  if (!reqUser.principalId) {
    throw new Error('User principalId is required')
  }

  if (!accountId) {
    throw new Error('AccountId is required')
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      user: true,
      seller: true,
      customer: true,
    },
  })

  if (!account) {
    throw new Error('Account not found')
  }

  if (!account.user) {
    throw new Error('Account does not have an associated user')
  }

  if (account.user.authId !== reqUser.principalId) {
    throw new Error('User cannot make this request')
  }

  //Additional role-specific validations
  switch (requiredRole) {
  case 'seller':
    if (account.type !== 'SELLER') {
      throw new Error('Account type must be seller')
    }
    if (!account.seller) {
      throw new Error('Seller profile not found')
    }
    break
  case 'customer':
    if (account.type !== 'CUSTOMER' && account.type !== 'SELLER') {
      throw new Error('Account type must be customer or seller')
    }
    if (account.type === 'CUSTOMER' && !account.customer) {
      throw new Error('Customer profile not found')
    }
    if (account.type === 'SELLER' && !account.customer) {
      throw new Error('Seller must have customer profile to access customer functionality')
    }
    break
  case 'registered':
    if (account.type !== 'REGISTERED') {
      throw new Error('Account type must be registered')
    }
    break
  case 'sellerOrRegistered':
    if (account.type !== 'SELLER' && account.type !== 'REGISTERED') {
      throw new Error('Account type must be seller or registered')
    }
    if (account.type === 'SELLER' && !account.seller) {
      throw new Error('Seller profile not found')
    }
    break
  case 'customerOrRegistered':
    if (account.type !== 'CUSTOMER' && account.type !== 'REGISTERED') {
      throw new Error('Account type must be customer or registered')
    }
    if (account.type === 'CUSTOMER' && !account.customer) {
      throw new Error('Customer profile not found')
    }
    break
  case 'customerOrSeller':
    if (account.type !== 'CUSTOMER' && account.type !== 'SELLER') {
      throw new Error('Account type must be customer or seller')
    }
    if (account.type === 'CUSTOMER' && !account.customer) {
      throw new Error('Customer profile not found')
    }
    if (account.type === 'SELLER' && !account.seller) {
      throw new Error('Seller profile not found')
    }
    break
  case 'authenticated':
    break
  default:
    throw new Error(`Invalid required account role: ${requiredRole}`)
  }

  return account
}

/**
 * Helper function to validate account access
 * @param reqUser - The authenticated user making the request
 * @param accountId - The account ID to validate against
 * @returns Promise that resolves if validation passes
 */
export const validateAccountOrAdmin = async (reqUser: AuthenticatedUser, accountId: string) => {
  if (accountId) {
    //Validate as authenticated account
    await validateAccount(reqUser, accountId, 'authenticated')
  } else {
    //If accountId is not provided, throw an error
    throw new Error('AccountId must be provided')
  }
}
