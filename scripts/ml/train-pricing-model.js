#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PricingEngine = require('../../services/pricing-service/src/ai/pricingEngine');

const artifactDir = path.resolve(__dirname, '..', '..', 'models', 'pricing');
const modelVersion = process.env.PRICING_MODEL_VERSION || `pricing-model-v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}`;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildSyntheticDataset(size = 500) {
  const vehicleTypes = ['standard', 'premium', 'suv', 'van'];
  const demandLevels = ['low', 'normal', 'high', 'very_high'];
  const supplyLevels = ['abundant', 'normal', 'low', 'very_low'];
  const now = Date.now();

  return Array.from({ length: size }).map((_, i) => {
    const distance = Number(rand(1.2, 26).toFixed(3));
    const duration = Number((distance * rand(1.7, 3.6)).toFixed(2));
    const vehicleType = pick(vehicleTypes);
    const surge = pick([1, 1, 1.1, 1.2, 1.35]);
    const hourOffset = i * 17;
    const pickupTime = new Date(now - hourOffset * 60 * 1000);

    const baseByType = {
      standard: 12000,
      premium: 20000,
      suv: 25000,
      van: 30000
    };

    const perKmByType = {
      standard: 8000,
      premium: 12000,
      suv: 15000,
      van: 18000
    };

    const perMinByType = {
      standard: 3000,
      premium: 5000,
      suv: 6000,
      van: 7000
    };

    const noise = rand(-3500, 3500);
    const actualFare = Math.max(
      15000,
      Math.round((baseByType[vehicleType] + distance * perKmByType[vehicleType] + duration * perMinByType[vehicleType]) * surge + noise)
    );

    return {
      distance,
      duration,
      vehicleType,
      actualFare,
      surgeMultiplier: surge,
      pickupTime,
      demandLevel: pick(demandLevels),
      supplyLevel: pick(supplyLevels)
    };
  });
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

async function main() {
  const engine = new PricingEngine();
  const dataset = buildSyntheticDataset(Number(process.env.PRICING_TRAINING_SAMPLES || 500));

  let trainingResult = null;
  let mode = 'heuristic-fallback';

  try {
    trainingResult = await engine.trainModels(dataset);
    mode = 'ml-regression';
  } catch (error) {
    trainingResult = {
      trained: false,
      reason: `training_failed: ${error.message}`,
      samples: dataset.length,
      lastTrained: new Date().toISOString()
    };
  }

  const status = engine.getModelStatus();
  const modelFingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify({ status, mode, samples: dataset.length }))
    .digest('hex');

  const artifact = {
    modelName: 'pricing-engine',
    modelVersion,
    trainingMode: mode,
    trainedAt: new Date().toISOString(),
    sampleCount: dataset.length,
    featureSet: ['distance', 'duration', 'vehicleType', 'surgeMultiplier', 'pickupTime'],
    trainingResult,
    modelStatus: status,
    dataContractVersion: '1.0.0',
    modelFingerprint,
    promoted: false
  };

  const artifactFile = path.join(artifactDir, 'candidate-model.json');
  writeJson(artifactFile, artifact);

  console.log(`Training artifact written: ${artifactFile}`);
  console.log(`Model version: ${modelVersion}`);
  console.log(`Training mode: ${mode}`);
}

main().catch((error) => {
  console.error('train-pricing-model failed:', error.message);
  process.exit(1);
});
