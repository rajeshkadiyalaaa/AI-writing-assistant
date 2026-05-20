/**
 * Client-side checks for AI-sounding phrases (from Skills.txt banned list).
 */

export const BANNED_PHRASES = [
  { pattern: /\bdelve\b/i, label: 'delve' },
  { pattern: /\bnuanced\b/i, label: 'nuanced' },
  { pattern: /it['']s worth noting/i, label: "it's worth noting" },
  { pattern: /\bcomprehensive\b/i, label: 'comprehensive' },
  { pattern: /\bin conclusion\b/i, label: 'in conclusion' },
  { pattern: /\bmoreover\b/i, label: 'moreover' },
  { pattern: /\bfurthermore\b/i, label: 'furthermore' },
  { pattern: /i['']d be happy to/i, label: "I'd be happy to" },
  { pattern: /\bcertainly!\b/i, label: 'certainly!' },
  { pattern: /\babsolutely!\b/i, label: 'absolutely!' },
  { pattern: /\bgreat question\b/i, label: 'great question' },
  { pattern: /\butilize\b/i, label: 'utilize' },
  { pattern: /\bdemonstrate\b/i, label: 'demonstrate' },
];

export function findBannedPhrases(content) {
  if (!content?.trim()) return [];
  const hits = [];
  BANNED_PHRASES.forEach(({ pattern, label }) => {
    if (pattern.test(content)) hits.push(label);
  });
  return [...new Set(hits)];
}

export function computeEditorStats(content) {
  const text = content || '';
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = text.length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const bannedHits = findBannedPhrases(text);

  return {
    wordCount,
    charCount,
    readingMinutes,
    bannedHits,
    soundsAi: bannedHits.length > 0,
  };
}
