/**
 * Chat starters — casual, human tone (aligned with Skills.txt).
 */

const STARTERS_BY_TYPE = {
  general: [
    "I'm stuck on how to open this piece — can you throw out a few angles?",
    'Help me tighten this without making it sound like a robot wrote it.',
    "What's a plain way to say this that's still clear?",
  ],
  email: [
    'I need a short follow-up email that doesn\'t sound stiff — where do I start?',
    'How do I ask for something without sounding pushy?',
    'Can you draft a quick reply that gets to the point?',
  ],
  academic: [
    'I have notes everywhere — help me turn this into something readable.',
    'How do I explain this idea without sounding like an AI essay?',
    'What\'s a clearer way to state my main point up front?',
  ],
  business: [
    'I need an update for my team that\'s direct — not corporate fluff.',
    'Help me cut this down to what actually matters.',
    'How would you say this if you were talking to a busy colleague?',
  ],
  creative: [
    'I want this scene to feel more real — what\'s missing?',
    'Give me a messier first draft vibe, not something too polished.',
    'Help me find a voice for this character that doesn\'t sound generic.',
  ],
};

const DEFAULT_STARTERS = STARTERS_BY_TYPE.general;

export function getConversationStarters(documentType) {
  return STARTERS_BY_TYPE[documentType] || DEFAULT_STARTERS;
}
