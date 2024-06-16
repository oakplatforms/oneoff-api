import { ParsedQs } from 'qs'

export const generateIncludes = (include?: ParsedQs | ParsedQs[] | string | string[] | null ) => {
  const includeQuery = include && JSON.parse(include as string)
  const items = {}

  if (includeQuery && Array.isArray(includeQuery)) {
    includeQuery.forEach((key: string) => {
      items[key as keyof typeof items] = true as never
    })
  }
  return items
}
