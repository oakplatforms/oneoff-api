import { ParsedQs } from 'qs'

export const generateIncludes = (include?: ParsedQs | ParsedQs[] | string | string[] | null ) => {
  const items = {}

  if (include) {
    if (Array.isArray(include)) {
      include.forEach((key: ParsedQs | ParsedQs[] | string | string[] | null) => {
        if (typeof key === 'string' && key.includes('.')) {
          const parent = key.split('.')[0]
          const child = key.split('.')[1]
          const nestedInclude = {
            include: {
              [child]: true
            }
          }
          items[parent as keyof typeof items] = nestedInclude as never
        } else if (typeof key === 'string') {
          items[key as keyof typeof items] = true as never
        }
      })
    }
    if (typeof include === 'string' && include.includes('.')) {
      const parent = include.split('.')[0]
      const child = include.split('.')[1]
      const nestedInclude = {
        include: {
          [child]: true
        }
      }
      items[parent as keyof typeof items] = nestedInclude as never
    } else if (typeof include === 'string') {
      items[include as keyof typeof items] = true as never
    }
  }

  return items
}
