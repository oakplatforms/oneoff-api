import { Tag } from './tag'
import { Product } from './product'

export class ProductTag {
	id: string

	createdAt: Date

	updatedAt: Date

	tagValue: string

	tag: Tag

	tagName: string

	product: Product

	productId: string
}
