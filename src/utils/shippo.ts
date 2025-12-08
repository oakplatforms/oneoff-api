import { Shippo } from 'shippo'
import axios from 'axios'
import { ShippingCarrierType, ShippingParcelType } from '@prisma/client'

const SHIPPO_SECRET_KEY = process.env.SHIPPO_SECRET_KEY

export type ShippoRate = {
  object_id: string
  shipment: string
  amount: string
  currency: string
  servicelevel: {
    token: string
    name: string
    extendedToken?: string
  }
  estimated_days?: number
  duration_terms?: string
  test?: boolean
  provider: string
  messages?: { source: string; code: string; text: string }[]
}

if (!SHIPPO_SECRET_KEY) {
  throw new Error('Missing SHIPPO_SECRET_KEY in environment variables.')
}

export const carrierAccounts: Record<ShippingCarrierType, string> = {
  USPS: process.env.SHIPPO_CARRIER_ACCOUNT_USPS!,
  UPS: process.env.SHIPPO_CARRIER_ACCOUNT_UPS!,
  FEDEX: process.env.SHIPPO_CARRIER_ACCOUNT_FEDEX!,
  DHL: process.env.SHIPPO_CARRIER_ACCOUNT_DHL!,
}

/**
 * Parcel types that are valid Shippo templates (can use template property)
 * Non-template types (like USPS_GroundAdvantage) require dimensions instead
 */
export const validShippoTemplateTypes: ShippingParcelType[] = [
  'USPS_FlatRateEnvelope',
  'USPS_SoftPack',
  'UPS_Box_10kg',
  'UPS_Box_25kg',
  'UPS_Pad_Pak',
  'FedEx_Envelope',
  'FedEx_Padded_Pak',
  'FedEx_Box_10kg',
  'FedEx_Box_25kg',
]

const shippo = new Shippo({ apiKeyHeader: SHIPPO_SECRET_KEY })

export default shippo

export async function fetchRateById(rateId: string): Promise<ShippoRate> {
  const response = await axios.get(`https://api.goshippo.com/rates/${rateId}/`, {
    headers: {
      Authorization: `ShippoToken ${SHIPPO_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  return response.data as ShippoRate
}