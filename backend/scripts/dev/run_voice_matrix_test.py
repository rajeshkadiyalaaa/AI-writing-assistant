#!/usr/bin/env python3
"""
Run the same sample text through generate_response.py across document types,
tones, and creativity (temperature) levels. Writes TEST_REPORT.md at repo root.

Usage (from repo root):
  python3 backend/scripts/dev/run_voice_matrix_test.py
  python3 backend/scripts/dev/run_voice_matrix_test.py --live
  python3 backend/scripts/dev/run_voice_matrix_test.py --live --quick

Requires OPENROUTER_API_KEY in repo-root .env or environment for --live.
Without --live, builds prompt-only analysis (no API calls).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = SCRIPT_DIR.parent
REPO_ROOT = SCRIPTS_DIR.parent.parent
SAMPLE_PATH = SCRIPT_DIR / "fixtures" / "sample_input.txt"
GENERATE_SCRIPT = SCRIPTS_DIR / "generate_response.py"
REPORT_PATH = REPO_ROOT / "TEST_REPORT.md"

DOCUMENT_TYPES = ["general", "email", "academic", "business", "creative"]
TONES = ["professional", "casual", "formal"]
CREATIVITY_LEVELS = [
    ("low", 0.3),
    ("medium", 0.7),
    ("high", 1.0),
]

USER_PROMPT_TEMPLATE = (
    "Rewrite the sample text below for the given document context. "
    "Keep the same facts; adjust style and structure only.\n\n"
    "---\n{sample}\n---"
)

BANNED_PHRASES = [
    "delve",
    "nuanced",
    "it's worth noting",
    "comprehensive",
    "in conclusion",
    "moreover",
    "furthermore",
    "i'd be happy to",
    "certainly!",
    "absolutely!",
    "great question",
    "to summarize",
    "in summary",
    "overall",
    "it's important to note",
    "utilize",
    "facilitate",
    "leverage",
]


@dataclass
class CaseResult:
    document_type: str
    tone: str
    creativity_label: str
    temperature: float
    status: str
    duration_ms: int
    word_count: int
    banned_hits: list[str]
    quality_score: float | None
    response_preview: str
    error: str
    system_prompt_chars: int


def load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    for path in (REPO_ROOT / ".env", REPO_ROOT / "backend" / ".env"):
        if path.is_file():
            load_dotenv(path, override=False)


def read_sample() -> str:
    return SAMPLE_PATH.read_text(encoding="utf-8").strip()


def _subprocess_env() -> dict[str, str]:
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    sys.path.insert(0, str(SCRIPTS_DIR))
    try:
        from utils import sanitize_api_key

        key = sanitize_api_key(os.getenv("OPENROUTER_API_KEY"))
        if key:
            env["OPENROUTER_API_KEY"] = key
    finally:
        if sys.path[0] == str(SCRIPTS_DIR):
            sys.path.pop(0)
    return env


def run_generate(payload: dict) -> tuple[dict | None, str, int]:
    """Invoke generate_response.py; return (parsed_json, stderr, duration_ms)."""
    t0 = time.perf_counter()
    proc = subprocess.run(
        [sys.executable, str(GENERATE_SCRIPT), json.dumps(payload)],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
        env=_subprocess_env(),
    )
    duration_ms = int((time.perf_counter() - t0) * 1000)
    stderr = proc.stderr or ""
    stdout = (proc.stdout or "").strip()
    if proc.returncode != 0 and not stdout:
        return None, stderr or f"exit code {proc.returncode}", duration_ms
    try:
        return json.loads(stdout), stderr, duration_ms
    except json.JSONDecodeError:
        return None, stderr or stdout[:500], duration_ms


def analyze_text(text: str) -> tuple[int, list[str]]:
    lower = text.lower()
    hits = [p for p in BANNED_PHRASES if p in lower]
    words = len(re.findall(r"\b[\w']+\b", text))
    return words, hits


def build_cases(quick: bool) -> list[tuple[str, str, str, float]]:
    doc_types = ["general"] if quick else DOCUMENT_TYPES
    cases = []
    for doc in doc_types:
        for tone in TONES:
            for label, temp in CREATIVITY_LEVELS:
                cases.append((doc, tone, label, temp))
    return cases


def run_matrix(*, live: bool, quick: bool, model: str | None) -> list[CaseResult]:
    sample = read_sample()
    user_message = USER_PROMPT_TEMPLATE.format(sample=sample)
    messages = [{"role": "user", "content": user_message}]
    results: list[CaseResult] = []

    for doc_type, tone, creativity_label, temperature in build_cases(quick):
        payload = {
            "messages": messages,
            "documentType": doc_type,
            "tone": tone,
            "temperature": temperature,
            "max_tokens": 400,
            "prepareOnly": not live,
        }
        if model:
            payload["model"] = model

        data, stderr, duration_ms = run_generate(payload)

        if data is None:
            results.append(
                CaseResult(
                    doc_type,
                    tone,
                    creativity_label,
                    temperature,
                    "error",
                    duration_ms,
                    0,
                    [],
                    None,
                    "",
                    stderr[:300],
                    0,
                )
            )
            continue

        if data.get("error"):
            results.append(
                CaseResult(
                    doc_type,
                    tone,
                    creativity_label,
                    temperature,
                    "error",
                    duration_ms,
                    0,
                    [],
                    None,
                    "",
                    str(data.get("error")),
                    0,
                )
            )
            continue

        if not live:
            sys_msgs = [m for m in data.get("messages", []) if m.get("role") == "system"]
            sys_len = len(sys_msgs[0].get("content", "")) if sys_msgs else 0
            results.append(
                CaseResult(
                    doc_type,
                    tone,
                    creativity_label,
                    temperature,
                    "prompt_only",
                    duration_ms,
                    0,
                    [],
                    None,
                    "(no API call — prepareOnly)",
                    "",
                    sys_len,
                )
            )
            continue

        response = data.get("response") or ""
        words, banned = analyze_text(response)
        preview = response[:500] + ("…" if len(response) > 500 else "")
        results.append(
            CaseResult(
                doc_type,
                tone,
                creativity_label,
                temperature,
                "ok",
                duration_ms,
                words,
                banned,
                data.get("quality_score"),
                preview,
                "",
                0,
            )
        )
        time.sleep(0.5)

    return results


def render_report(results: list[CaseResult], *, live: bool, quick: bool, model: str) -> str:
    sample = read_sample()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    ok = sum(1 for r in results if r.status == "ok")
    errors = sum(1 for r in results if r.status == "error")
    mode = "live API" if live else "prompt-only (prepareOnly)"

    lines = [
        "# Scribe Voice Matrix Test Report",
        "",
        f"- **Generated:** {now}",
        f"- **Mode:** {mode}",
        f"- **Model:** `{model or os.getenv('DEFAULT_MODEL', 'openrouter/free')}`",
        f"- **Matrix:** {len(DOCUMENT_TYPES if not quick else ['general'])} document type(s) × "
        f"{len(TONES)} tones × {len(CREATIVITY_LEVELS)} creativity levels = **{len(results)} cases**",
        f"- **Results:** {ok} ok, {errors} errors, {len(results) - ok - errors} prompt-only",
        "",
        "## Sample input (fixed for all cases)",
        "",
        "```",
        sample,
        "```",
        "",
        "## User prompt (fixed for all cases)",
        "",
        "```",
        USER_PROMPT_TEMPLATE.format(sample=sample[:200] + ("…" if len(sample) > 200 else "")),
        "```",
        "",
        "## Creativity levels",
        "",
        "| Label | Temperature |",
        "|-------|-------------|",
    ]
    for label, temp in CREATIVITY_LEVELS:
        lines.append(f"| {label} | {temp} |")

    lines.extend(
        [
            "",
            "## Summary table",
            "",
            "| Document | Tone | Creativity | Temp | Status | ms | Words | Banned hits | Quality |",
            "|----------|------|------------|------|--------|-----|-------|-------------|---------|",
        ]
    )
    for r in results:
        banned = ", ".join(r.banned_hits[:3]) if r.banned_hits else "—"
        if len(r.banned_hits) > 3:
            banned += f" (+{len(r.banned_hits) - 3})"
        q = f"{r.quality_score:.2f}" if r.quality_score is not None else "—"
        lines.append(
            f"| {r.document_type} | {r.tone} | {r.creativity_label} | {r.temperature} | "
            f"{r.status} | {r.duration_ms} | {r.word_count or '—'} | {banned} | {q} |"
        )

    if live:
        lines.extend(["", "## Response excerpts (live runs)", ""])
        for r in results:
            if r.status != "ok":
                continue
            lines.extend(
                [
                    f"### {r.document_type} / {r.tone} / {r.creativity_label} (temp={r.temperature})",
                    "",
                    f"- Words: {r.word_count} | Banned phrases: {r.banned_hits or 'none'}",
                    "",
                    "```",
                    r.response_preview,
                    "```",
                    "",
                ]
            )
    else:
        lines.extend(
            [
                "",
                "## System prompt sizes (prepareOnly)",
                "",
                "Shows how document type, tone, and temperature shape the system prompt without calling OpenRouter.",
                "",
                "| Document | Tone | Creativity | System prompt chars |",
                "|----------|------|------------|---------------------|",
            ]
        )
        for r in results:
            lines.append(
                f"| {r.document_type} | {r.tone} | {r.creativity_label} | {r.system_prompt_chars} |"
            )

    lines.extend(
        [
            "",
            "## Errors",
            "",
        ]
    )
    err_rows = [r for r in results if r.status == "error"]
    if not err_rows:
        lines.append("_None._")
    else:
        for r in err_rows:
            lines.append(f"- **{r.document_type} / {r.tone} / {r.creativity_label}:** {r.error}")

    lines.extend(
        [
            "",
            "## How to re-run",
            "",
            "```bash",
            "# Prompt-only (no API key):",
            "python3 backend/scripts/dev/run_voice_matrix_test.py",
            "",
            "# Full live matrix (needs OPENROUTER_API_KEY in repo-root .env):",
            "python3 backend/scripts/dev/run_voice_matrix_test.py --live",
            "",
            "# Smaller matrix (general only):",
            "python3 backend/scripts/dev/run_voice_matrix_test.py --live --quick",
            "```",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Voice matrix test for Scribe writing assistant")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Call OpenRouter (requires OPENROUTER_API_KEY). Default is prepareOnly only.",
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Only test documentType=general (9 cases instead of 45).",
    )
    parser.add_argument("--model", default=None, help="OpenRouter model id override")
    parser.add_argument(
        "--output",
        default=str(REPORT_PATH),
        help="Report file path (default: repo root TEST_REPORT.md)",
    )
    args = parser.parse_args()

    load_env()
    if args.live and not os.getenv("OPENROUTER_API_KEY"):
        print(
            "ERROR: --live requires OPENROUTER_API_KEY in repo-root .env or environment.",
            file=sys.stderr,
        )
        return 1

    print(f"Running {len(build_cases(args.quick))} cases ({'live' if args.live else 'prompt-only'})…")
    results = run_matrix(live=args.live, quick=args.quick, model=args.model)
    report = render_report(
        results,
        live=args.live,
        quick=args.quick,
        model=args.model or os.getenv("DEFAULT_MODEL", "openrouter/free"),
    )
    out = Path(args.output)
    out.write_text(report, encoding="utf-8")
    print(f"Wrote {out}")
    return 0 if not any(r.status == "error" for r in results) else 2


if __name__ == "__main__":
    sys.exit(main())
