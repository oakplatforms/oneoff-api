import { User } from './user'

export class Account {
	id: string

	createdAt: Date

	updatedAt: Date

	name: string

	phone: string

	email: string

	firstName?: string

	lastName?: string

	address?: string

	city?: string

	state?: string

	zipCode?: string

	user: User

	userId: string
}
