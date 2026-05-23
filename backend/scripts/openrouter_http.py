"""Shared OpenRouter HTTP call with retries and structured error codes."""

from __future__ import annotations

import time

import requests

from openrouter_errors import (
    API_KEY,
    EMPTY_RESPONSE,
    MODEL_UNAVAILABLE,
    RATE_LIMIT,
    fatal_result,
)
from openrouter_response import extract_assistant_text

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


def call_openrouter(
    headers: dict,
    payload: dict,
    *,
    max_retries: int = 3,
    base_delay: float = 2.0,
    timeout: int = 60,
    log=None,
) -> dict | None:
    """
    POST to OpenRouter with exponential-backoff retry.

    Returns:
        {"content", "usage?"} on success,
        {"fatal": True, "code", "error", "details?"} for non-retryable failures,
        None if retries exhausted without a classified error (rare).
    """
    delay = base_delay
    model = payload.get("model", "")
    saw_rate_limit = False
    rate_limit_attempts = 0
    max_rate_limit_retries = 1

    def _parse_retry_after(resp) -> int:
        raw = resp.headers.get("Retry-After") or resp.headers.get("retry-after")
        if not raw:
            return 0
        try:
            return min(max(int(float(raw)), 0), 120)
        except (TypeError, ValueError):
            return 0

    def _log(msg: str) -> None:
        if log:
            log(msg)

    for attempt in range(1, max_retries + 1):
        _log(f"API attempt {attempt}/{max_retries}")
        try:
            resp = requests.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload,
                timeout=timeout,
            )
            _log(f"Status: {resp.status_code}")

            if resp.status_code == 200:
                data = resp.json()
                content = extract_assistant_text(data)
                if content is None:
                    _log("OpenRouter returned 200 but no extractable assistant text.")
                    return fatal_result(EMPTY_RESPONSE, model=model)
                return {"content": content, "usage": data.get("usage")}

            if resp.status_code == 401:
                clip = (resp.text or "")[:500]
                return fatal_result(API_KEY, details=clip)

            if resp.status_code == 404:
                clip = (resp.text or "")[:500]
                return fatal_result(MODEL_UNAVAILABLE, model=model, details=clip)

            if resp.status_code == 429:
                saw_rate_limit = True
                rate_limit_attempts += 1
                if rate_limit_attempts <= max_rate_limit_retries:
                    wait_s = max(_parse_retry_after(resp), 10, delay)
                    _log(f"Rate limited. Waiting {wait_s}s before one retry …")
                    time.sleep(wait_s)
                    delay = min(delay * 2, 60)
                    continue
                return fatal_result(RATE_LIMIT, model=model)

            _log(f"Unexpected {resp.status_code}: {(resp.text or '')[:200]}")
            if attempt < max_retries:
                time.sleep(delay)
                delay *= 2

        except requests.Timeout:
            _log(f"Timeout on attempt {attempt}.")
            if attempt < max_retries:
                time.sleep(delay)
                delay *= 2

        except (requests.ConnectionError, requests.RequestException) as exc:
            _log(f"Request error: {exc}")
            if attempt < max_retries:
                time.sleep(delay)
                delay *= 2

    if saw_rate_limit:
        return fatal_result(RATE_LIMIT, model=model)
    return None
