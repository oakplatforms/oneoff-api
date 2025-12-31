import { Prisma } from '@prisma/client'

// Valid characters for referenceCode: Numbers 2-9 only (avoiding 0 and 1 for ambiguity)
const VALID_NUMBERS = '23456789'
// Valid type identifiers that can be inserted into the code
const VALID_TYPES = ['S', 'B', 'C'] // S=Listing, B=Bid, C=List
const REFERENCE_CODE_LENGTH = 6
const MAX_RETRIES = 5

/**
 * Generates a random 6-character reference code with a type identifier
 * Format: 5 random numbers (2-9) + 1 type letter (S/B/C) at random position
 * Examples: 32S392, 93984B, 437C52
 * @param typeIdentifier - Type identifier (S, B, or C)
 * @returns 6-character reference code string
 */
function generateRandomReferenceCode(typeIdentifier: string): string {
  if (typeIdentifier.length !== 1 || !VALID_TYPES.includes(typeIdentifier.toUpperCase())) {
    throw new Error(`Invalid type identifier: ${typeIdentifier}. Must be one of: ${VALID_TYPES.join(', ')}`)
  }

  const type = typeIdentifier.toUpperCase()
  
  // Generate 5 random numbers
  let numbers = ''
  for (let i = 0; i < REFERENCE_CODE_LENGTH - 1; i++) {
    const randomIndex = Math.floor(Math.random() * VALID_NUMBERS.length)
    numbers += VALID_NUMBERS[randomIndex]
  }
  
  // Insert type identifier at random position (0 to 5)
  const insertPosition = Math.floor(Math.random() * REFERENCE_CODE_LENGTH)
  const referenceCode = numbers.slice(0, insertPosition) + type + numbers.slice(insertPosition)
  
  return referenceCode
}

/**
 * Validates reference code format
 * Must be 6 characters, with exactly one type identifier (S/B/C) and 5 numbers (2-9)
 * @param referenceCode - Reference code string to validate
 * @returns true if valid, false otherwise
 */
export function validateReferenceCodeFormat(referenceCode: string): boolean {
  if (referenceCode.length !== REFERENCE_CODE_LENGTH) {
    return false
  }
  
  let typeIdentifierCount = 0
  let numberCount = 0
  
  for (const char of referenceCode.toUpperCase()) {
    if (VALID_TYPES.includes(char)) {
      typeIdentifierCount++
    } else if (VALID_NUMBERS.includes(char)) {
      numberCount++
    } else {
      // Invalid character found
      return false
    }
  }
  
  // Must have exactly 1 type identifier and 5 numbers
  return typeIdentifierCount === 1 && numberCount === 5
}

/**
 * Extracts the type identifier from a reference code
 * @param referenceCode - Reference code string
 * @returns Type identifier (S, B, or C) or null if not found
 */
export function extractTypeIdentifier(referenceCode: string): string | null {
  const upperCode = referenceCode.toUpperCase()
  
  for (const type of VALID_TYPES) {
    if (upperCode.includes(type)) {
      return type
    }
  }
  
  return null
}

/**
 * Validates reference code contains expected type identifier
 * @param referenceCode - Reference code string to validate
 * @param expectedType - Expected type identifier (S, B, or C)
 * @returns true if type matches, false otherwise
 */
export function validateReferenceCodeType(referenceCode: string, expectedType: string): boolean {
  const extractedType = extractTypeIdentifier(referenceCode)
  return extractedType !== null && extractedType === expectedType.toUpperCase()
}

interface ReferenceCodeGenerationOptions {
  typeIdentifier: string
  createFn: (referenceCode: string) => Promise<any>
}

/**
 * Generates a unique reference code and creates the record with retry logic
 * Automatically retries on uniqueness constraint violations (Prisma P2002)
 * 
 * @param options - Options for reference code generation
 * @param options.typeIdentifier - Type identifier (S, B, or C)
 * @param options.createFn - Async function that creates the record with the reference code
 * @returns The created record
 * @throws Error if all retries are exhausted or other errors occur
 */
export async function generateReferenceCodeWithRetry<T>(
  options: ReferenceCodeGenerationOptions
): Promise<T> {
  const { typeIdentifier, createFn } = options
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const referenceCode = generateRandomReferenceCode(typeIdentifier)
      console.log(`[ReferenceCodeGenerator] Attempt ${attempt + 1}/${MAX_RETRIES}: Generated code ${referenceCode}`)
      
      const result = await createFn(referenceCode)
      console.log(`[ReferenceCodeGenerator] Successfully created record with code ${referenceCode}`)
      return result
      
    } catch (error) {
      // Check if it's a Prisma unique constraint violation on referenceCode
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const meta = error.meta as { target?: string[] }
        
        if (meta?.target?.includes('referenceCode')) {
          console.log(`[ReferenceCodeGenerator] Code collision detected on attempt ${attempt + 1}/${MAX_RETRIES}`)
          
          // If this is the last attempt, throw an error
          if (attempt === MAX_RETRIES - 1) {
            console.error(`[ReferenceCodeGenerator] All ${MAX_RETRIES} attempts exhausted. Could not generate unique code.`)
            throw new Error('Failed to generate unique reference code after multiple attempts. Please try again.')
          }
          
          // Otherwise, continue to next retry
          continue
        }
      }
      
      // If it's not a referenceCode uniqueness error, rethrow immediately
      throw error
    }
  }
  
  // This should never be reached due to the throw in the last attempt
  throw new Error('Failed to generate unique reference code after multiple attempts.')
}

