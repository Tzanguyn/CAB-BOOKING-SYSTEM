#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const modelsDir = path.resolve(__dirname, '..', '..', 'models', 'pricing');
const candidateFile = path.join(modelsDir, 'candidate-model.json');
const registryFile = path.join(modelsDir, 'registry.json');
const productionFile = path.join(modelsDir, 'production-model.json');

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isSemverLike(value) {
  return /^pricing-model-v\d{4}\.\d{2}\.\d{2}$/.test(String(value || ''));
}

function main() {
  ensure(fs.existsSync(candidateFile), 'candidate model missing, run ml:train');
  ensure(fs.existsSync(registryFile), 'registry missing, run ml:register');

  const candidate = readJson(candidateFile);
  const registry = readJson(registryFile);

  ensure(candidate.modelName === 'pricing-engine', 'candidate modelName must be pricing-engine');
  ensure(isSemverLike(candidate.modelVersion), 'candidate modelVersion must match pricing-model-vYYYY.MM.DD');
  ensure(Number.isFinite(candidate.sampleCount) && candidate.sampleCount > 0, 'candidate sampleCount must be positive');
  ensure(typeof candidate.modelFingerprint === 'string' && candidate.modelFingerprint.length >= 32, 'candidate modelFingerprint invalid');
  ensure(Array.isArray(registry.entries), 'registry entries must be an array');
  ensure(registry.entries.some((item) => item.modelVersion === candidate.modelVersion), 'candidate modelVersion not found in registry entries');
  ensure(registry.latestCandidateVersion === candidate.modelVersion, 'latestCandidateVersion mismatch');

  if (fs.existsSync(productionFile)) {
    const production = readJson(productionFile);
    ensure(production.modelVersion === registry.latestProductionVersion, 'production modelVersion mismatch with registry latestProductionVersion');
  }

  console.log('ML lifecycle validation passed');
}

try {
  main();
} catch (error) {
  console.error('validate-ml-lifecycle failed:', error.message);
  process.exit(1);
}
