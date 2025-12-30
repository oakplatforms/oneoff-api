import { Prisma } from '@prisma/client'

// Valid characters for ticker: A-Z (minus I, L, O) and numbers 2-9
const VALID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const TICKER_LENGTH = 6
const MAX_RETRIES = 5

/**
 * Generates a random 6-character ticker with a specific prefix
 * Characters: A-Z (minus I/L/O) and 2-9
 * @param prefix - Single character prefix (B, P, S, C, F)
 * @returns 6-character ticker string
 */
function generateRandomTicker(prefix: string): string {
  if (prefix.length !== 1 || !VALID_CHARS.includes(prefix.toUpperCase())) {
    throw new Error(`Invalid prefix: ${prefix}. Must be a single character from valid characters.`)
  }

  let ticker = prefix.toUpperCase()
  
  // Generate remaining 5 characters
  for (let i = 1; i < TICKER_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * VALID_CHARS.length)
    ticker += VALID_CHARS[randomIndex]
  }
  
  return ticker
}

/**
 * Validates ticker format
 * @param ticker - Ticker string to validate
 * @returns true if valid, false otherwise
 */
export function validateTickerFormat(ticker: string): boolean {
  if (ticker.length !== TICKER_LENGTH) {
    return false
  }
  
  // Check all characters are valid
  for (const char of ticker) {
    if (!VALID_CHARS.includes(char.toUpperCase())) {
      return false
    }
  }
  
  return true
}

/**
 * Validates ticker prefix matches expected prefix
 * @param ticker - Ticker string to validate
 * @param expectedPrefix - Expected prefix character
 * @returns true if prefix matches, false otherwise
 */
export function validateTickerPrefix(ticker: string, expectedPrefix: string): boolean {
  if (ticker.length === 0 || expectedPrefix.length !== 1) {
    return false
  }
  
  return ticker[0].toUpperCase() === expectedPrefix.toUpperCase()
}

interface TickerGenerationOptions {
  prefix: string
  createFn: (ticker: string) => Promise<any>
}

/**
 * Generates a unique ticker and creates the record with retry logic
 * Automatically retries on uniqueness constraint violations (Prisma P2002)
 * 
 * @param options - Options for ticker generation
 * @param options.prefix - Single character prefix (B, P, S, C, F)
 * @param options.createFn - Async function that creates the record with the ticker
 * @returns The created record
 * @throws Error if all retries are exhausted or other errors occur
 */
export async function generateTickerWithRetry<T>(
  options: TickerGenerationOptions
): Promise<T> {
  const { prefix, createFn } = options
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const ticker = generateRandomTicker(prefix)
      console.log(`[TickerGenerator] Attempt ${attempt + 1}/${MAX_RETRIES}: Generated ticker ${ticker}`)
      
      const result = await createFn(ticker)
      console.log(`[TickerGenerator] Successfully created record with ticker ${ticker}`)
      return result
      
    } catch (error) {
      // Check if it's a Prisma unique constraint violation on ticker
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const meta = error.meta as { target?: string[] }
        
        if (meta?.target?.includes('ticker')) {
          console.log(`[TickerGenerator] Ticker collision detected on attempt ${attempt + 1}/${MAX_RETRIES}`)
          
          // If this is the last attempt, throw an error
          if (attempt === MAX_RETRIES - 1) {
            console.error(`[TickerGenerator] All ${MAX_RETRIES} attempts exhausted. Could not generate unique ticker.`)
            throw new Error('Failed to generate unique ticker after multiple attempts. Please try again.')
          }
          
          // Otherwise, continue to next retry
          continue
        }
      }
      
      // If it's not a ticker uniqueness error, rethrow immediately
      throw error
    }
  }
  
  // This should never be reached due to the throw in the last attempt
  throw new Error('Failed to generate unique ticker after multiple attempts.')
}

