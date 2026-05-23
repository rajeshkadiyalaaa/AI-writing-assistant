/**
 * In-memory chat prompt + history trimming (no Python subprocess).
 */
const fs = require('fs');
const path = require('path');

const SKILLS_PATHS = [
  path.join(__dirname, '../Skills.txt'),
  path.join(__dirname, '../shared/writing_skills.txt'),
];

const DOC_TYPE_INSTRUCTIONS = {
  email: `
- Write emails like a real person: greeting, point, sign-off — no template stiffness.
- Get to the point; one clear ask if needed.
- Match how people actually email, not marketing copy.`,
  academic: `
- Sound like a capable student or researcher, not an AI essay generator.
- Use discipline terms when needed, but keep sentences human and direct.
- Arguments can be clear without "moreover" / "furthermore" transitions.
- Citations only if the user asks for them.`,
  business: `
- Clear and actionable, but not buzzword-heavy corporate speak.
- Say what matters; skip executive-summary padding unless asked.
- Numbers and facts are fine — just say them plainly.`,
  creative: `
- Vivid and specific beats flowery. Show, don't lecture.
- Let rhythm and voice vary; imperfect phrasing is okay.
- Stay in character or POV when writing fiction or narrative.`,
  general: `
- Match what the user is trying to do; don't over-structure the answer.
- Helpful beats thorough. Say the useful part first when it fits.`,
};

const CHAT_MAX_OUTPUT_TOKENS = parseInt(process.env.CHAT_MAX_TOKENS, 10) || 1000;
const CHAT_RECENT_MESSAGE_COUNT = parseInt(process.env.CHAT_RECENT_MESSAGES, 10) || 14;
const CHAT_HISTORY_CHAR_BUDGET = parseInt(process.env.CHAT_HISTORY_CHAR_BUDGET, 10) || 12000;
const CHAT_SUMMARY_MAX_CHARS = 900;

let cachedSkills = null;

function loadWritingSkills() {
  if (cachedSkills) return cachedSkills;
  for (const p of SKILLS_PATHS) {
    if (fs.existsSync(p)) {
      cachedSkills = fs.readFileSync(p, 'utf8').trim();
      return cachedSkills;
    }
  }
  cachedSkills = 'Write naturally, like a real person. Avoid AI-sounding phrases and stiff structure.';
  return cachedSkills;
}

function toneGuidance(tone) {
  const t = (tone || 'professional').toLowerCase();
  if (t === 'formal') {
    return (
      'Requested tone: formal. Stay human — no essay-bot phrasing — ' +
      'but fewer fillers and slang; slightly more careful word choice.'
    );
  }
  if (t === 'casual') {
    return (
      'Requested tone: casual. Lean into natural, conversational voice — ' +
      'contractions, hedges, and relaxed flow are welcome.'
    );
  }
  return (
    'Requested tone: professional. Clear and direct like a competent colleague — ' +
    'not corporate buzzwords or stiff AI polish.'
  );
}

function buildChatSystemPrompt(documentType, tone, temperature) {
  const doc = DOC_TYPE_INSTRUCTIONS[documentType] || DOC_TYPE_INSTRUCTIONS.general;
  const creativityNote =
    temperature > 0.7 ? 'lean a bit more playful and exploratory' : 'stay tight and direct';
  const skills = loadWritingSkills();

  return `=== WRITING VOICE (required) ===
${skills}
=== END WRITING VOICE ===

${toneGuidance(tone)}

You help with ${documentType} writing. Every reply must follow the WRITING VOICE.

DOCUMENT TYPE (${String(documentType).toUpperCase()}):
${doc}

HOW TO HELP:
- Answer the actual question; don't pad or lecture.
- Refer back to earlier messages when it helps; keep it conversational.
- Only use bullet lists if the user explicitly asked for a list.

Temperature: ${temperature} — ${creativityNote}.`;
}

function estimateCharsAsTokens(text) {
  return Math.ceil((text || '').length / 4);
}

function clip(text, max) {
  const s = (text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function buildOmittedSummary(omitted) {
  if (!omitted.length) return '';
  const lines = omitted.slice(-8).map((m) => {
    const role = m.role === 'user' ? 'User' : 'Assistant';
    return `- ${role}: ${clip(m.content, 120)}`;
  });
  let block = `Earlier in this conversation (${omitted.length} older message(s) omitted for length):\n${lines.join('\n')}`;
  if (block.length > CHAT_SUMMARY_MAX_CHARS) {
    block = `${block.slice(0, CHAT_SUMMARY_MAX_CHARS - 1)}…`;
  }
  return block;
}

function trimChatHistory(messages) {
  const dialog = messages.filter((m) => m && (m.role === 'user' || m.role === 'assistant'));
  if (dialog.length === 0) return { recent: [], omitted: [], summary: '' };

  const recentFromEnd = [];
  let charCount = 0;
  for (let i = dialog.length - 1; i >= 0; i -= 1) {
    const msg = dialog[i];
    const len = (msg.content || '').length;
    if (recentFromEnd.length >= CHAT_RECENT_MESSAGE_COUNT) break;
    if (charCount + len > CHAT_HISTORY_CHAR_BUDGET && recentFromEnd.length > 0) break;
    recentFromEnd.unshift(msg);
    charCount += len;
  }

  const omitted = dialog.slice(0, dialog.length - recentFromEnd.length);
  const summary = buildOmittedSummary(omitted);
  return { recent: recentFromEnd, omitted, summary };
}

/**
 * Build OpenRouter messages array for chat (system + optional summary + recent turns).
 */
function prepareChatMessagesForOpenRouter(body) {
  const {
    messages = [],
    model,
    documentType = 'general',
    tone = 'professional',
    temperature = 0.7,
  } = body;

  const temp = Number(temperature);
  const systemContent = buildChatSystemPrompt(documentType, tone, Number.isFinite(temp) ? temp : 0.7);
  const { recent, summary } = trimChatHistory(messages);

  const full = [{ role: 'system', content: systemContent }];
  if (summary) {
    full.push({ role: 'system', content: summary });
  }
  for (const msg of recent) {
    full.push({ role: msg.role, content: String(msg.content ?? '') });
  }

  return {
    messages: full,
    model,
    temperature: Number.isFinite(temp) ? temp : 0.7,
    max_tokens: CHAT_MAX_OUTPUT_TOKENS,
    meta: {
      history_total: messages.length,
      history_sent: recent.length,
      history_omitted: Math.max(0, messages.length - recent.length),
    },
  };
}

module.exports = {
  prepareChatMessagesForOpenRouter,
  buildChatSystemPrompt,
  CHAT_MAX_OUTPUT_TOKENS,
};
