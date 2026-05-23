/**
 * Fetches OpenRouter's catalog and picks 3 free models for writing tasks.
 * Cached for several hours so the UI stays fast and up to date.
 */
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_TTL_MS = 15 * 24 * 60 * 60 * 1000; // 15 days
const FALLBACK_PATH = path.join(__dirname, '../shared/models.json');
const ASSIGNED_MODELS_PATH = path.join(__dirname, 'assigned_models.json');

/** Not suitable for general writing in this app */
const WRITING_EXCLUDE =
  /lyria|image|audio|video|clip|tts|embedding|venice|uncensored|coder|code generation|coding agent|code model|qwen3-coder|laguna|poolside|cobuddy|nano-12b-v2-vl|owl-alpha/i;

/** Three task slots → document types in the UI */
const TASK_SLOTS = [
  {
    key: 'general',
    strengths: ['general', 'creative'],
    taskLabel: 'General & creative writing',
    preferIds: [
      'qwen/qwen3-next-80b-a3b-instruct:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'nousresearch/hermes-3-llama-3.1-405b:free',
      'google/gemma-4-31b-it:free',
    ],
    score(m) {
      const id = m.id.toLowerCase();
      const text = `${m.name || ''} ${m.description || ''}`.toLowerCase();
      let s = 0;
      if (/instruct|writing|assistant|chat|general/.test(text)) s += 90;
      if (/qwen3-next|llama-3\.3|hermes-3|gemma-4/.test(id)) s += 70;
      s += Math.min((m.context_length || 0) / 8000, 35);
      return s;
    },
  },
  {
    key: 'business',
    strengths: ['email', 'business'],
    taskLabel: 'Email & business writing',
    preferIds: [
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'minimax/minimax-m2.5:free',
    ],
    score(m) {
      const id = m.id.toLowerCase();
      const text = `${m.name || ''} ${m.description || ''}`.toLowerCase();
      let s = 0;
      if (/gemma|llama-3\.3|minimax|glm-4\.5|gpt-oss/.test(id)) s += 85;
      if (/concise|communication|instruct|multilingual|productivity/.test(text)) s += 50;
      s += Math.min((m.context_length || 0) / 10000, 30);
      return s;
    },
  },
  {
    key: 'academic',
    strengths: ['academic'],
    taskLabel: 'Academic & analytical writing',
    preferIds: [
      'deepseek/deepseek-v4-flash:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'arcee-ai/trinity-large-thinking:free',
    ],
    score(m) {
      const id = m.id.toLowerCase();
      const text = `${m.name || ''} ${m.description || ''}`.toLowerCase();
      let s = 0;
      if (/deepseek|nemotron|thinking|reasoning|research|technical/.test(id + text)) s += 90;
      if (/mixture-of-experts|moe|analytical/.test(text)) s += 40;
      s += Math.min((m.context_length || 0) / 8000, 35);
      return s;
    },
  },
];

