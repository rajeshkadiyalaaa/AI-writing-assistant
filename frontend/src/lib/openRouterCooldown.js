/** Shared cooldown after OpenRouter 429 so chat + assist do not hammer the API. */

let cooldownUntil = 0;

export function setRateLimitCooldown(seconds = 60) {
  const sec = Math.max(Number(seconds) || 60, 15);
  cooldownUntil = Date.now() + sec * 1000;
}

export function getRateLimitCooldownRemainingMs() {
  return Math.max(0, cooldownUntil - Date.now());
}

export function isRateLimitCooldownActive() {
  return getRateLimitCooldownRemainingMs() > 0;
}

export function clearRateLimitCooldown() {
  cooldownUntil = 0;
}
