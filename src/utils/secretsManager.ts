import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

export interface OneoffSecrets {
  //Database credentials
  username: string
  password: string
  host: string
  port: number
  //Application secrets
  stripeSecretKey: string
  stripeWebhookSecret: string
  tempJwtSecret: string
}

interface CachedSecret {
  secret: OneoffSecrets
  fetchedAt: number
}

let cachedSecret: CachedSecret | null = null

//Cache TTL of 30 minutes - ensures credentials refresh before rotation completes
//This is important for Provisioned Concurrency instances that stay warm
const CACHE_TTL_MS = 30 * 60 * 1000

/**
 * Fetches all secrets from AWS Secrets Manager with caching
 */
export async function getSecrets(): Promise<OneoffSecrets> {
  const now = Date.now()

  //Return cached if still valid
  if (cachedSecret && (now - cachedSecret.fetchedAt) < CACHE_TTL_MS) {
    console.log('[SecretsManager] Using cached secrets')
    return cachedSecret.secret
  }

  const client = new SecretsManagerClient({ region: 'us-east-1' })
  const secretName = `oneoff-credentials-${process.env.STAGE || 'dev'}`

  console.log(`[SecretsManager] Fetching secret: ${secretName}`)

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  )

  if (!response.SecretString) {
    throw new Error(`Secret ${secretName} has no SecretString`)
  }

  const secret = JSON.parse(response.SecretString) as OneoffSecrets

  console.log(`[SecretsManager] Successfully fetched secrets for host: ${secret.host}`)

  cachedSecret = {
    secret,
    fetchedAt: now
  }

  return secret
}

export type DatabaseSecret = Pick<OneoffSecrets, 'username' | 'password' | 'host' | 'port'>

export async function getDatabaseCredentials(): Promise<DatabaseSecret> {
  const secrets = await getSecrets()
  return {
    username: secrets.username,
    password: secrets.password,
    host: secrets.host,
    port: secrets.port
  }
}

export function buildDatabaseUrl(secret: DatabaseSecret): string {
  const { username, password, host, port } = secret
  return `postgresql://${username}:${encodeURIComponent(password)}@${host}:${port}/postgres?sslmode=require`
}

//Clear the cache - useful for retry logic on auth failures
export function clearSecretsCache(): void {
  cachedSecret = null
}
