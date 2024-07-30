import swaggerAutogen from 'swagger-autogen'

const doc = {
    info: {
        version: 'v1.0.0',
        title: 'OPS API Documentation',
    },
    servers: [],
    tags: [],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
            }
        }
    }
}

const outputFile = './swagger_output.json'
const endpointsFiles = ['./src/routers/all_routes.ts']

swaggerAutogen({openapi: '3.0.0'})(outputFile, endpointsFiles, doc)