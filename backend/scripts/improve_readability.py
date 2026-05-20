#!/usr/bin/env python
import json
import sys
import os
import requests
from dotenv import load_dotenv
import time

# Search up to 3 directory levels for repo-root .env (same as generate_response.py)
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

from utils import sanitize_api_key
from openrouter_response import extract_assistant_text

_API_DETAIL_MAX = 500


def _clip_detail(text, limit=_API_DETAIL_MAX):
    """Truncate provider error bodies for JSON + logs (never log secrets)."""
    if not text:
        return ""
    s = str(text).strip().replace("\n", " ")
    return s if len(s) <= limit else s[: limit - 1] + "…"


def _debug(msg: str) -> None:
    print(f"[improve_readability] {msg}", file=sys.stderr)


def improve_readability(data):
    """
    Improve the readability of the provided content based on specified parameters
    """
    api_key = sanitize_api_key(os.getenv('OPENROUTER_API_KEY'))
    
    if not api_key:
        _debug("OPENROUTER_API_KEY missing in environment")
        return json.dumps({
            "error": "OpenRouter API key not found in environment variables"
        })
    
    # Extract parameters from the input data
    content = data.get('content', '')
    selected_text = (data.get('selectedText') or '').strip()
    target_audience = data.get('targetAudience', 'general')  # general, technical, academic, etc.
    reading_level = data.get('readingLevel', 'intermediate')  # simple, intermediate, advanced
    additional_instructions = data.get('additionalInstructions', '')
    model = data.get('model', os.getenv('DEFAULT_MODEL', 'openrouter/free'))
    is_selection = bool(selected_text)

    if not content:
        return json.dumps({
            "error": "No content provided for readability improvement"
        })
    
    # Map reading levels to approximate grade levels
    reading_level_mapping = {
        "simple": "elementary school (grades 3-5)",
        "intermediate": "middle school to high school (grades 6-12)",
        "advanced": "college or professional level"
    }
    
    grade_level = reading_level_mapping.get(reading_level, "middle school to high school (grades 6-12)")
    
    from writing_skills import readability_voice_note, writing_voice_block

    voice = writing_voice_block(extra=readability_voice_note())
    system_message = f"""{voice}

Rewrite the user's text so it's easier to read — still the same meaning, still the WRITING VOICE.

Target audience: {target_audience}
Reading level: {reading_level} ({grade_level})

How to improve readability:
- Shorter sentences where the original is tangled; keep some variety.
- Plain words instead of jargon when you can.
- Active voice when it sounds natural — don't flatten every sentence.
- Paragraph breaks where they'd help scanning.
- Do NOT turn it into formal essay tone or AI polish.

Additional instructions: {additional_instructions}

Output only the rewritten text — no intro, no "here's the improved version", no bullet lists unless the source used them."""

    if is_selection:
        context_snippet = content[:2500] + ("…" if len(content) > 2500 else "")
        user_message = f"""Improve ONLY the passage below. Return ONLY the improved passage — same meaning, better readability. Do not return the full document.

---PASSAGE TO IMPROVE---
{selected_text}
---END PASSAGE---

Surrounding document (context only — do not rewrite all of this):
{context_snippet}"""
    else:
        user_message = f"Please improve the readability of this content:\n\n{content}"
    
    # Prepare the request
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-writing-assistant.vercel.app",
        "X-Title": "AI Writing Assistant"
    }

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message},
    ]
    
    # Create model-specific payloads
    if "nvidia/llama-3.1-nemotron-nano" in model:
        # Optimize for Nvidia Llama models
        payload = {
            "model": model,
            "prompt": f"<|system|>\n{system_message}\n<|user|>\n{user_message}\n<|assistant|>",
            "temperature": float(os.getenv('TEMPERATURE', 0.7)),
            "max_tokens": int(os.getenv('MAX_TOKENS', 1000)),
            "top_p": 0.9,
            "stop": ["<|user|>", "<|system|>"]
        }
    else:
        # Standard format for other models
        payload = {
            "model": model,
            "messages": messages,
            "temperature": float(os.getenv('TEMPERATURE', 0.7)),
            "max_tokens": int(os.getenv('MAX_TOKENS', 1000))
        }
    
    # For nvidia models, use a different endpoint if needed
    api_endpoint = "https://openrouter.ai/api/v1/chat/completions"
    
    try:
        # Implement retry logic
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    api_endpoint,
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                
                if response.status_code == 404:
                    _debug("OpenRouter returned 404")
                    return json.dumps({
                        "error": "API endpoint not found (404). Please check the OpenRouter API URL.",
                        "details": _clip_detail(response.text),
                    })
                
                if response.status_code == 401:
                    _debug("OpenRouter returned 401")
                    return json.dumps({
                        "error": "Authentication failed (401). Please check your OpenRouter API key.",
                        "details": "Your API key may be invalid or expired. Get a new key at https://openrouter.ai/keys",
                    })
                
                if response.status_code == 200:
                    response_data = response.json()
                    
                    # Extract the assistant's message with better error handling
                    try:
                        improved_content = extract_assistant_text(response_data)
                        
                        if not improved_content:
                            _debug("Failed to extract assistant content from OpenRouter response")
                            return json.dumps({
                                "error": "Failed to extract improved content from API response",
                                "details": "The response format was unexpected. Please try again or try a different model."
                            })
                        
                        return json.dumps({
                            "improved_content": improved_content,
                            "is_selection": is_selection,
                            "original_word_count": len((selected_text if is_selection else content).split()),
                            "improved_word_count": len(improved_content.split()),
                            "usage": response_data.get('usage', {})
                        })
                    except Exception as e:
                        print(f"Exception when extracting content from response: {str(e)}", file=sys.stderr)
                        return json.dumps({
                            "error": f"Error processing API response: {str(e)}",
                            "details": "Please try again with different content or a different model."
                        })
                # Handle rate limiting
                elif response.status_code == 429:
                    if attempt < max_retries - 1:
                        print(f"Rate limited. Retrying in {retry_delay} seconds...", file=sys.stderr)
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        error_detail = response.text
                        print(f"API rate limit exceeded: {error_detail}", file=sys.stderr)
                        return json.dumps({
                            "error": "API rate limit exceeded. Please try again later.",
                            "details": _clip_detail(error_detail),
                        })
                else:
                    error_message = f"API request failed with status code {response.status_code}"
                    _debug(error_message)
                    return json.dumps({
                        "error": error_message,
                        "details": _clip_detail(response.text),
                    })
            except requests.RequestException as req_err:
                if attempt < max_retries - 1:
                    print(f"Request error: {str(req_err)}. Retrying...", file=sys.stderr)
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                else:
                    print(f"Request failed after {max_retries} attempts: {str(req_err)}", file=sys.stderr)
                    return json.dumps({"error": f"Request error after retries: {str(req_err)}"})
    except Exception as e:
        error_message = f"Exception occurred: {str(e)}"
        print(f"Debug - Error: {error_message}", file=sys.stderr)
        
        return json.dumps({
            "error": error_message
        })

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input data provided"}))
        sys.exit(1)
    try:
        input_data = json.loads(sys.argv[1])
        result = improve_readability(input_data)
        print(result)
        try:
            payload = json.loads(result)
            if isinstance(payload, dict) and payload.get("error"):
                sys.exit(1)
        except (json.JSONDecodeError, TypeError):
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Failed to process input: {str(e)}"}))
        sys.exit(1)