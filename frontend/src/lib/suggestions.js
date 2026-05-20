/** Normalize API suggestion payloads into UI list items */

import { parseSuggestionText } from './applySuggestion';

const CATEGORY_TO_TYPE = {
  grammar: 'grammar',
  style: 'improvement',
  structure: 'improvement',
  content: 'alternative',
  clarity: 'improvement',
  other: 'improvement',
};

export function mapCategoryToType(category) {
  return CATEGORY_TO_TYPE[category] || 'improvement';
}

function enrichItem(item) {
  const parsed = parseSuggestionText(item.text);
  return {
    ...item,
    search: parsed.search,
    replace: parsed.replace,
    summary: parsed.summary,
  };
}

export function normalizeSuggestions(suggestionData) {
  if (!suggestionData) return [];

  if (Array.isArray(suggestionData)) {
    return suggestionData.map((item) =>
      enrichItem(typeof item === 'string' ? { id: Date.now(), type: 'improvement', text: item } : item)
    );
  }

  if (typeof suggestionData === 'object') {
    const result = [];
    let idCounter = 1;
    Object.entries(suggestionData).forEach(([category, items]) => {
      if (Array.isArray(items)) {
        items.forEach((text) => {
          result.push(
            enrichItem({
              id: idCounter++,
              type: mapCategoryToType(category),
              text: typeof text === 'string' ? text : String(text),
            })
          );
        });
      }
    });
    return result;
  }

  if (typeof suggestionData === 'string') {
    return [enrichItem({ id: 1, type: 'improvement', text: suggestionData })];
  }

  return [];
}
