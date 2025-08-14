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

export const validateUsernameUniqueness = async (username: string, excludeProfileId?: string) => {
  const whereClause = excludeProfileId
    ? { username, id: { not: excludeProfileId } }
    : { username }

  const existingProfileWithUsername = await prisma.profile.findFirst({
    where: whereClause
  })

  if (existingProfileWithUsername) {
    throw new Error('Username is already taken')
  }
}
