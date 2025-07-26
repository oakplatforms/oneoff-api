import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider'
import { getPrismaClient } from './prismaHelpers'

const prisma = getPrismaClient()
const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' })

export const promoteUserToCustomer = async (authId: string, accountId: string, customerId: string) => {
  try {
    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        GroupName: 'customer',
        Username: authId,
        UserPoolId: process.env.CONSUMER_USER_POOL_ID!,
      })
    )

    await prisma.account.update({
      where: { id: accountId },
      data: { type: 'CUSTOMER' }
    })

    console.log('Successfully promoted user to customer role:', authId)
    return { success: true, accountId, customerId }
  } catch (error) {
    console.error('Failed to promote user to customer:', error)
    throw new Error('Failed to promote user to customer role')
  }
}
