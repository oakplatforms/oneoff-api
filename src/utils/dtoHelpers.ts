type JSONSchema = Record<string, any>;

export const replaceDTORefs = (obj: JSONSchema): JSONSchema => {
  function traverse(value: any): any {
    if (typeof value === 'string') {
      return value.replace(/#\/definitions\//g, '#/components/schemas/');
    } else if (Array.isArray(value)) {
      return value.map(traverse);
    } else if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, val]) => [key, traverse(val)])
      );
    }
    return value
  }

  return traverse(obj)
}

export const alphaSortDTO = (obj: Record<string, any>): Record<string, any> => {
  const sortedObj: Record<string, any> = {}
  const sortedKeys = Object.keys(obj).sort((a, b) => a.localeCompare(b))

  sortedKeys.forEach(key => {
    if (key === 'definitions' || key === 'properties') {
      sortedObj[key] = alphaSortDTO(obj[key])
    } else {
      sortedObj[key] = obj[key]
    }
  })

  return sortedObj
}
