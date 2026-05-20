#!/usr/bin/env python
"""
generate_suggestions.py
Generate structured writing suggestions using the OpenRouter API.

Usage:
    python generate_suggestions.py '<json_input>'

JSON Input Schema:
    {
        "content": str,          # Required: Text to analyze
        "documentType": str,     # Optional: "general" | "academic" | "technical" | "creative" |
                                 #           "narrative" | "marketing" | "email" | "business" | "formal"
        "tone": str,             # Optional: "professional" | "casual" | "formal" (default: "professional")
        "model": str             # Optional: OpenRouter model ID (default: DEFAULT_MODEL env var)
    }

Environment Variables:
    OPENROUTER_API_KEY  — Required. Your OpenRouter API key.
    DEFAULT_MODEL       — Optional. Override the default model.
    TEMPERATURE         — Optional. Sampling temperature (overridden per document type).
    MAX_TOKENS          — Optional. Max tokens for the response (default: 2000).
"""

import json
import os
import re
import sys
import time

import requests
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------

# Support .env at project root (up to 3 levels above this file)
_here = os.path.abspath(__file__)
for _levels in range(1, 4):
    _candidate = os.path.join(os.path.dirname(_here), *(['..'] * _levels), '.env')
    if os.path.exists(_candidate):
        load_dotenv(dotenv_path=os.path.normpath(_candidate))
        break
else:
    load_dotenv()  # fallback: look in cwd

try:
    from utils import (
        enrich_ai_response,
        estimate_tokens,
        extract_key_topics,
        detect_content_type,
        safe_tokenize,
        sanitize_api_key,
    )
    _UTILS_AVAILABLE = True
except ImportError:
    _UTILS_AVAILABLE = False

    def sanitize_api_key(raw):
        import re as _re
        if not raw:
            return ""
        return (
            _re.sub(
                r"[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u2000-\u200F\u200B-\u200D\u2028\u2029\u202A-\u202E\u2060-\u206F\ufeff]+",
                "",
                str(raw),
            ).strip()
        )

from openrouter_response import extract_assistant_text

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL      = os.getenv("DEFAULT_MODEL", "openrouter/free")
DEFAULT_MAX_TOKENS = int(os.getenv("MAX_TOKENS", 2000))
MAX_CHUNK_SIZE     = 3000   # chars before chunking kicks in
CHUNK_OVERLAP      = 300    # chars of context overlap between chunks

# Per-document-type model parameters
_DOC_TYPE_PARAMS: dict[str, dict] = {
    "academic":   {"temperature": 0.3, "top_p": 0.85, "frequency_penalty": 0.2, "presence_penalty": 0.3},
    "technical":  {"temperature": 0.3, "top_p": 0.85, "frequency_penalty": 0.2, "presence_penalty": 0.3},
    "scientific": {"temperature": 0.3, "top_p": 0.85, "frequency_penalty": 0.2, "presence_penalty": 0.3},
    "creative":   {"temperature": 0.7, "top_p": 0.95, "frequency_penalty": 0.4, "presence_penalty": 0.4},
    "narrative":  {"temperature": 0.7, "top_p": 0.95, "frequency_penalty": 0.4, "presence_penalty": 0.4},
    "marketing":  {"temperature": 0.7, "top_p": 0.95, "frequency_penalty": 0.4, "presence_penalty": 0.4},
    "email":      {"temperature": 0.5, "top_p": 0.90, "frequency_penalty": 0.3, "presence_penalty": 0.3},
    "business":   {"temperature": 0.5, "top_p": 0.90, "frequency_penalty": 0.3, "presence_penalty": 0.3},
    "formal":     {"temperature": 0.5, "top_p": 0.90, "frequency_penalty": 0.3, "presence_penalty": 0.3},
}
_DEFAULT_PARAMS = {"temperature": 0.7, "top_p": 0.90, "frequency_penalty": 0.3, "presence_penalty": 0.3}

# Simple in-memory cache (keyed by content hash + params)
_suggestion_cache: dict[str, dict] = {}

