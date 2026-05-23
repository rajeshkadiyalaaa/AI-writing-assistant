/**
 * Multiple OpenRouter API key profiles (local JSON store + optional .env default).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sanitizeApiKey, isValidOpenRouterKey } = require('./sanitizeKey');

const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'api-key-profiles.json');
const ENV_PROFILE_ID = '__env__';

function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '';
  return `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 5)}`;
}

function defaultStore() {
  return {
    activeProfileId: ENV_PROFILE_ID,
    profiles: [
      {
        id: ENV_PROFILE_ID,
        label: 'Server (.env)',
        key: null,
      },
    ],
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore() {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    const store = defaultStore();
    writeStore(store);
    return store;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.profiles?.length) return defaultStore();
    if (!parsed.profiles.some((p) => p.id === ENV_PROFILE_ID)) {
      parsed.profiles.unshift({ id: ENV_PROFILE_ID, label: 'Server (.env)', key: null });
    }
    return parsed;
  } catch {
    return defaultStore();
  }
}

function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), { mode: 0o600 });
}

function publicProfile(p) {
  const envKey = sanitizeApiKey(process.env.OPENROUTER_API_KEY);
  const isEnv = p.id === ENV_PROFILE_ID;
  const key = isEnv ? envKey : sanitizeApiKey(p.key);
  return {
    id: p.id,
    label: p.label,
    maskedKey: maskApiKey(key),
    isEnv,
    isConfigured: Boolean(key),
  };
}

function listProfiles() {
  const store = readStore();
  return {
    activeProfileId: store.activeProfileId || ENV_PROFILE_ID,
    profiles: store.profiles.map(publicProfile),
  };
}

function resolveApiKey(options = {}) {
  const { profileId, bodyApiKey } = options;
  if (bodyApiKey) {
    const cleaned = sanitizeApiKey(bodyApiKey);
    if (cleaned) return cleaned;
  }

  const store = readStore();
  const id = profileId || store.activeProfileId || ENV_PROFILE_ID;
  const profile = store.profiles.find((p) => p.id === id);
  if (!profile) {
    return sanitizeApiKey(process.env.OPENROUTER_API_KEY) || null;
  }
  if (profile.id === ENV_PROFILE_ID) {
    return sanitizeApiKey(process.env.OPENROUTER_API_KEY) || null;
  }
  return sanitizeApiKey(profile.key) || null;
}

function setActiveProfile(profileId) {
  const store = readStore();
  if (!store.profiles.some((p) => p.id === profileId)) {
    throw new Error('Profile not found');
  }
  store.activeProfileId = profileId;
  writeStore(store);
  const key = resolveApiKey({ profileId });
  if (key) process.env.OPENROUTER_API_KEY = key;
  return listProfiles();
}

function addProfile(label, apiKey) {
  const cleaned = sanitizeApiKey(apiKey);
  if (!isValidOpenRouterKey(cleaned)) {
    throw new Error('Invalid API key format');
  }
  const store = readStore();
  const id = crypto.randomUUID();
  store.profiles.push({ id, label: (label || 'API key').trim() || 'API key', key: cleaned });
  store.activeProfileId = id;
  writeStore(store);
  process.env.OPENROUTER_API_KEY = cleaned;
  return { profile: publicProfile(store.profiles[store.profiles.length - 1]), ...listProfiles() };
}

function removeProfile(profileId) {
  if (profileId === ENV_PROFILE_ID) {
    throw new Error('Cannot remove the server (.env) profile');
  }
  const store = readStore();
  store.profiles = store.profiles.filter((p) => p.id !== profileId);
  if (store.activeProfileId === profileId) {
    store.activeProfileId = ENV_PROFILE_ID;
  }
  writeStore(store);
  return listProfiles();
}

function updateProfileKey(profileId, apiKey, label) {
  const cleaned = sanitizeApiKey(apiKey);
  if (!isValidOpenRouterKey(cleaned)) {
    throw new Error('Invalid API key format');
  }
  const store = readStore();
  const profile = store.profiles.find((p) => p.id === profileId);
  if (!profile) {
    throw new Error('Profile not found');
  }
  if (profile.id === ENV_PROFILE_ID) {
    process.env.OPENROUTER_API_KEY = cleaned;
    writeStore(store);
    return listProfiles();
  }
  profile.key = cleaned;
  if (label && String(label).trim()) {
    profile.label = String(label).trim();
  }
  if (store.activeProfileId === profileId) {
    process.env.OPENROUTER_API_KEY = cleaned;
  }
  writeStore(store);
  return listProfiles();
}

/** Update the active profile key, or server env when active is .env profile. */
function updateActiveProfileKey(apiKey) {
  const cleaned = sanitizeApiKey(apiKey);
  if (!isValidOpenRouterKey(cleaned)) {
    throw new Error('Invalid API key format');
  }
  const store = readStore();
  const activeId = store.activeProfileId || ENV_PROFILE_ID;
  process.env.OPENROUTER_API_KEY = cleaned;

  if (activeId === ENV_PROFILE_ID) {
    let legacy = store.profiles.find((p) => p.id !== ENV_PROFILE_ID && p.label === 'Primary');
    if (!legacy) {
      legacy = { id: crypto.randomUUID(), label: 'Primary', key: cleaned };
      store.profiles.push(legacy);
    } else {
      legacy.key = cleaned;
    }
    writeStore(store);
    return listProfiles();
  }

  const profile = store.profiles.find((p) => p.id === activeId);
  if (profile) {
    profile.key = cleaned;
    writeStore(store);
    return listProfiles();
  }

  writeStore(store);
  return listProfiles();
}

/** @deprecated Use updateActiveProfileKey */
function syncEnvToLegacySettings(apiKey) {
  return updateActiveProfileKey(apiKey);
}

module.exports = {
  ENV_PROFILE_ID,
  listProfiles,
  resolveApiKey,
  setActiveProfile,
  addProfile,
  removeProfile,
  updateProfileKey,
  updateActiveProfileKey,
  syncEnvToLegacySettings,
  maskApiKey,
};
