import { Account } from './account'

export class User {
	id: string

	createdAt: Date

	updatedAt: Date

	cognitoId: string

	account?: Account
}
