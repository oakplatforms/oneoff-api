import { BrandCategory } from './brand_category'
import { Product } from './product'
import { CollectionType } from '@prisma/client'

export class Collection {
	id: string

	createdAt: Date

	updatedAt: Date

	displayName?: string

	name?: string

	description?: string

	type: CollectionType

	brandCategory: BrandCategory

	brandCategoryId: string

	products: Product[]
}
