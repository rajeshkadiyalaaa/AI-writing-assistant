#!/usr/bin/env python
"""
generate_response.py
Generate AI writing assistant responses using the OpenRouter API.

Usage:
    python generate_response.py '<json_input>'

JSON Input Schema:
    {
        "messages": [{"role": "user"|"assistant", "content": str}],  # Required
        "model": str,         # Optional: OpenRouter model ID (default: DEFAULT_MODEL env var)
        "documentType": str,  # Optional: "general"|"email"|"academic"|"business"|"creative" (default: "general")
        "tone": str,          # Optional: e.g. "professional" (default: "professional")
        "temperature": float, # Optional: sampling temperature (default: TEMPERATURE env var or 0.7)
        "max_tokens": int     # Optional: max response tokens (default: MAX_TOKENS env var or 1000)
    }

Environment Variables:
    OPENROUTER_API_KEY  — Required. Your OpenRouter API key.
    DEFAULT_MODEL       — Optional. Override the default model.
    TEMPERATURE         — Optional. Default sampling temperature (default: 0.7).
    MAX_TOKENS          — Optional. Default max tokens (default: 1000).
"""

import json
import os
import sys
import time

import requests
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------

# Search up to 3 directory levels for a .env file
_here = os.path.abspath(__file__)
for _levels in range(1, 4):
    _candidate = os.path.normpath(
        os.path.join(os.path.dirname(_here), *(['..'] * _levels), '.env')
    )
    if os.path.exists(_candidate):
        load_dotenv(dotenv_path=_candidate)
        break
else:
    load_dotenv()

try:
    from utils import (
        estimate_tokens,
        estimate_context_window,
        enrich_ai_response,
    )
    _UTILS_AVAILABLE = True
except ImportError:
    _UTILS_AVAILABLE = False

from openrouter_response import extract_assistant_text

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL      = os.getenv("DEFAULT_MODEL", "openrouter/free")
DEFAULT_TEMPERATURE = float(os.getenv("TEMPERATURE", 0.7))
DEFAULT_MAX_TOKENS  = int(os.getenv("MAX_TOKENS", 1000))

# Document-type addenda (layered on top of writing_skills — still human, not robotic)
_DOC_TYPE_INSTRUCTIONS: dict[str, str] = {
    "email": """
- Write emails like a real person: greeting, point, sign-off — no template stiffness.
- Get to the point; one clear ask if needed.
- Match how people actually email, not marketing copy.""",

    "academic": """
- Sound like a capable student or researcher, not an AI essay generator.
- Use discipline terms when needed, but keep sentences human and direct.
- Arguments can be clear without "moreover" / "furthermore" transitions.
- Citations only if the user asks for them.""",

    "business": """
- Clear and actionable, but not buzzword-heavy corporate speak.
- Say what matters; skip executive-summary padding unless asked.
- Numbers and facts are fine — just say them plainly.""",

    "creative": """
- Vivid and specific beats flowery. Show, don't lecture.
- Let rhythm and voice vary; imperfect phrasing is okay.
- Stay in character or POV when writing fiction or narrative.""",

    "general": """
- Match what the user is trying to do; don't over-structure the answer.
- Helpful beats thorough. Say the useful part first when it fits.""",
}

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------

def _debug(msg: str) -> None:
    print(f"[generate_response] {msg}", file=sys.stderr)

