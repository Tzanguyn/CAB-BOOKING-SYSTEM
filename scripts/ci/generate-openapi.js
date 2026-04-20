const fs = require('fs');
const path = require('path');
const { generateOpenapiServices } = require('./generate-openapi-services');

const root = path.resolve(__dirname, '..', '..');
const sourcePath = path.join(root, 'docs', 'openapi', 'openapi.json');
const outputPath = path.join(root, 'docs', 'openapi', 'openapi.generated.json');
const sourceDocuments = [
  path.join(root, 'services', 'review-service', 'docs', 'api-spec.yaml')
];

function ensureExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required OpenAPI source file: ${path.relative(root, filePath)}`);
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
  const allSourceDocuments = [
    ...sourceDocuments,
    ...generatedServiceFiles
  ];

  const generated = {
    ...spec,
    info: {
      ...spec.info,
      'x-generated-at': new Date().toISOString(),
      'x-source-documents': allSourceDocuments.map((filePath) => path.relative(root, filePath).replace(/\\/g, '/'))
    }
  };

  fs.writeFileSync(outputPath, JSON.stringify(generated, null, 2) + '\n', 'utf8');
  console.log(`Generated OpenAPI artifact at ${path.relative(root, outputPath)}`);
}

main();