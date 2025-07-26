import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider'
import { getPrismaClient } from './prismaHelpers'

const prisma = getPrismaClient()
const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' })

export const promoteUserToSeller = async (authId: string, accountId: string, sellerId: string) => {
  try {
    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        GroupName: 'seller',
        Username: authId,
        UserPoolId: process.env.CONSUMER_USER_POOL_ID!,
      })
    )

    await prisma.account.update({
      where: { id: accountId },
      data: { type: 'SELLER' }
    })

    console.log('Successfully promoted user to seller role:', authId)
    return { success: true, accountId, sellerId }
  } catch (error) {
    console.error('Failed to promote user to seller:', error)
    throw new Error('Failed to promote user to seller role')
  }
}
