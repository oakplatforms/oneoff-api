import { AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider'
import cognitoClient from './cognitoClient'

export const promoteUserToCustomer = async (authId: string) => {
  try {
    const userPoolId = process.env.CONSUMER_USER_POOL_ID
    console.log('USER POOL ID:', userPoolId, authId)

    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        GroupName: 'customer',
        Username: authId,
        UserPoolId: userPoolId,
      })
    )

    return { success: true }
  } catch (error) {
    console.error('Failed to promote user to customer:', error)
    throw new Error('Failed to promote user to customer role')
  }
}
