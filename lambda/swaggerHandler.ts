import express from 'express'
import swaggerJSDoc from 'swagger-jsdoc'
import dto from '../src/generated/json/json-schema.json'
import { replaceDTORefs, alphaSortDTO } from '../src/utils/dtoHelpers'
import serverless from '@vendia/serverless-express'

const app = express()

const sortedDto = alphaSortDTO(replaceDTORefs(dto))

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'Oak API Documentation',
      version: '1.0.0',
    },
    components: {
      schemas: sortedDto.definitions,
    },
  },
  apis: ['./src/routers/*.ts'],
})

app.get('/open-api', (_req, res) => {
  res.json(swaggerSpec)
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
