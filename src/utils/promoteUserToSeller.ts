import { AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider'
import cognitoClient from './cognitoClient'

export const promoteUserToSeller = async (authId: string) => {
  try {
    const userPoolId = process.env.CONSUMER_USER_POOL_ID
    console.log('USER POOL ID:', userPoolId)

    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        GroupName: 'seller',
        Username: authId,
        UserPoolId: userPoolId,
      })
    )

    return { success: true }
  } catch (error) {
    console.error('Failed to promote user to seller:', error)
    throw new Error('Failed to promote user to seller role')
  }
}
