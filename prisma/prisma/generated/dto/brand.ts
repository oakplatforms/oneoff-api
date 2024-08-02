import { Marketplace } from './marketplace'
import { Theme } from './theme'
import { BrandCategory } from './brand_category'

export class Brand {
	id: string

	createdAt: Date

	updatedAt: Date

	name: string

	displayName?: string

	marketplace?: Marketplace

	marketplaceName?: string

	theme?: Theme

	brandCategories: BrandCategory[]
}
