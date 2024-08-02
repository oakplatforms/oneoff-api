import { Marketplace } from './marketplace'
import { BrandCategory } from './brand_category'

export class Category {
	id: string

	createdAt: Date

	updatedAt: Date

	name: string

	displayName?: string

	marketplace?: Marketplace

	marketplaceName?: string

	brandCategories: BrandCategory[]
}
