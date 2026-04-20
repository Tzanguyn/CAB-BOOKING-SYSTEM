const fs = require('fs');
const path = require('path');
const { generateOpenapiServices } = require('./generate-openapi-services');

const root = path.resolve(__dirname, '..', '..');
const sourcePath = path.join(root, 'docs', 'openapi', 'openapi.json');
const generatedPath = path.join(root, 'docs', 'openapi', 'openapi.generated.json');
const sourceDocuments = [
  path.join(root, 'services', 'review-service', 'docs', 'api-spec.yaml')
];

function ensureExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required OpenAPI file: ${path.relative(root, filePath)}`);
  }
}

function main() {
  const generatedServiceFiles = generateOpenapiServices();
  ensureExists(sourcePath);

  for (const sourceDocument of sourceDocuments) {
    ensureExists(sourceDocument);
  }

  for (const generatedServiceFile of generatedServiceFiles) {
    ensureExists(generatedServiceFile);
  }

  const spec = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (!spec.openapi || !spec.paths || typeof spec.paths !== 'object') {
    throw new Error('docs/openapi/openapi.json does not look like a valid OpenAPI document');
  }

  if (!fs.existsSync(generatedPath)) {
    throw new Error('Generated OpenAPI artifact is missing. Run npm run openapi:generate first.');
  }

  const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
  if (generated.info?.['x-generated-at'] == null) {
    throw new Error('Generated OpenAPI artifact is missing x-generated-at metadata');
  }

  const expectedSources = [
    ...sourceDocuments,
    ...generatedServiceFiles
  ].map((filePath) => path.relative(root, filePath).replace(/\\/g, '/')).sort();
  const actualSources = Array.isArray(generated.info?.['x-source-documents'])
    ? [...generated.info['x-source-documents']].sort()
    : [];

  if (JSON.stringify(expectedSources) !== JSON.stringify(actualSources)) {
    throw new Error('OpenAPI source document list drift detected. Run npm run openapi:generate and commit the updated artifact.');
  }

  console.log('OpenAPI validation passed');
}

main();