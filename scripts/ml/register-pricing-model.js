#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const modelsDir = path.resolve(__dirname, '..', '..', 'models', 'pricing');
const candidateFile = path.join(modelsDir, 'candidate-model.json');
const registryFile = path.join(modelsDir, 'registry.json');
const productionFile = path.join(modelsDir, 'production-model.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function loadRegistry() {
  if (!fs.existsSync(registryFile)) {
    return {
      modelName: 'pricing-engine',
      entries: [],
      latestCandidateVersion: null,
      latestProductionVersion: null,
      updatedAt: null
    };
  }

  return readJson(registryFile);
}

function upsertEntry(entries, nextEntry) {
  const index = entries.findIndex((item) => item.modelVersion === nextEntry.modelVersion);
  if (index >= 0) {
    const cloned = [...entries];
    cloned[index] = nextEntry;
    return cloned;
  }

  return [...entries, nextEntry];
}

function main() {
  if (!fs.existsSync(candidateFile)) {
    throw new Error('candidate model is missing, run ml:train first');
  }

  const candidate = readJson(candidateFile);
  const registry = loadRegistry();
  const promotionTarget = process.env.ML_PROMOTE_TO_PRODUCTION === 'true';

  const entry = {
    modelVersion: candidate.modelVersion,
    trainingMode: candidate.trainingMode,
    sampleCount: candidate.sampleCount,
    dataContractVersion: candidate.dataContractVersion,
    modelFingerprint: candidate.modelFingerprint,
    trainedAt: candidate.trainedAt,
    stage: promotionTarget ? 'production' : 'candidate',
    registeredAt: new Date().toISOString()
  };

  registry.entries = upsertEntry(registry.entries || [], entry);
  registry.latestCandidateVersion = candidate.modelVersion;

  if (promotionTarget) {
    registry.latestProductionVersion = candidate.modelVersion;
    candidate.promoted = true;
    candidate.promotedAt = new Date().toISOString();
    writeJson(productionFile, candidate);
  }

  registry.updatedAt = new Date().toISOString();
  writeJson(registryFile, registry);

  console.log(`Model registered: ${candidate.modelVersion}`);
  console.log(`Stage: ${entry.stage}`);
  if (promotionTarget) {
    console.log(`Production artifact updated: ${productionFile}`);
  }
}

try {
  main();
} catch (error) {
  console.error('register-pricing-model failed:', error.message);
  process.exit(1);
}
