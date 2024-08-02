import { User as _User } from './user'
import { Account as _Account } from './account'
import { Marketplace as _Marketplace } from './marketplace'
import { Brand as _Brand } from './brand'
import { Theme as _Theme } from './theme'
import { Category as _Category } from './category'
import { Tag as _Tag } from './tag'
import { SupportedTagValues as _SupportedTagValues } from './supported_tag_values'
import { ProductTag as _ProductTag } from './product_tag'
import { BrandCategory as _BrandCategory } from './brand_category'
import { Collection as _Collection } from './collection'
import { Product as _Product } from './product'
import { Card as _Card } from './card'

export namespace PrismaModel {
	export class User extends _User {}
	export class Account extends _Account {}
	export class Marketplace extends _Marketplace {}
	export class Brand extends _Brand {}
	export class Theme extends _Theme {}
	export class Category extends _Category {}
	export class Tag extends _Tag {}
	export class SupportedTagValues extends _SupportedTagValues {}
	export class ProductTag extends _ProductTag {}
	export class BrandCategory extends _BrandCategory {}
	export class Collection extends _Collection {}
	export class Product extends _Product {}
	export class Card extends _Card {}

	export const extraModels = [
		User,
		Account,
		Marketplace,
		Brand,
		Theme,
		Category,
		Tag,
		SupportedTagValues,
		ProductTag,
		BrandCategory,
		Collection,
		Product,
		Card,
	]
}
