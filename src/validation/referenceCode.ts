/**
 * Validation utilities for reference codes
 * Reference codes are 6 characters: 5 numbers (2-9) + 1 type identifier (S/B/C) at any position
 * Examples: 32S392, 93984B, 437C52
 */

const VALID_NUMBERS = '23456789'
const VALID_TYPES = ['S', 'B', 'C'] // S=Listing, B=Bid, C=List
const REFERENCE_CODE_LENGTH = 6

/**
 * Validates reference code format
 * Must be exactly 6 characters with 5 numbers (2-9) and 1 type identifier (S/B/C)
 */
export function validateReferenceCodeFormat(referenceCode: string): void {
  if (!referenceCode || typeof referenceCode !== 'string') {
    throw new Error('Reference code must be a non-empty string')
  }

  if (referenceCode.length !== REFERENCE_CODE_LENGTH) {
    throw new Error(`Reference code must be exactly ${REFERENCE_CODE_LENGTH} characters`)
  }

  const upperCode = referenceCode.toUpperCase()
  let typeIdentifierCount = 0
  let numberCount = 0

  for (const char of upperCode) {
    if (VALID_TYPES.includes(char)) {
      typeIdentifierCount++
    } else if (VALID_NUMBERS.includes(char)) {
      numberCount++
    } else {
      throw new Error(
        `Invalid character '${char}' in reference code. Must contain only numbers 2-9 and one type identifier (S/B/C)`
      )
    }
  }

  if (typeIdentifierCount !== 1) {
    throw new Error('Reference code must contain exactly one type identifier (S, B, or C)')
  }

  if (numberCount !== 5) {
    throw new Error('Reference code must contain exactly 5 numbers (2-9)')
  }
}

/**
 * Extracts the type identifier from a reference code
 * @returns Type identifier (S, B, or C)
 * @throws Error if no type identifier found
 */
export function extractTypeIdentifier(referenceCode: string): string {
  if (!referenceCode || typeof referenceCode !== 'string') {
    throw new Error('Reference code must be a non-empty string')
  }

  const upperCode = referenceCode.toUpperCase()

  for (const type of VALID_TYPES) {
    if (upperCode.includes(type)) {
      return type
    }
  }

  throw new Error('No valid type identifier (S, B, or C) found in reference code')
}

/**
 * Validates reference code contains expected type identifier
 * @param referenceCode - Reference code to validate
 * @param expectedType - Expected type (S, B, or C)
 */
export function validateReferenceCodeType(referenceCode: string, expectedType: string): void {
  if (!expectedType || expectedType.length !== 1) {
    throw new Error('Expected type must be a single character (S, B, or C)')
  }

  const expected = expectedType.toUpperCase()
  if (!VALID_TYPES.includes(expected)) {
    throw new Error(`Invalid expected type '${expected}'. Must be one of: ${VALID_TYPES.join(', ')}`)
  }

  const actualType = extractTypeIdentifier(referenceCode)

  if (actualType !== expected) {
    throw new Error(
      `Invalid reference code type. Expected '${expected}' but found '${actualType}'`
    )
  }
}

