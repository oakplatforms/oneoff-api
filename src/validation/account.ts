import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export interface AuthenticatedUser {
  principalId: string
  role: string
  userPool: string
}

export const validateAccount = async (reqUser: AuthenticatedUser, accountId: string, requiredRole: string) => {
  if (!reqUser) {
    throw new Error('User authentication required')
  }

  if (!reqUser.principalId) {
    throw new Error('User principalId is required')
  }

  if (!accountId) {
    throw new Error('AccountId is required')
  }

  //Fetch account and verify the principalId matches the account.user.authId
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
    throw new Error('User principalId does not match account user authId')
  }

  //Validate the role matches the required role
  if (reqUser.role !== requiredRole) {
    throw new Error(`User role '${reqUser.role}' does not match required role '${requiredRole}'`)
  }

  //Additional role-specific validations
  switch (requiredRole) {
  case 'admin':
    if (!account.user.isAdmin) {
      throw new Error('User is not an admin')
    }
    break
  case 'seller':
    if (account.type !== 'SELLER') {
      throw new Error('Account type must be SELLER')
    }
    if (!account.seller) {
      throw new Error('Seller profile not found')
    }
    break
  case 'customer':
    if (account.type !== 'CUSTOMER') {
      throw new Error('Account type must be CUSTOMER')
    }
    if (!account.customer) {
      throw new Error('Customer profile not found')
    }
    break
  default:
    throw new Error(`Invalid required role: ${requiredRole}`)
  }

  return account
}
