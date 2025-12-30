/**
 * Validates ticker format
 * Ticker must be exactly 6 characters
 * Valid characters: A-Z (minus I, L, O) and numbers 2-9
 */
export function validateTickerFormat(ticker: string): void {
  const VALID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const TICKER_LENGTH = 6

  if (!ticker || typeof ticker !== 'string') {
    throw new Error('Ticker must be a non-empty string')
  }

  if (ticker.length !== TICKER_LENGTH) {
    throw new Error(`Ticker must be exactly ${TICKER_LENGTH} characters`)
  }

  const upperTicker = ticker.toUpperCase()
  for (const char of upperTicker) {
    if (!VALID_CHARS.includes(char)) {
      throw new Error(
        `Invalid character '${char}' in ticker. Valid characters are A-Z (except I, L, O) and 2-9`
      )
    }
  }
}

/**
 * Validates ticker prefix matches expected prefix
 * @param ticker - Ticker string to validate
 * @param expectedPrefix - Expected prefix character (B, P, S, C, F)
 */
export function validateTickerPrefix(ticker: string, expectedPrefix: string): void {
  if (!ticker || ticker.length === 0) {
    throw new Error('Ticker is required')
  }

  if (!expectedPrefix || expectedPrefix.length !== 1) {
    throw new Error('Expected prefix must be a single character')
  }

  const actualPrefix = ticker[0].toUpperCase()
  const expected = expectedPrefix.toUpperCase()

  if (actualPrefix !== expected) {
    throw new Error(
      `Invalid ticker prefix. Expected '${expected}' but got '${actualPrefix}'`
    )
  }
}

