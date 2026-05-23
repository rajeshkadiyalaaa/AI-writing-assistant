#!/usr/bin/env node
/**
 * Smoke tests: backend health, models API, Python imports, writing skills, suggestion parsing.
 * Run from repo root: npm test
 * Requires backend on PORT (default 5001): npm start (or backend only)
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5001;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.join(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'backend/scripts');
let failed = 0;

function fail(msg) {
  console.error('FAIL:', msg);
  failed += 1;
}

function pass(msg) {
  console.log('OK:', msg);
}

async function main() {
  try {
    const res = await fetch(`${BASE}/api/health`);
    const data = await res.json();
    if (res.ok && data.status === 'ok') {
      pass('GET /api/health');
    } else {
      fail(`/api/health returned ${res.status}`);
    }
    if (typeof data.apiKeyConfigured === 'boolean') {
      pass('health includes apiKeyConfigured');
    } else {
      fail('health missing apiKeyConfigured');
    }
  } catch (e) {
    fail(`Cannot reach backend at ${BASE} — is it running? (${e.message})`);
  }

  try {
    const res = await fetch(`${BASE}/api/models`);
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.models) || data.models.length === 0) {
      fail('/api/models invalid response');
    } else {
      const sample = data.models[0];
      if (sample.id && sample.name) {
        pass(`GET /api/models (${data.models.length} models, shape ok)`);
      } else {
        fail('/api/models entries missing id or name');
      }
    }
  } catch (e) {
    fail(`/api/models: ${e.message}`);
  }

  const py = process.env.PYTHON_PATH || 'python3';

  for (const script of ['generate_response.py', 'generate_suggestions.py', 'improve_readability.py']) {
    const scriptPath = path.join(SCRIPTS_DIR, script);
    const r = spawnSync(
      py,
      [
        '-c',
        `import importlib.util; s=importlib.util.spec_from_file_location('m',${JSON.stringify(scriptPath)}); m=importlib.util.module_from_spec(s); s.loader.exec_module(m)`,
      ],
      { encoding: 'utf8', timeout: 15000, cwd: SCRIPTS_DIR }
    );
    if (r.status === 0) pass(`import ${script}`);
    else fail(`import ${script}: ${(r.stderr || r.stdout || '').slice(0, 200)}`);
  }

  const skillsCheck = spawnSync(
    py,
    [
      '-c',
      `import sys; sys.path.insert(0, ${JSON.stringify(SCRIPTS_DIR)}); from writing_skills import load_writing_skills; s=load_writing_skills(); assert len(s) > 100 and ('BANNED' in s or 'human' in s.lower()), 'skills too short'`,
    ],
    { encoding: 'utf8', timeout: 10000, cwd: SCRIPTS_DIR }
  );
  if (skillsCheck.status === 0) pass('writing_skills.load_writing_skills()');
  else fail(`writing_skills: ${(skillsCheck.stderr || '').slice(0, 200)}`);

  const fixturePath = path.join(__dirname, 'fixtures/suggestion-payload.json');
  if (!fs.existsSync(fixturePath)) {
    fail('missing scripts/fixtures/suggestion-payload.json');
  } else {
    try {
      const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const categories = Object.keys(payload).filter((k) => Array.isArray(payload[k]));
      if (categories.length === 0) throw new Error('no categories');
      const items = [];
      let id = 1;
      Object.entries(payload).forEach(([category, texts]) => {
        if (Array.isArray(texts)) {
          texts.forEach((text) => items.push({ id: id++, category, text: String(text) }));
        }
      });
      if (items.length >= 3 && items.every((i) => i.text.length > 5)) {
        pass(`suggestion fixture parse (${items.length} items)`);
      } else {
        fail('suggestion fixture parse produced invalid items');
      }
    } catch (e) {
      fail(`suggestion fixture: ${e.message}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
