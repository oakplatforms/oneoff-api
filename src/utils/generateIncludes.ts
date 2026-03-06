import { ParsedQs } from 'qs'

export const generateIncludes = (
  include?: ParsedQs | ParsedQs[] | string | string[] | null
) => {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Record<string, any> = {}

  const addDeepNestedInclude = (path: string[]) => {
    let current = items

    for (let i = 0; i < path.length; i++) {
      const key = path[i]

      if (!current[key] || current[key] === true) {
        current[key] = {}
      }

      if (i < path.length - 1) {
        if (!current[key].include) {
          current[key].include = {}
        }
        current = current[key].include
      } else if (!Object.keys(current[key]).length) {
        current[key] = true
      }
    }
  }

  if (include) {
    const includes = Array.isArray(include) ? include : [include]

    includes.forEach((key) => {
      if (typeof key === 'string') {
        const path = key.split('.')
        if (path.length > 1) {
          addDeepNestedInclude(path)
        } else if (!items[key]) {
          items[key] = true
        }
      }
    })
  }

  return items
}
