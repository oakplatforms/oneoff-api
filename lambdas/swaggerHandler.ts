import express from 'express'
import swaggerJSDoc from 'swagger-jsdoc'
import dto from '../src/generated/json/json-schema.json'
import { replaceDTORefs, alphaSortDTO } from '../src/utils/dtoHelpers'
import serverless from '@vendia/serverless-express'

const app = express()

const processedDto = replaceDTORefs(dto)
const sortedDto = alphaSortDTO(processedDto)

//Debug: Check for any remaining unresolved references
const checkForUnresolvedRefs = (obj: Record<string, unknown>, path = ''): string[] => {
  const unresolved: string[] = []

  if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key

      if (key === '$ref' && typeof value === 'string') {
        if (value.startsWith('#/definitions/') || value.startsWith('#/$defs/')) {
          unresolved.push(`${currentPath}: ${value}`)
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          unresolved.push(...checkForUnresolvedRefs(item as Record<string, unknown>, `${currentPath}[${index}]`))
        })
      } else if (typeof value === 'object') {
        unresolved.push(...checkForUnresolvedRefs(value as Record<string, unknown>, currentPath))
      }
    })
  }

  return unresolved
}

const unresolvedRefs = checkForUnresolvedRefs(sortedDto)
if (unresolvedRefs.length > 0) {
  console.warn('Unresolved references found:', unresolvedRefs)
}

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'Oak API Documentation',
      description: 'Endpoints + Schema Definitions',
      version: '1.0.0',
    },
    components: {
      schemas: sortedDto.definitions,
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        }
      }
    },
  },
  apis: ['./src/routers/*.ts'],
})

app.get('/open-api', (_req, res) => {
  try {
    console.log('Generating OpenAPI spec...')
    const spec = swaggerSpec as { components?: { schemas?: Record<string, unknown> } }
    console.log('Schema definitions count:', Object.keys(spec.components?.schemas || {}).length)
    res.json(swaggerSpec)
  } catch (error) {
    console.error('Error generating OpenAPI spec:', error)
    res.status(500).json({ error: 'Failed to generate OpenAPI specification' })
  }
})

app.get('/swagger-ui', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Oak API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          SwaggerUIBundle({
            url: '/open-api',
            dom_id: '#swagger-ui'
          });
        </script>
      </body>
    </html>
  `)
})

export const handler = serverless({ app })
