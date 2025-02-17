import express, { Request, Response, NextFunction } from 'express'
import router from './routers/all_routes'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import dto from './generated/json/json-schema.json'
import { replaceDTORefs, alphaSortDTO } from './utils/dtoHelpers'

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason)
})

const app = express()
app.use(express.json())

const updatedDto = replaceDTORefs(dto)
const sortedDto = alphaSortDTO(updatedDto)
const jsDocOptions = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'TCGX API Documentation',
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
  apis: ['./src/routers/*.ts'], // files containing annotations as above
}

const swaggerUIOptions = {
  customCss: '.swagger-ui .errors-wrapper { display: none } .swagger-ui .scheme-container { display: none } .swagger-ui .info p { font-size: 18px }',
}

const swaggerSpec = swaggerJSDoc(jsDocOptions)

app.use('/api/v1', router)

app.get('/open-api', (req, res) => res.json(jsDocOptions.definition))
app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUIOptions))

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {

  if (!res.headersSent) {
    if (err.message) {
      res.status(400).json({ errorMessage: err.message })
    } else {
      res.status(500).json({ errorMessage: 'Internal Server Error' })
    }
  }
})

const server = app.listen(3000, () =>
  console.log(`Server ready at: http://localhost:3000`),
)