function loadAssignedModels() {
  try {
    const raw = fs.readFileSync(ASSIGNED_MODELS_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (data && data.models && data.at) {
      return data;
    }
  } catch (err) {
    // Ignore if file doesn't exist or is invalid
  }
  return { at: 0, models: null, source: 'fallback' };
}

function saveAssignedModels(data) {
  try {
    fs.writeFileSync(ASSIGNED_MODELS_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save assigned models:', err.message);
  }
}

let cache = loadAssignedModels();
/** Coalesce concurrent catalog fetches (avoids stampede on cold cache). */
let inflightFetch = null;

function isFreeModel(m) {
  const p = m.pricing || {};
  return parseFloat(p.prompt ?? '1') === 0 && parseFloat(p.completion ?? '1') === 0;
}

function isWritingCandidate(m) {
  if (!isFreeModel(m)) return false;
  if (m.id === 'openrouter/free') return false;
  const blob = `${m.id} ${m.name || ''} ${m.description || ''}`;
  return !WRITING_EXCLUDE.test(blob);
}

function cleanDisplayName(name) {
  return (name || '')
    .replace(/\s*\(free\)\s*/gi, ' ')
    .replace(/:\s*free\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortDescription(m, taskLabel) {
  const raw = (m.description || '').replace(/\s+/g, ' ').trim();
  const snippet = raw.length > 100 ? `${raw.slice(0, 97)}…` : raw;
  return snippet ? `${taskLabel} · ${snippet}` : taskLabel;
}

function pickSlotModel(pool, slot, usedIds) {
  for (const id of slot.preferIds || []) {
    const found = pool.find((m) => m.id === id && !usedIds.has(m.id));
    if (found) return found;
  }

  let best = null;
  let bestScore = -1;
  for (const m of pool) {
    if (usedIds.has(m.id)) continue;
    const s = slot.score(m);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}

function pickTaskSpecificFreeModels(catalog) {
  const pool = catalog.filter(isWritingCandidate);
  const usedIds = new Set();
  const models = [];

  for (const slot of TASK_SLOTS) {
    const picked = pickSlotModel(pool, slot, usedIds);
    if (!picked) continue;
    usedIds.add(picked.id);
    models.push({
      id: picked.id,
      name: cleanDisplayName(picked.name),
      strengths: slot.strengths,
      description: shortDescription(picked, slot.taskLabel),
      free: true,
      task: slot.key,
    });
  }

  return models;
}

function loadFallbackModels() {
  try {
    const raw = fs.readFileSync(FALLBACK_PATH, 'utf8');
    const config = JSON.parse(raw);
    return {
      models: config.models || [],
      default_model: config.default_model || 'openrouter/free',
    };
  } catch {
    return {
      models: [
        {
          id: 'openrouter/free',
          name: 'OpenRouter Free',
          strengths: ['general', 'creative', 'email', 'business', 'academic'],
          description: 'Routes to an available free model',
          free: true,
          task: 'general',
        },
      ],
      default_model: 'openrouter/free',
    };
  }
}

async function fetchCatalog() {
  const res = await fetch(OPENROUTER_MODELS_URL, { timeout: 25000 });
  if (!res.ok) {
    throw new Error(`OpenRouter models HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!Array.isArray(json.data)) {
    throw new Error('OpenRouter models response missing data array');
  }
  return json.data;
}

async function getTaskSpecificFreeModels() {
  if (cache.models && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache;
  }

  if (inflightFetch) {
    return inflightFetch;
  }

  inflightFetch = (async () => {
    try {
      const catalog = await fetchCatalog();
      const models = pickTaskSpecificFreeModels(catalog);
      if (models.length < 3) {
        throw new Error(`Only ${models.length} task models resolved from OpenRouter`);
      }
      cache = {
        at: Date.now(),
        models,
        default_model: models[0].id,
        source: 'openrouter',
      };
      saveAssignedModels(cache);
      console.log(
        'OpenRouter free models:',
        models.map((m) => `${m.task}=${m.id}`).join(', '),
      );
      return cache;
    } catch (err) {
      console.warn('Using fallback models config:', err.message);
      const fallback = loadFallbackModels();
      cache = {
        at: Date.now(),
        models: fallback.models,
        default_model: fallback.default_model,
        source: 'fallback',
      };
      return cache;
    } finally {
      inflightFetch = null;
    }
  })();

  return inflightFetch;
}

function invalidateModelsCache() {
  inflightFetch = null;
  cache = { at: 0, models: null, source: 'fallback' };
}

async function refreshSpecificSlot(slotKey) {
  if (!slotKey || !cache.models) {
    invalidateModelsCache();
    return getTaskSpecificFreeModels();
  }

  const slotDef = TASK_SLOTS.find(s => s.key === slotKey);
  if (!slotDef) {
    invalidateModelsCache();
    return getTaskSpecificFreeModels();
  }

  try {
    const catalog = await fetchCatalog();
    const pool = catalog.filter(isWritingCandidate);
    
    const usedIds = new Set();
    for (const m of cache.models) {
      if (m.task !== slotKey) usedIds.add(m.id);
    }

    const picked = pickSlotModel(pool, slotDef, usedIds);
    if (picked) {
      const newModelObj = {
        id: picked.id,
        name: cleanDisplayName(picked.name),
        strengths: slotDef.strengths,
        description: shortDescription(picked, slotDef.taskLabel),
        free: true,
        task: slotDef.key,
      };

      cache.models = cache.models.map(m => m.task === slotKey ? newModelObj : m);
      if (cache.models[0]) cache.default_model = cache.models[0].id;
      cache.at = Date.now();
      saveAssignedModels(cache);
      console.log(`Refreshed slot '${slotKey}' -> ${picked.id}`);
    }
    return cache;
  } catch (err) {
    console.error(`Failed to refresh slot ${slotKey}:`, err.message);
    invalidateModelsCache();
    return getTaskSpecificFreeModels();
  }
}

module.exports = {
  getTaskSpecificFreeModels,
  invalidateModelsCache,
  refreshSpecificSlot,
  TASK_SLOTS,
};
