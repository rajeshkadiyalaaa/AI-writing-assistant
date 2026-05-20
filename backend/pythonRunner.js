const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const { sanitizeApiKey } = require('./sanitizeKey');

const SCRIPTS_DIR = path.join(__dirname, 'scripts');
const PYTHON_BIN = process.env.PYTHON_PATH || 'python3';

/**
 * Run a Python script from backend/scripts with a JSON payload argument.
 * @param {string} scriptFile - e.g. 'generate_response.py'
 * @param {object} payload - serialized as single CLI arg
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
function runPythonScript(scriptFile, payload) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, scriptFile);
    const projectRoot = path.join(__dirname, '..');
    const nltkData = path.join(projectRoot, 'nltk_data');
    const env = { ...process.env, PYTHONUNBUFFERED: '1' };
    if (process.env.OPENROUTER_API_KEY) {
      env.OPENROUTER_API_KEY = sanitizeApiKey(process.env.OPENROUTER_API_KEY);
    }
    if (fs.existsSync(nltkData)) {
      env.NLTK_DATA = nltkData;
    }

    const proc = spawn(PYTHON_BIN, [scriptPath, JSON.stringify(payload)], { env });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (process.env.DEBUG === 'True') {
        console.error(`[${scriptFile}] stderr:`, chunk.toString());
      }
    });

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            `Python executable not found ("${PYTHON_BIN}"). Install Python 3.9+ or set PYTHON_PATH in .env`
          )
        );
      } else {
        reject(err);
      }
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        const trimmed = stdout.trim();
        if (trimmed) {
          try {
            const parsed = JSON.parse(trimmed);
            if (
              parsed &&
              typeof parsed === 'object' &&
              Object.prototype.hasOwnProperty.call(parsed, 'error')
            ) {
              resolve({ stdout: trimmed, stderr });
              return;
            }
          } catch {
            /* not JSON — treat as crash */
          }
        }
        const err = new Error(stderr.trim() || `Python script exited with code ${code}`);
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

/** Parse stdout as JSON; fall back to plain text wrapper */
function parsePythonJson(stdout, fallbackKey = 'response') {
  const trimmed = stdout.trim();
  if (!trimmed) {
    const err = new Error('Empty response from Python script');
    err.code = 'PYTHON_EMPTY';
    throw err;
  }
  try {
    return JSON.parse(trimmed);
  } catch (parseErr) {
    const err = new Error(`Invalid JSON from Python script: ${parseErr.message}`);
    err.code = 'PYTHON_PARSE';
    err.raw = trimmed.slice(0, 200);
    throw err;
  }
}

/** Parse stdout and throw if payload contains { error: "..." } */
function parsePythonJsonOrThrow(stdout, fallbackKey = 'response') {
  const data = parsePythonJson(stdout, fallbackKey);
  if (data?.error) {
    const err = new Error(data.error);
    err.details = data.details;
    err.pythonPayload = data;
    throw err;
  }
  return data;
}

module.exports = { runPythonScript, parsePythonJson, parsePythonJsonOrThrow, PYTHON_BIN };
