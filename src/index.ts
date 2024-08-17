import express from 'express'
import router from './routers/all_routes'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import dto from './generated/json/json-schema.json'
import { replaceDTORefs } from './utils/dtoHelpers'

const app = express()
app.use(express.json())

const updatedDto = replaceDTORefs(dto)
const jsDocOptions = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'TCGX API Documentation',
      description: 'Endpoints + Schema Definitions',
      version: '1.0.0',
    },
    components: {
      schemas: updatedDto.definitions,
      securitySchemes: {
          bearerAuth: {
              type: 'http',
              scheme: 'bearer',
          }
      }
    },
  },
  apis: ['./src/routers/*.ts'], // files containing annotations as above
}

const swaggerUIOptions = {
  customCss: '.swagger-ui .errors-wrapper { display: none } .swagger-ui .scheme-container { display: none } .swagger-ui .info p { font-size: 18px }'
}

const swaggerSpec = swaggerJSDoc(jsDocOptions)

app.use('/api/v1', router)

app.get('/open-api', (req, res) => res.json(jsDocOptions.definition))
app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUIOptions))

const server = app.listen(3000, () =>
  console.log(`Server ready at: http://localhost:3000`),
)