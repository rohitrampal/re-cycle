/**
 * Serves OpenAPI docs (YAML) with Swagger UI.
 * swagger-ui-serve only supports require() so it can't load .yaml; this script loads and parses YAML.
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');


const port = Number(process.env.DOCS_PORT) || 8080;
const specPath = path.join(__dirname, 'openapi.yaml');
const spec = yaml.load(fs.readFileSync(specPath, 'utf8'));

const app = express();
app.use('/', swaggerUi.serve, swaggerUi.setup(spec));

app.listen(port, () => {
  console.info(`API docs at http://localhost:${port}`);
});
