#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function run(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function checkMultiRegionArtifacts() {
  const files = [
    'infra/terraform/multi-region/main.tf',
    'infra/terraform/multi-region/variables.tf',
    'infra/terraform/multi-region/outputs.tf',
    'infra/terraform/multi-region/README.md'
  ];

  for (const file of files) {
    ensure(exists(file), `Missing multi-region terraform file: ${file}`);
  }

  const mainTf = read('infra/terraform/multi-region/main.tf');
  ensure(mainTf.includes('global_routing_profile'), 'main.tf must define global_routing_profile local');
  ensure(mainTf.includes('failover-runbook.txt'), 'main.tf must generate failover runbook');

  return { files };
}

function checkMlArtifacts() {
  const files = [
    'scripts/ml/train-pricing-model.js',
    'scripts/ml/register-pricing-model.js',
    'scripts/ci/validate-ml-lifecycle.js'
  ];

  for (const file of files) {
    ensure(exists(file), `Missing ML lifecycle file: ${file}`);
  }

  return { files };
}

function runMlLifecycle() {
  run('npm run ml:train');
  run('npm run ml:register');
  run('npm run ci:ml');
}

function main() {
  const summary = [];

  summary.push({
    case: 'P5-1',
    name: 'Multi-region terraform baseline',
    status: 'passed',
    details: checkMultiRegionArtifacts()
  });

  summary.push({
    case: 'P5-2',
    name: 'ML lifecycle scripts present',
    status: 'passed',
    details: checkMlArtifacts()
  });

  runMlLifecycle();
  summary.push({
    case: 'P5-3',
    name: 'ML lifecycle execution',
    status: 'passed'
  });

  console.log('--- Phase 5 Multi-region + ML Smoke Report ---');
  console.log(JSON.stringify({ summary }, null, 2));
}

try {
  main();
} catch (error) {
  console.error('phase5 smoke failed:', error.message);
  process.exit(1);
}
