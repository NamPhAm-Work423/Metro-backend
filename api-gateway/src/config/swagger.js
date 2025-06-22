const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'API-Gateway',
        version: '1.0.0',
        description: 'Swagger docs for API-Gateway',
    },
    servers: [
        { url: 'http://localhost:3000', description: 'Local server' }
    ],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        }
    },
    security: [ { bearerAuth: [] } ]
}

const options = {
    definition: swaggerDefinition,
    apis: [path.join(__dirname, '..', 'routes', '**/*.js')],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };
