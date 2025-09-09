import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'

const cognitoClient = new CognitoIdentityProviderClient({
  region: 'us-east-1',
})

export default cognitoClient
