import { ParsedQs } from 'qs'

export const generateIncludes = (
  include?: ParsedQs | ParsedQs[] | string | string[] | null
) => {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Record<string, any> = {}

  const addNestedInclude = (parent: string, child: string) => {
    if (!items[parent]) {
      items[parent] = { include: {} }
    }
    if (!items[parent].include) {
      items[parent].include = {}
    }
    items[parent].include[child] = true
  }

  if (include) {
    const includes = Array.isArray(include) ? include : [include]

    includes.forEach((key) => {
      if (typeof key === 'string' && key.includes('.')) {
        const [parent, child] = key.split('.')
        addNestedInclude(parent, child)
      } else if (typeof key === 'string') {
        items[key] = true
      }
    })
  }

  return items
}
