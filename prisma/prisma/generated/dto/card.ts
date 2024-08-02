import { BrandCategory } from './brand_category'
import { Product } from './product'

export class Card {
	id: string

	createdAt: Date

	updatedAt: Date

	number?: string

	shippingCategory?: string

	brandCategory: BrandCategory

	brandCategoryId: string

	product: Product

	productId: string
}
