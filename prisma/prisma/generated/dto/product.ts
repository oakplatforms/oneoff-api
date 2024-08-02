import { BrandCategory } from './brand_category'
import { Collection } from './collection'
import { ProductTag } from './product_tag'
import { Card } from './card'
import { ProductType } from '@prisma/client'

export class Product {
	id: string

	createdAt: Date

	updatedAt: Date

	displayName?: string

	name?: string

	description?: string

	type: ProductType

	image?: string

	price?: string

	releaseDate?: Date

	brandCategory: BrandCategory

	brandCategoryId: string

	collection?: Collection

	collectionId?: string

	productTags: ProductTag[]

	card?: Card
}
