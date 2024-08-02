import { Theme } from './theme'
import { Brand } from './brand'
import { Category } from './category'
import { Tag } from './tag'

export class Marketplace {
	id: string

	createdAt: Date

	updatedAt: Date

	name: string

	displayName?: string

	theme?: Theme

	brands: Brand[]

	categories: Category[]

	tags: Tag[]
}
