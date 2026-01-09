/**
 * US State Sales Tax Rates (State-level only, excludes local taxes)
 * Rates are accurate as of 2024 and should be updated annually
 */
export const STATE_TAX_RATES: Record<string, number> = {
  'AL': 0.04,    // Alabama: 4%
  'AK': 0.00,    // Alaska: 0% (local taxes may apply)
  'AZ': 0.056,   // Arizona: 5.6%
  'AR': 0.065,   // Arkansas: 6.5%
  'CA': 0.0725,  // California: 7.25%
  'CO': 0.029,   // Colorado: 2.9%
  'CT': 0.0635,  // Connecticut: 6.35%
  'DC': 0.06,    // District of Columbia: 6%
  'DE': 0.00,    // Delaware: 0%
  'FL': 0.06,    // Florida: 6%
  'GA': 0.04,    // Georgia: 4%
  'HI': 0.04,    // Hawaii: 4%
  'ID': 0.06,    // Idaho: 6%
  'IL': 0.0625,  // Illinois: 6.25%
  'IN': 0.07,    // Indiana: 7%
  'IA': 0.06,    // Iowa: 6%
  'KS': 0.065,   // Kansas: 6.5%
  'KY': 0.06,    // Kentucky: 6%
  'LA': 0.0445,  // Louisiana: 4.45%
  'ME': 0.055,   // Maine: 5.5%
  'MD': 0.06,    // Maryland: 6%
  'MA': 0.0625,  // Massachusetts: 6.25%
  'MI': 0.06,    // Michigan: 6%
  'MN': 0.06875, // Minnesota: 6.875%
  'MS': 0.07,    // Mississippi: 7%
  'MO': 0.04225, // Missouri: 4.225%
  'MT': 0.00,    // Montana: 0%
  'NE': 0.055,   // Nebraska: 5.5%
  'NV': 0.0685,  // Nevada: 6.85%
  'NH': 0.00,    // New Hampshire: 0%
  'NJ': 0.06625, // New Jersey: 6.625%
  'NM': 0.05125, // New Mexico: 5.125%
  'NY': 0.04,    // New York: 4%
  'NC': 0.0475,  // North Carolina: 4.75%
  'ND': 0.05,    // North Dakota: 5%
  'OH': 0.0575,  // Ohio: 5.75%
  'OK': 0.045,   // Oklahoma: 4.5%
  'OR': 0.00,    // Oregon: 0%
  'PA': 0.06,    // Pennsylvania: 6%
  'RI': 0.07,    // Rhode Island: 7%
  'SC': 0.06,    // South Carolina: 6%
  'SD': 0.045,   // South Dakota: 4.5%
  'TN': 0.07,    // Tennessee: 7%
  'TX': 0.0625,  // Texas: 6.25%
  'UT': 0.0485,  // Utah: 4.85%
  'VT': 0.06,    // Vermont: 6%
  'VA': 0.053,   // Virginia: 5.3%
  'WA': 0.065,   // Washington: 6.5%
  'WV': 0.06,    // West Virginia: 6%
  'WI': 0.05,    // Wisconsin: 5%
  'WY': 0.04,    // Wyoming: 4%
}

/**
 * Get tax rate for a given state code
 * @param state Two-letter state code (e.g., 'CA', 'NY', 'DC')
 * @returns Tax rate as decimal (e.g., 0.0725 for 7.25%) or 0 if state not found
 */
export function getTaxRateForState(state: string): number {
  const normalizedState = state?.toUpperCase().trim()
  return STATE_TAX_RATES[normalizedState] ?? 0
}

