import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const validateExistingProfile = async (profileId: string) => {
  const existingProfile = await prisma.profile.findUnique({
    where: { id: profileId },
  })
  if (!existingProfile) {
    throw new Error('Profile does not exist')
  }
  return existingProfile
}

export const validateUsername = async (username: string, excludeProfileId?: string) => {
  const profiles = await prisma.profile.findMany({
    where: excludeProfileId ? { id: { not: excludeProfileId } } : {},
    select: { username: true }
  })

  const normalizedUsername = username.toLowerCase()
  const conflictingProfile = profiles.find(profile =>
    profile.username && profile.username.toLowerCase() === normalizedUsername
  )

  if (conflictingProfile) {
    throw new Error('Username is already taken')
  }
}