def _error(msg: str, details: str = "") -> str:
    payload: dict = {"error": msg}
    if details:
        payload["details"] = details
    _debug(f"Error: {msg}")
    return json.dumps(payload, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def generate_response(data: dict) -> str:
    """
    Generate an AI writing assistant response via OpenRouter.

    Returns:
        JSON string with the assistant response and optional enrichment data,
        or a structured error.
    """
    from utils import sanitize_api_key

    api_key = sanitize_api_key(os.getenv("OPENROUTER_API_KEY"))
    if not api_key:
        return _error("OPENROUTER_API_KEY not found in environment variables.")

    _debug(f"API key found: {api_key[:5]}…")

    # ------------------------------------------------------------------
    # Parse input
    # ------------------------------------------------------------------
    messages: list[dict]  = data.get("messages", [])
    if not messages:
        return _error("No messages provided.")

    model: str        = data.get("model", DEFAULT_MODEL)
    document_type: str = data.get("documentType", "general")
    tone: str         = data.get("tone", "professional")
    temperature: float = float(data.get("temperature", DEFAULT_TEMPERATURE))
    max_tokens: int   = int(data.get("max_tokens", DEFAULT_MAX_TOKENS))

    original_prompt: str = messages[-1].get("content", "") if messages else ""

    _debug(f"model={model} | doc_type={document_type} | tone={tone} | temp={temperature}")

    # ------------------------------------------------------------------
    # Build system message
    # ------------------------------------------------------------------
    system_content = _build_system_prompt(document_type, tone, temperature)
    system_message = {"role": "system", "content": system_content}

    # ------------------------------------------------------------------
    # Context window management
    # ------------------------------------------------------------------
    if _UTILS_AVAILABLE:
        context_window = estimate_context_window(model)
        token_budget   = max(context_window * 0.8, 2000)
        current_tokens = estimate_tokens(system_content)
    else:
        token_budget   = 6000
        current_tokens = len(system_content) // 4  # rough estimate

    full_messages: list[dict] = [system_message]
    truncated = False

    for msg in reversed(messages):
        if msg.get("role") not in ("user", "assistant"):
            continue
        msg_tokens = (
            estimate_tokens(msg.get("content", ""))
            if _UTILS_AVAILABLE
            else len(msg.get("content", "")) // 4
        )
        if current_tokens + msg_tokens < token_budget:
            full_messages.insert(1, msg)
            current_tokens += msg_tokens
        else:
            truncated = True
            break

    if truncated and len(full_messages) == 1:
        full_messages.insert(1, {
            "role": "system",
            "content": "Note: The conversation history is extensive. Focusing on the most recent messages.",
        })

    _debug(f"Sending {len(full_messages)} messages (~{current_tokens} tokens)")

    if data.get("prepareOnly"):
        return json.dumps({
            "messages": full_messages,
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }, ensure_ascii=False)

    # ------------------------------------------------------------------
    # API call
    # ------------------------------------------------------------------
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-writing-assistant.vercel.app",
        "X-Title": "AI Writing Assistant",
    }

    payload = {
        "model":             model,
        "messages":          full_messages,
        "temperature":       temperature,
        "max_tokens":        max_tokens,
        "top_p":             0.9,
        "frequency_penalty": 0.5,
        "presence_penalty":  0.5,
    }

    call_result = _call_with_retry(headers, payload)
    if isinstance(call_result, dict) and call_result.get("fatal"):
        return _error(call_result["error"], call_result.get("details") or "")
    if call_result is None:
        return _error(
            "Failed to get a response from OpenRouter after multiple retries, "
            "or the model returned no text — try another model or simplify the prompt."
        )

    assistant_response = call_result["content"]

    # ------------------------------------------------------------------
    # Build result
    # ------------------------------------------------------------------
    result: dict = {"response": assistant_response}
    if call_result.get("usage"):
        result["usage"] = call_result["usage"]

    if _UTILS_AVAILABLE:
        try:
            enriched = enrich_ai_response(assistant_response, original_prompt)
            quality  = enriched["quality_metrics"]
            result.update({
                "statistics":   enriched["statistics"],
                "quality_score": quality.get("overall_quality_score"),
                "enhanced_data": {
                    "structured_content": enriched["structured_data"],
                    "statistics":         enriched["statistics"],
                    "quality_metrics":    quality,
                    "metadata":           enriched["metadata"],
                },
            })
            if quality.get("overall_quality_score", 1.0) < 0.7:
                result["quality_warnings"] = quality.get("potential_issues", [])
        except Exception as exc:
            _debug(f"enrich_ai_response failed: {exc}")

    return json.dumps(result, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_system_prompt(document_type: str, tone: str, temperature: float) -> str:
    from writing_skills import tone_guidance, writing_voice_block

    doc_instructions = _DOC_TYPE_INSTRUCTIONS.get(document_type, _DOC_TYPE_INSTRUCTIONS["general"])
    creativity_note  = (
        "lean a bit more playful and exploratory"
        if temperature > 0.7
        else "stay tight and direct"
    )
    voice = writing_voice_block(extra=tone_guidance(tone))
    return f"""{voice}

You help with {document_type} writing. Every reply you write (drafts, rewrites, explanations) must sound like the WRITING VOICE above — regardless of which model is answering.

DOCUMENT TYPE ({document_type.upper()}):
{doc_instructions}

HOW TO HELP:
- Answer the actual question; don't pad or lecture.
- If you rewrite text, the rewrite must follow WRITING VOICE — not "AI polish."
- Refer back to earlier messages when it helps; keep it conversational.
- Only use bullet lists if the user explicitly asked for a list.

Temperature: {temperature} — {creativity_note}."""


# ---------------------------------------------------------------------------
# HTTP with retry
# ---------------------------------------------------------------------------

def _call_with_retry(
    headers: dict,
    payload: dict,
    max_retries: int = 3,
    base_delay: float = 2.0,
) -> dict | None:
    """POST to OpenRouter with exponential-backoff retry.

    Returns:
        {"content", "usage?"} on success,
        {"fatal": True, "error", "details?"} for non-retryable API errors,
        None if retries exhausted or the model returned 200 with no extractable text.
    """
    delay = base_delay

    for attempt in range(1, max_retries + 1):
        _debug(f"API attempt {attempt}/{max_retries}")
        try:
            resp = requests.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload,
                timeout=60,
            )
            _debug(f"Status: {resp.status_code}")

            if resp.status_code == 200:
                data = resp.json()
                content = _extract_content(data)
                if content is None:
                    _debug("OpenRouter returned 200 but no extractable assistant text.")
                    return None
                return {"content": content, "usage": data.get("usage")}

            if resp.status_code in (401, 404):
                clip = (resp.text or "")[:500]
                if resp.status_code == 401:
                    return {
                        "fatal": True,
                        "error": "OpenRouter rejected the API key (401). Verify your API key in Settings or .env.",
                        "details": clip,
                    }
                return {
                    "fatal": True,
                    "error": f'Model not available (404): {payload.get("model", "")}',
                    "details": clip,
                }

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

    out = generate_response(input_data)
    print(out)
    try:
        parsed = json.loads(out)
        if isinstance(parsed, dict) and parsed.get("error"):
            sys.exit(1)
    except (json.JSONDecodeError, TypeError):
        sys.exit(1)