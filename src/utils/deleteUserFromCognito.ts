import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider'

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' })

export const deleteUserFromCognito = async (authId: string) => {
  try {
    const userPoolId = process.env.CONSUMER_USER_POOL_ID
    console.log('Deleting user from Cognito:', userPoolId, authId)

    await cognitoClient.send(
      new AdminDeleteUserCommand({
        Username: authId,
        UserPoolId: userPoolId,
      })
    )

    return { success: true }
  } catch (error) {
    console.error('Failed to delete user from Cognito:', error)
    throw new Error('Failed to delete user from Cognito')
  }
}
