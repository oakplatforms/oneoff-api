import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export interface AuthenticatedUser {
  principalId: string
  role: string
  userPool: string
}

export const validateUser = async (reqUser: AuthenticatedUser, requiredRole: string) => {
  if (!reqUser) {
    throw new Error('User authentication required')
  }

  if (!reqUser.principalId) {
    throw new Error('User principalId is required')
  }

  const user = await prisma.user.findFirst({
    where: { authId: reqUser.principalId },
    include: {
      account: {
        include: {
          seller: true,
          customer: true,
        },
      },
      admin: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  if (reqUser.role !== requiredRole) {
    throw new Error(`User role '${reqUser.role}' does not match required role '${requiredRole}'`)
  }

  switch (requiredRole) {
  case 'admin':
    if (!user.isAdmin) {
      throw new Error('User is not an admin')
    }
    if (!user.admin) {
      throw new Error('Admin profile not found')
    }
    break
  case 'seller':
    if (!user.account || user.account.type !== 'SELLER') {
      throw new Error('User does not have a seller account')
    }
    if (!user.account.seller) {
      throw new Error('Seller profile not found')
    }
    break
  case 'customer':
    if (!user.account || user.account.type !== 'CUSTOMER') {
      throw new Error('User does not have a customer account')
    }
    if (!user.account.customer) {
      throw new Error('Customer profile not found')
    }
    break
  default:
    throw new Error(`Invalid required role: ${requiredRole}`)
  }

  return user
}