EMPTY_CATEGORIES: dict[str, list] = {
    "grammar": [], "style": [], "structure": [], "content": [], "clarity": [], "other": []
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def _debug(msg: str) -> None:
    print(f"[generate_suggestions] {msg}", file=sys.stderr)

def _error(msg: str, details: str = "") -> str:
    payload: dict = {"error": msg}
    if details:
        payload["details"] = details
    _debug(f"Error: {msg}")
    return json.dumps(payload, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def generate_suggestions(input_data: dict, num_retries: int = 3) -> str:
    """
    Analyze text and return structured writing suggestions via OpenRouter.

    Returns:
        JSON string containing categorized suggestions or a structured error.
    """
    api_key = sanitize_api_key(os.getenv("OPENROUTER_API_KEY"))
    if not api_key:
        return _error("OPENROUTER_API_KEY not found in environment variables.")

    # ------------------------------------------------------------------
    # Parse & validate input
    # ------------------------------------------------------------------
    content: str = input_data.get("content", "").strip()
    if not content:
        return _error("No content provided.")

    document_type: str = (
        input_data.get("documentType")
        or input_data.get("document_type")
        or ("" if not _UTILS_AVAILABLE else detect_content_type(content))
        or "general"
    )
    tone: str  = input_data.get("tone", "professional")
    model: str = input_data.get("model", DEFAULT_MODEL)

    _debug(f"document_type={document_type} | tone={tone} | model={model}")

    # ------------------------------------------------------------------
    # Optional utils enrichment
    # ------------------------------------------------------------------
    if _UTILS_AVAILABLE:
        _debug(f"Content length: {len(content)} chars | ~{estimate_tokens(content)} tokens")
        try:
            topics = extract_key_topics(content)
            _debug(f"Key topics: {', '.join(topics[:5]) or 'n/a'}")
        except Exception as exc:
            _debug(f"Topic extraction failed: {exc}")
        try:
            sentences   = safe_tokenize(content)
            avg_words   = sum(len(s.split()) for s in sentences) / max(1, len(sentences))
            _debug(f"Sentences: {len(sentences)} | Avg words/sentence: {avg_words:.1f}")
        except Exception as exc:
            _debug(f"Tokenization failed: {exc}")

    # ------------------------------------------------------------------
    # Chunking for long content
    # ------------------------------------------------------------------
    cache_key     = _cache_key(content, document_type, tone, model)
    content_to_use, is_chunk = _resolve_content(content, cache_key)

    # ------------------------------------------------------------------
    # Model parameters
    # ------------------------------------------------------------------
    params = dict(_DOC_TYPE_PARAMS.get(document_type, _DEFAULT_PARAMS))
    if len(content_to_use) > 3000:
        params["temperature"] = max(0.2, params["temperature"] - 0.1)

    max_tokens = DEFAULT_MAX_TOKENS
    if len(content_to_use) > 5000:
        max_tokens = 3000
    elif len(content_to_use) < 500:
        max_tokens = 1500

    _debug(f"params={params} | max_tokens={max_tokens}")

    # ------------------------------------------------------------------
    # Prompt
    # ------------------------------------------------------------------
    suggestion_depth = (
        "basic"       if len(content_to_use) < 200  else
        "comprehensive" if len(content_to_use) > 2000 else
        "detailed"
    )
    system_message = _build_system_prompt(document_type, tone, suggestion_depth)

    messages = [
        {"role": "system", "content": system_message},
        {
            "role": "user",
            "content": (
                f"Please analyze this {document_type} content and provide "
                f"specific improvement suggestions:\n\n{content_to_use}"
            ),
        },
    ]

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        **params,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-writing-assistant.vercel.app",
        "X-Title": "AI Writing Assistant",
    }

    # ------------------------------------------------------------------
    # API call with retry
    # ------------------------------------------------------------------
    raw_suggestions = _call_with_retry(headers, payload, num_retries)
    if raw_suggestions is None:
        return _error(
            "OpenRouter rejected the request (often an invalid API key). "
            "Create a new key at https://openrouter.ai/keys and paste it in Settings "
            "or OPENROUTER_API_KEY in .env — no spaces or line breaks."
        )

    # ------------------------------------------------------------------
    # Parse, score, filter
    # ------------------------------------------------------------------
    parsed     = _parse_suggestions(raw_suggestions)
    filtered   = _filter_by_quality(parsed, threshold=0.45)

    # Cache if full document
    if not is_chunk and len(content_to_use) > 500:
        _suggestion_cache[cache_key] = filtered
        _debug(f"Cached result for key: {cache_key}")

    # ------------------------------------------------------------------
    # Build result
    # ------------------------------------------------------------------
    result: dict = {
        "suggestions":     filtered,
        "raw_suggestions": raw_suggestions,
    }

    if is_chunk:
        result["processing_info"] = {
            "chunked":          True,
            "total_length":     len(content),
            "processed_length": len(content_to_use),
            "chunk_ratio":      round(len(content_to_use) / len(content) * 100, 1),
        }

    if _UTILS_AVAILABLE:
        try:
            enriched = enrich_ai_response(raw_suggestions, content[:300])
            result["enhanced_data"] = {
                "structured_content": enriched["structured_data"],
                "statistics":         enriched["statistics"],
                "quality_metrics":    enriched["quality_metrics"],
                "metadata":           enriched["metadata"],
            }
            if enriched["quality_metrics"].get("overall_quality_score", 1.0) < 0.7:
                result["quality_warnings"] = enriched["quality_metrics"].get("potential_issues", [])
        except Exception as exc:
            _debug(f"enrich_ai_response failed: {exc}")

    return json.dumps(result, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_system_prompt(document_type: str, tone: str, suggestion_depth: str) -> str:
    from writing_skills import suggestions_voice_note, tone_guidance, writing_voice_block

    voice = writing_voice_block(extra=f"{tone_guidance(tone)}\n{suggestions_voice_note()}")
    return f"""{voice}

You analyse {document_type} text and suggest improvements. The author's goal tone is {tone}. Depth: {suggestion_depth}.

Your job: find real issues AND steer rewrites toward the WRITING VOICE (natural human, not AI).

PROVIDE SUGGESTIONS UNDER THESE EXACT HEADINGS:
GRAMMAR:
STYLE:
STRUCTURE:
CONTENT:
CLARITY:

Under each heading, give 3-5 numbered suggestions. Each suggestion must include:
  - The specific issue
  - Why it matters
  - A concrete example using quoted text: Change "original phrase" to "improved phrase"

If a category has no issues, write: "No issues found in this category."

Guidelines:
- Be specific — no generic "consider improving flow" advice.
- Flag AI-sounding phrases (banned words, stiff transitions) under STYLE.
- Example fixes must sound like a real person wrote them.
- Return only the structured suggestions — no preamble, compliments, or closing remarks."""


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

def _call_with_retry(
    headers: dict,
    payload: dict,
    max_retries: int = 3,
    base_delay: float = 2.0,
) -> str | None:
    """POST to OpenRouter with exponential-backoff retry. Returns text or None."""
    delay = base_delay

    for attempt in range(1, max_retries + 1):
        _debug(f"API attempt {attempt}/{max_retries}")
        try:
            resp = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=60)
            _debug(f"Status: {resp.status_code}")

            if resp.status_code == 200:
                return _extract_content(resp.json())

            if resp.status_code in (401, 404):
                _debug(f"Fatal HTTP {resp.status_code}: {resp.text}")
                return None

            if resp.status_code == 429:
                if attempt < max_retries:
                    _debug(f"Rate limited. Retrying in {delay}s …")
                    time.sleep(delay)
                    delay *= 2
                    continue
                _debug("Rate limit exceeded after all retries.")
                return None

            _debug(f"Unexpected {resp.status_code}: {resp.text}")
            if attempt < max_retries:
                time.sleep(delay)
                delay *= 2

        except requests.Timeout:
            _debug(f"Timeout on attempt {attempt}.")
            if attempt < max_retries:
                time.sleep(delay); delay *= 2

        except requests.ConnectionError as exc:
            _debug(f"Connection error: {exc}")
            if attempt < max_retries:
                time.sleep(delay); delay *= 2

        except requests.RequestException as exc:
            _debug(f"Request error: {exc}")
            if attempt < max_retries:
                time.sleep(delay); delay *= 2

    return None


def _extract_content(response_data: dict) -> str | None:
    """Extract text from a standard OpenAI-compatible OpenRouter response."""
    text = extract_assistant_text(response_data)
    if text is None:
        _debug(f"Could not extract content. Keys: {list(response_data.keys())}")
    return text


# ---------------------------------------------------------------------------
# Suggestion parsing
# ---------------------------------------------------------------------------

def _parse_suggestions(text: str) -> dict[str, list]:
    """
    Parse the raw suggestions text into a {category: [suggestion, ...]} dict.
    Falls back to keyword-based parsing if regex splitting yields nothing.
    """
    if not text or not isinstance(text, str):
        _debug("Empty or invalid text passed to parser.")
        return dict(EMPTY_CATEGORIES)

    _debug(f"Parsing suggestions (first 120 chars): {text[:120]!r}")

    categories = {k: [] for k in EMPTY_CATEGORIES}

    # --- Primary: split on explicit category headers ---
    try:
        # Match "GRAMMAR:", "1. STYLE:", "## CLARITY:", etc.
        header_re = re.compile(
            r'(?:^|\n)\s*(?:\d+\.\s*|#+\s*)?(GRAMMAR|STYLE|STRUCTURE|CONTENT|CLARITY)\s*:',
            re.IGNORECASE,
        )
        parts = header_re.split(text)

        # parts alternates between inter-header text and (header, body) pairs
        # parts[0] is text before the first header (discard)
        i = 1
        while i < len(parts) - 1:
            header = parts[i].strip().lower()
            body   = parts[i + 1].strip()
            i += 2

            if header not in categories:
                continue
            if re.search(r'no issues? found', body, re.IGNORECASE):
                continue

            # Split body on numbered items
            items = re.split(r'\n\s*\d+[.)]\s*', body)
            for item in items:
                item = item.strip()
                if item and len(item) > 10:
                    categories[header].append(item)

    except Exception as exc:
        _debug(f"Primary parser error: {exc}")

    # --- Fallback: line-by-line keyword routing ---
    if all(len(v) == 0 for v in categories.values()):
        _debug("Primary parser found nothing — using fallback.")
        categories = _fallback_parse(text)

    # --- Last resort ---
    if all(len(v) == 0 for v in categories.values()):
        _debug("Both parsers yielded nothing — inserting generic message.")
        categories["other"] = [
            "The text was analysed but no structured suggestions could be extracted. "
            "Consider providing more content or trying a different model."
        ]

    return categories


def _fallback_parse(text: str) -> dict[str, list]:
    """Line-by-line keyword-based fallback parser."""
    categories = {k: [] for k in EMPTY_CATEGORIES}
    current = "other"

    _KEYWORD_MAP = {
        "grammar":   r'grammar|spelling|punctuation|typo|verb|tense',
        "style":     r'style|tone|voice|formal|informal|professional',
        "structure": r'structure|organization|flow|paragraph|section|transition',
        "content":   r'content|substance|idea|topic|evidence|argument',
        "clarity":   r'clarity|clear|concise|understandable|readable|ambiguous',
    }

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        lower = line.lower()

        for cat, pattern in _KEYWORD_MAP.items():
            if re.search(pattern, lower):
                current = cat
                break

        # Skip bare category headers and very short lines
        if len(line) > 10 and not re.match(
            r'^(grammar|style|structure|content|clarity)\s*:?$', lower
        ):
            categories[current].append(line)

    # If still empty, split into paragraphs and dump into "other"
    if all(len(v) == 0 for v in categories.values()):
        for para in re.split(r'\n\s*\n', text):
            para = para.strip()
            if para and len(para) > 20 and len(categories["other"]) < 5:
                categories["other"].append(para)

    return categories


# ---------------------------------------------------------------------------
# Quality scoring & filtering
# ---------------------------------------------------------------------------

_CATEGORY_TERMS: dict[str, str] = {
    "grammar":   r'grammar|spelling|punctuation|tense|singular|plural|verb|noun',
    "style":     r'style|tone|voice|formal|informal|casual|professional|academic',
    "structure": r'structure|organization|flow|paragraph|section|order|transition',
    "content":   r'content|information|detail|example|evidence|argument|idea',
    "clarity":   r'clarity|clear|concise|readable|understandable|confusing|ambiguous',
}

_GENERIC_PATTERNS = [
    r'consider (revising|reviewing)',
    r'(try to|make sure to) be (more|less)',
    r'this (section|paragraph|sentence) (could|might|may) benefit from',
    r'it (would|might) be (better|good|helpful)',
]


def _score_suggestion(suggestion: str, category: str) -> float:
    """Return a quality score in [0, 1] for a single suggestion."""
    if not suggestion or len(suggestion) < 15:
        return 0.0

    score = 0.5

    length = len(suggestion)
    if 30 <= length <= 300:
        score += 0.1
    elif length > 300:
        score -= 0.1
    else:
        score -= 0.1

    if re.search(r'(for example|such as|e\.g\.|specifically|")', suggestion, re.IGNORECASE):
        score += 0.15

    if re.search(r'(change|replace|use|add|remove|consider|rewrite|revise)', suggestion, re.IGNORECASE):
        score += 0.15

    terms = _CATEGORY_TERMS.get(category, "")
    if terms and re.search(terms, suggestion, re.IGNORECASE):
        score += 0.2

    for pat in _GENERIC_PATTERNS:
        if re.search(pat, suggestion, re.IGNORECASE):
            score -= 0.15
            break

    return min(1.0, max(0.0, score))


def _filter_by_quality(categories: dict[str, list], threshold: float = 0.5) -> dict[str, list]:
    """Keep only suggestions that meet the quality threshold (always keep at least one)."""
    result = {}
    for cat, items in categories.items():
        passed = [s for s in items if _score_suggestion(s, cat) >= threshold]
        if not passed and items:
            # Keep the single best even if below threshold
            passed = [max(items, key=lambda s: _score_suggestion(s, cat))]
        result[cat] = passed
    return result


# ---------------------------------------------------------------------------
# Chunking & caching helpers
# ---------------------------------------------------------------------------

def _cache_key(content: str, document_type: str, tone: str, model: str) -> str:
    return f"{hash(content)}_{document_type}_{tone}_{model}"


def _chunk_content(content: str) -> list[str]:
    """Split long content into overlapping paragraph-aware chunks."""
    if len(content) <= MAX_CHUNK_SIZE:
        return [content]

    paragraphs = re.split(r'\n\s*\n', content)
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if current and len(current) + len(para) > MAX_CHUNK_SIZE:
            chunks.append(current)
            current = current[-CHUNK_OVERLAP:] + "\n\n" + para if len(current) > CHUNK_OVERLAP else para
        else:
            current = (current + "\n\n" + para).strip() if current else para

    if current:
        chunks.append(current)

    return chunks


def _resolve_content(content: str, cache_key: str) -> tuple[str, bool]:
    """
    Return (content_to_process, is_chunk).
    For long content, returns only the most representative chunk.
    """
    if cache_key in _suggestion_cache:
        _debug(f"Cache hit for key: {cache_key}")
        # Return cached result signal — caller should handle if needed
        # (cache is checked inside generate_suggestions before calling this)

    if len(content) <= MAX_CHUNK_SIZE:
        return content, False

    _debug(f"Content is {len(content)} chars — chunking.")
    chunks = _chunk_content(content)
    _debug(f"Split into {len(chunks)} chunks; processing chunk 1.")
    return chunks[0], True


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(_error("No input provided. Pass a JSON string as the first argument."))
        sys.exit(1)

    try:
        input_data = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        print(_error(f"Invalid JSON input: {exc}"))
        sys.exit(1)

    out = generate_suggestions(input_data)
    print(out)
    try:
        parsed = json.loads(out)
        if isinstance(parsed, dict) and parsed.get("error"):
            sys.exit(1)
    except (json.JSONDecodeError, TypeError):
        sys.exit(1)