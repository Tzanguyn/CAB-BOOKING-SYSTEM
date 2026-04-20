function safeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateExponentialBackoffDelay(attempt, options = {}) {
  const safeAttempt = Math.max(1, safeNumber(attempt, 1));
  const initialDelayMs = Math.max(0, safeNumber(options.initialDelayMs, 500));
  const multiplier = Math.max(1, safeNumber(options.multiplier, 2));
  const maxDelayMs = Math.max(initialDelayMs, safeNumber(options.maxDelayMs, 30000));
  const jitterRatio = Math.min(1, Math.max(0, safeNumber(options.jitterRatio, 0.1)));

  const baseDelay = Math.min(maxDelayMs, Math.round(initialDelayMs * (multiplier ** (safeAttempt - 1))));
  if (jitterRatio === 0) {
    return baseDelay;
  }

  const jitterRange = Math.round(baseDelay * jitterRatio);
  const jitter = Math.round((Math.random() * 2 - 1) * jitterRange);
  return Math.max(0, Math.min(maxDelayMs, baseDelay + jitter));
}

function sleep(ms) {
  const duration = Math.max(0, safeNumber(ms, 0));
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

module.exports = {
  safeNumber,
  sleep,
  calculateExponentialBackoffDelay
};