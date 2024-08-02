import { Brand } from './brand'
import { Category } from './category'
import { Collection } from './collection'
import { Product } from './product'
import { Card } from './card'

export class BrandCategory {
	id: string

	createdAt: Date

	updatedAt: Date

	brand: Brand

	brandName: string

	category: Category

	categoryName: string

	collections: Collection[]

	products: Product[]

	cards: Card[]
}
