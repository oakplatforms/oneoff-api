import { calculateWalletBalance } from '../services/payout'

export const validatePayoutAmount = async (accountId: string, sellerId: string, amount: number) => {
  const wallet = await calculateWalletBalance(accountId, sellerId)

  if (amount <= 0) {
    throw new Error('Amount must be greater than zero')
  }
  if (!wallet.availableToWithdraw) {
    throw new Error('No available amount to withdraw')
  }
  if (wallet.availableToWithdraw < amount) {
    throw new Error('Cannot withdraw more than the available amount')
  }
}