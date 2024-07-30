import express from 'express'
import router from './routers/all_routes'
import swaggerUi from 'swagger-ui-express'
import swaggerOutput from './swagger_output.json'

const app = express()
app.use(express.json())

app.use('/api/v1', router)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerOutput));

const server = app.listen(3000, () =>
  console.log(`Server ready at: http://localhost:3000`),
)
