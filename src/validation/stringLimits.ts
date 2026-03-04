export const STRING_LIMITS = {
  // person name fields
  firstName: 50,
  lastName: 50,
  phone: 20,
  address: 200,
  city: 100,
  state: 50,
  zipCode: 20,

  // business/profile
  businessName: 100,
  username: 30,

  // short text
  name: 200,
  displayName: 200,
  tagValue: 100,
  caption: 200,
  imageCaption: 200,

  // medium text
  description: 500,

  // entity-specific (longer)
  entityDescription: 1000,
  resolution: 1000,

  // post content
  header: 200,
  subheader: 300,
  body: 50000,

  // payout
  last4: 4,
} as const

export const validateStringLength = (
  value: unknown,
  fieldName: string,
  maxLength: number
) => {
  if (value === undefined || value === null) return
  if (typeof value !== 'string') return
  if (value.length > maxLength) {
    throw new Error(
      `${fieldName} must be ${maxLength} characters or fewer`
    )
  }
}

export const validateStringFields = (
  fields: Record<string, { value: unknown, maxLength: number }>
) => {
  for (const [fieldName, { value, maxLength }] of Object.entries(fields)) {
    validateStringLength(value, fieldName, maxLength)
  }
}
