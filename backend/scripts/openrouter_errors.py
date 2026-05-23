"""User-facing OpenRouter error codes and messages (shared by Python scripts)."""

from __future__ import annotations

RATE_LIMIT = "RATE_LIMIT"
MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"
EMPTY_RESPONSE = "EMPTY_RESPONSE"
API_KEY = "API_KEY"


def message_for_code(code: str, *, model: str = "") -> str:
    mid = f" ({model})" if model else ""
    if code == RATE_LIMIT:
        return (
            "Rate limited by OpenRouter. Wait a minute, then try again "
            "— or switch to another model in Style."
        )
    if code == MODEL_UNAVAILABLE:
        return f"Free model unavailable (404){mid}. Refresh free models in Style or choose another model."
    if code == EMPTY_RESPONSE:
        return (
            "Model returned no text. Try again, simplify the prompt, "
            "or choose a different model in Style (avoid openrouter/free if errors persist)."
        )
    if code == API_KEY:
        return "OpenRouter rejected the API key (401). Verify your API key in Settings or .env."
    return "OpenRouter request failed. Try again or pick another model in Style."


def fatal_result(code: str, *, model: str = "", details: str = "") -> dict:
    return {
        "fatal": True,
        "code": code,
        "error": message_for_code(code, model=model),
        "details": details,
    }
