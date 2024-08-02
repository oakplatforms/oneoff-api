import { Marketplace } from './marketplace'
import { ProductTag } from './product_tag'
import { SupportedTagValues } from './supported_tag_values'

export class Tag {
	id: string

	createdAt: Date

	updatedAt: Date

	name: string

	displayName?: string

	marketplace?: Marketplace

	marketplaceName?: string

	productTags: ProductTag[]

	supportedTagValues: SupportedTagValues[]
}
