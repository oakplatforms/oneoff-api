import * as fs from 'fs'
import * as path from 'path'

const JSON_SCHEMA_PATH = path.resolve(__dirname, '../../../src/generated/json/json-schema.json')
const OPENAPI_OUTPUT_PATH = path.resolve(__dirname, '../generated/openapi.json')

const jsonSchema = JSON.parse(fs.readFileSync(JSON_SCHEMA_PATH, 'utf-8'))

// Convert JSON Schema $ref paths from #/definitions/X to #/components/schemas/X
function resolveRefs(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(resolveRefs)

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string') {
      result[key] = value.replace('#/definitions/', '#/components/schemas/')
    } else {
      result[key] = resolveRefs(value)
    }
  }
  return result
}

const schemas: Record<string, any> = {}
for (const [name, definition] of Object.entries(jsonSchema.definitions || {})) {
  schemas[name] = resolveRefs(definition)
}

const openApiDoc = {
  openapi: '3.0.3',
  info: { title: 'Oneoff API', version: '1.0.0' },
  paths: {},
  components: { schemas },
}

fs.mkdirSync(path.dirname(OPENAPI_OUTPUT_PATH), { recursive: true })
fs.writeFileSync(OPENAPI_OUTPUT_PATH, JSON.stringify(openApiDoc, null, 2))
console.log(`OpenAPI document written to ${OPENAPI_OUTPUT_PATH}`)
