import { Marketplace } from './marketplace'
import { Brand } from './brand'

export class Theme {
	id: string

	createdAt: Date

	updatedAt: Date

	logo?: string

	primaryColor?: string

	secondaryColor?: string

	marketplace: Marketplace

	marketplaceId: string

	brand: Brand

	brandId: string
}
