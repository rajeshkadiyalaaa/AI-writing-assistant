"""
Shared helpers for parsing OpenRouter / OpenAI-compatible chat completion JSON.
Used by generate_response, generate_suggestions, and improve_readability.
"""

from __future__ import annotations

from typing import Any


def _normalize_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        return s if s else None
    return None


def _message_content_to_text(content: Any) -> str | None:
    """Normalize message.content (string or multimodal parts list)."""
    s = _normalize_str(content)
    if s is not None:
        return s
    if not isinstance(content, list):
        return None
    parts: list[str] = []
    for part in content:
        if isinstance(part, dict):
            t = part.get("text") or part.get("content")
            if isinstance(t, str) and t:
                parts.append(t)
        elif isinstance(part, str) and part:
            parts.append(part)
    joined = "".join(parts).strip()
    return joined if joined else None


def extract_assistant_text(response_data: dict) -> str | None:
    """
    Best-effort extraction of assistant text from a chat completions JSON body.

    Returns None if no usable assistant string was found.
    """
    if not isinstance(response_data, dict):
        return None

    choices = response_data.get("choices")
    if isinstance(choices, list) and len(choices) > 0:
        choice = choices[0]
        if isinstance(choice, dict):
            msg = choice.get("message")
            if isinstance(msg, dict):
                text = _message_content_to_text(msg.get("content"))
                if text is not None:
                    return text
            text = _normalize_str(choice.get("text"))
            if text is not None:
                return text

    out = response_data.get("output")
    if isinstance(out, str):
        return _normalize_str(out)
    if isinstance(out, dict):
        return _normalize_str(out.get("text"))

    r = response_data.get("response")
    if isinstance(r, str):
        return _normalize_str(r)

    generations = response_data.get("generations")
    if isinstance(generations, list) and len(generations) > 0:
        gen = generations[0]
        if isinstance(gen, dict):
            for key in ("text", "content"):
                t = _normalize_str(gen.get(key))
                if t is not None:
                    return t

    comp = response_data.get("completion")
    if isinstance(comp, str):
        return _normalize_str(comp)

    otext = response_data.get("output_text")
    if isinstance(otext, str):
        return _normalize_str(otext)

    for key in ("text", "content", "message", "result", "answer"):
        v = response_data.get(key)
        if isinstance(v, str):
            t = _normalize_str(v)
            if t is not None:
                return t

    return None
