#!/usr/bin/env python
import json
import sys
import os
import requests
import re
import time
import hashlib
from dotenv import load_dotenv
from utils import (
    enrich_ai_response,
    parse_structured_response,
    analyze_response_statistics,
    evaluate_response_quality
)

# Load environment variables with explicit path
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
print(f"Debug - Looking for .env at: {dotenv_path}", file=sys.stderr)
load_dotenv(dotenv_path=dotenv_path)

# Add a simple cache mechanism
suggestion_cache = {}
CACHE_EXPIRY = 3600  # Cache expires after 1 hour

# Define custom error types for better error handling
class APIError(Exception):
    """Base class for API related errors"""
    def __init__(self, message, status_code=None, details=None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)

class AuthenticationError(APIError):
    """Raised when API key is invalid or missing"""
    pass

class RateLimitError(APIError):
    """Raised when rate limits are hit"""
    pass

class ContentPolicyError(APIError):
    """Raised for content policy violations"""
    pass

class ServerError(APIError):
    """Raised for server-side errors"""
    pass

def generate_suggestions(data):
    """
    Generate writing suggestions based on the provided content
    """
    try:
        api_key = os.getenv('OPENROUTER_API_KEY')
        
        if not api_key:
            print(f"Error: OpenRouter API key not found in environment variables", file=sys.stderr)
            raise AuthenticationError("OpenRouter API key not found in environment variables")
        
        # Extract parameters from the input data
        content = data.get('content', '')
        document_type = data.get('documentType', 'general')
        tone = data.get('tone', 'professional')
        model = data.get('model', os.getenv('DEFAULT_MODEL', 'nvidia/llama-3.1-nemotron-nano-8b-v1:free'))
        
        print(f"Debug - Processing suggestion request with model: {model}", file=sys.stderr)
        
        if not content:
            raise ValueError("No content provided for generating suggestions")
            
        # Generate cache key based on content and parameters
        cache_key = generate_cache_key(content, document_type, tone, model)
        
        # Check cache first
        cached_result = check_cache(cache_key)
        if cached_result:
            print(f"Debug - Using cached suggestions for key: {cache_key[:10]}...", file=sys.stderr)
            return cached_result
            
        # Determine appropriate suggestion depth based on content length
        content_length = len(content)
        suggestion_depth = "detailed"
        if content_length < 200:
            suggestion_depth = "basic"
        elif content_length > 2000:
            suggestion_depth = "comprehensive"
        
        # Select appropriate model based on content complexity
        if content_length > 3000 and ":" not in model:  # Don't override if specific model requested
            # For longer content, recommend a model with larger context window if available
            large_context_models = [
                "anthropic/claude-3-opus-20240229",
                "anthropic/claude-3-sonnet-20240229",
                "google/gemini-pro",
                "meta-llama/llama-3-70b-instruct"
            ]
            for better_model in large_context_models:
                if os.getenv(f"USE_{better_model.replace('/', '_').upper()}", "false").lower() == "true":
                    print(f"Debug - Upgrading to larger context model: {better_model} for long content", file=sys.stderr)
                    model = better_model
                    break
        
        # Adjust temperature based on document type
        # Lower temperature for technical/academic content, higher for creative
        temperature = 0.5  # Default
        if document_type in ['technical', 'academic', 'scientific']:
            temperature = 0.3  # More precise/deterministic
        elif document_type in ['creative', 'narrative', 'marketing']:
            temperature = 0.7  # More creative/varied
        
        # Adjust other parameters based on content needs
        top_p = 0.9
        frequency_penalty = 0.3
        presence_penalty = 0.3
        
        # For technical documents, reduce variance further
        if document_type in ['technical', 'academic', 'scientific']:
            top_p = 0.8
            frequency_penalty = 0.2
        
        # For creative content, encourage more diverse suggestions
        if document_type in ['creative', 'narrative', 'marketing']:
            frequency_penalty = 0.5
            presence_penalty = 0.5
        
        # Prepare the enhanced system message for suggestions
        system_message = f"""You are an expert writing analyst and editor specializing in {document_type} content with a {tone} tone.

Your task is to analyze the provided text and generate specific, actionable suggestions to improve it.

DOCUMENT TYPE: {document_type}
TONE: {tone}
SUGGESTION DEPTH: {suggestion_depth}

PROVIDE SUGGESTIONS IN THESE EXACT CATEGORIES:
1. GRAMMAR: Identify grammatical errors, spelling mistakes, punctuation issues, and syntax problems.
2. STYLE: Suggest improvements for tone, voice, and style to better match a {tone} tone for {document_type} content.
3. STRUCTURE: Recommend changes to organization, flow, paragraph structure, and overall document architecture.
4. CONTENT: Suggest additions, removals, or modifications to strengthen the substance and message.
5. CLARITY: Identify confusing sections and recommend ways to make them clearer and more concise.

RESPONSE FORMAT REQUIREMENTS:
- You MUST format your response with these exact category headers: "GRAMMAR:", "STYLE:", "STRUCTURE:", "CONTENT:", "CLARITY:"
- Under each category, provide specific, numbered suggestions (1., 2., etc.)
- For each suggestion, include:
  * The specific issue or area for improvement
  * Why it matters
  * A concrete example of how to implement the change
- Keep suggestions actionable and precise
- If there are no issues in a category, explicitly state "No issues found in this category."

EXAMPLE RESPONSE FORMAT:
```
GRAMMAR:
1. Issue: Run-on sentence in paragraph 2.
   Why it matters: Run-on sentences can confuse readers and obscure your main points.
   Suggestion: Split the sentence "The company invested in new technology and the results were impressive" into two sentences: "The company invested in new technology. The results were impressive."

2. Issue: Inconsistent verb tense in the third paragraph.
   Why it matters: Inconsistent tenses confuse readers about the timeline of events.
   Suggestion: Maintain past tense throughout. Change "The market responds positively" to "The market responded positively."

STYLE:
1. Issue: Overly casual language for a {tone} {document_type}.
   Why it matters: The casual tone may undermine your credibility with the target audience.
   Suggestion: Replace phrases like "totally amazing" with more appropriate terms like "significantly beneficial."
```

ADDITIONAL GUIDELINES:
- Focus on providing substantive, helpful feedback rather than general comments
- Consider the purpose and audience for {document_type} content
- Tailor your suggestions to support a {tone} tone
- Provide 3-5 suggestions per category for balanced feedback
- Use professional, supportive language in your assessment
- For technical documents, focus on clarity and precision
- For creative content, balance technical feedback with tone preservation
- For academic writing, emphasize logical structure and evidence use

IMPORTANCE: Following this exact format ensures your suggestions will be correctly processed and displayed to the user.
"""

        # Prepare the request
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai-writing-assistant.vercel.app",  # Update with your actual domain
            "X-Title": "AI Writing Assistant"
        }
        
        print(f"Debug - Using headers: {headers}", file=sys.stderr)
        
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": f"Please analyze this {document_type} content and provide specific improvement suggestions:\n\n{content}"}
        ]
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2000,  # Increased token count for more detailed suggestions
            "top_p": top_p,
            "frequency_penalty": frequency_penalty,
            "presence_penalty": presence_penalty
        }
        
        print(f"Debug - Using model: {model} for suggestions", file=sys.stderr)
        
        try:
            # Implement retry logic
            max_retries = 3
            retry_delay = 2
            
            for attempt in range(max_retries):
                try:
                    print(f"Debug - Attempt {attempt+1} to generate suggestions", file=sys.stderr)
                    response = requests.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json=payload,
                        timeout=30
                    )
                    
                    print(f"Debug - API response status: {response.status_code}", file=sys.stderr)
                    if response.status_code == 404:
                        print(f"Debug - 404 error: API endpoint not found. Full response: {response.text}", file=sys.stderr)
                        raise APIError("API endpoint not found (404). Please check the OpenRouter API URL.", response.status_code, response.text)
                    
                    if response.status_code == 401:
                        print(f"Debug - 401 error: Authentication failed. Full response: {response.text}", file=sys.stderr)
                        raise AuthenticationError("Authentication failed (401). Please check your OpenRouter API key.", response.status_code, response.text)
                    
                    if response.status_code == 200:
                        response_data = response.json()
                        
                        # Extract the assistant's message
                        suggestions = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
                        
                        # Parse suggestions into categories
                        parsed_suggestions = parse_suggestions_improved(suggestions)
                        
                        # Apply quality filtering, scoring, and deduplication
                        enhanced_suggestions = enhance_suggestions_quality(parsed_suggestions, document_type)
                        
                        # Apply enhanced response processing
                        enriched_response = enrich_ai_response(suggestions, content[:300])  # Using the first 300 chars of content as context
                        
                        # Prepare enhanced response data
                        result = {
                            "suggestions": enhanced_suggestions,
                            "raw_suggestions": suggestions,
                            "usage": response_data.get('usage', {}),
                            "model": response_data.get('model', model),
                            "enhanced_data": {
                                "structured_content": enriched_response["structured_data"],
                                "statistics": enriched_response["statistics"],
                                "quality_metrics": enriched_response["quality_metrics"],
                                "metadata": enriched_response["metadata"]
                            }
                        }
                        
                        # Add quality warnings if quality is below threshold
                        if enriched_response["quality_metrics"]["overall_quality_score"] < 0.7:
                            result["quality_warnings"] = enriched_response["quality_metrics"]["potential_issues"]
                        
                        # Add to cache
                        add_to_cache(cache_key, result)
                        
                        return json.dumps(result)
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
                            raise RateLimitError("API rate limit exceeded. Please try again later.", response.status_code, error_detail)
                    else:
                        return json.dumps({
                            "error": f"API request failed with status code {response.status_code}",
                            "details": response.text
                        })
                
                except requests.RequestException as req_err:
                    if attempt < max_retries - 1:
                        print(f"Request error: {str(req_err)}. Retrying...", file=sys.stderr)
                        time.sleep(retry_delay)
                        retry_delay *= 2
                        continue
                    else:
                        print(f"Request failed after {max_retries} attempts: {str(req_err)}", file=sys.stderr)
                        raise APIError(f"Request error after retries: {str(req_err)}", None, str(req_err))
                
        except Exception as e:
            return json.dumps({
                "error": f"Exception occurred: {str(e)}"
            })

    except AuthenticationError as auth_err:
        print(f"Authentication Error: {str(auth_err)}", file=sys.stderr)
        return json.dumps({
            "error": f"Authentication failed: {str(auth_err)}",
            "error_type": "authentication",
            "details": auth_err.details if hasattr(auth_err, 'details') else None
        })
    except RateLimitError as rate_err:
        print(f"Rate Limit Error: {str(rate_err)}", file=sys.stderr)
        return json.dumps({
            "error": f"Rate limit exceeded: {str(rate_err)}",
            "error_type": "rate_limit",
            "details": rate_err.details if hasattr(rate_err, 'details') else None
        })
    except ContentPolicyError as policy_err:
        print(f"Content Policy Error: {str(policy_err)}", file=sys.stderr)
        return json.dumps({
            "error": f"Content policy violation: {str(policy_err)}",
            "error_type": "content_policy",
            "details": policy_err.details if hasattr(policy_err, 'details') else None
        })
    except ValueError as val_err:
        print(f"Value Error: {str(val_err)}", file=sys.stderr)
        return json.dumps({
            "error": str(val_err),
            "error_type": "value_error"
        })
    except Exception as e:
        print(f"Unexpected Error: {str(e)}", file=sys.stderr)
        return json.dumps({
            "error": f"Exception occurred: {str(e)}",
            "error_type": "general_error"
        })

def generate_cache_key(content, document_type, tone, model):
    """Generate a unique cache key based on request parameters"""
    # Use only the first 1000 characters of content to avoid excessive hashing
    content_sample = content[:1000]
    # Create a string combining all parameters
    combined = f"{content_sample}|{document_type}|{tone}|{model}"
    # Create an MD5 hash (good enough for caching purposes)
    return hashlib.md5(combined.encode('utf-8')).hexdigest()

def check_cache(cache_key):
    """Check if we have a cached result for this request"""
    global suggestion_cache
    
    if cache_key in suggestion_cache:
        cache_entry = suggestion_cache[cache_key]
        # Check if cache entry is still valid
        if time.time() - cache_entry['timestamp'] < CACHE_EXPIRY:
            return cache_entry['data']
        else:
            # Clean up expired cache entry
            del suggestion_cache[cache_key]
    
    return None

def add_to_cache(cache_key, data):
    """Add result to cache with timestamp"""
    global suggestion_cache
    
    # Clean up cache if it's getting too large (more than 100 entries)
    if len(suggestion_cache) > 100:
        # Remove oldest entries
        oldest_keys = sorted(suggestion_cache.keys(), 
                            key=lambda k: suggestion_cache[k]['timestamp'])[:20]
        for key in oldest_keys:
            del suggestion_cache[key]
    
    suggestion_cache[cache_key] = {
        'data': data,
        'timestamp': time.time()
    }

def parse_suggestions_improved(text):
    """
    Parse the raw suggestions into a structured format using regex patterns
    for more accurate category detection and suggestion extraction
    """
    # Failsafe: If text is empty or None, return an empty object
    if not text or not isinstance(text, str):
        print(f"Error: Invalid or empty text for parsing: {text}", file=sys.stderr)
        return {
            "grammar": [],
            "style": [],
            "structure": [],
            "content": [],
            "clarity": [],
            "other": ["No valid suggestions could be extracted from the AI response."]
        }
    
    # Print the text for debugging
    print(f"Debug - Parsing suggestions from text: {text[:100]}...", file=sys.stderr)
    
    categories = {
        "grammar": [],
        "style": [],
        "structure": [],
        "content": [],
        "clarity": [],
        "other": []
    }
    
    # First try to detect well-formatted categories with explicit headers
    try:
        # Split text by main category headers
        category_pattern = r'([1-5]?\.\s*)?(?:GRAMMAR|STYLE|STRUCTURE|CONTENT|CLARITY):'
        sections = re.split(category_pattern, text, flags=re.IGNORECASE)
        
        current_category = "other"
        
        # Process each section
        for i in range(1, len(sections), 2):
            section = sections[i].strip() if i < len(sections) else ""
            content = sections[i+1].strip() if i+1 < len(sections) else ""
            
            # Determine category from section header
            if re.search(r'GRAMMAR', section, re.IGNORECASE):
                current_category = "grammar"
            elif re.search(r'STYLE', section, re.IGNORECASE):
                current_category = "style"
            elif re.search(r'STRUCTURE', section, re.IGNORECASE):
                current_category = "structure"
            elif re.search(r'CONTENT', section, re.IGNORECASE):
                current_category = "content"
            elif re.search(r'CLARITY', section, re.IGNORECASE):
                current_category = "clarity"
            
            # Skip if content is empty or indicates no issues
            if not content or re.search(r'no issues? found', content, re.IGNORECASE):
                continue
            
            # Extract individual suggestions using numbered pattern
            suggestions = re.split(r'\n\s*\d+[\.\)]', content)
            
            # Add non-empty suggestions to the appropriate category
            for suggestion in suggestions:
                suggestion = suggestion.strip()
                if suggestion and len(suggestion) > 10:  # Filter out short/empty suggestions
                    categories[current_category].append(suggestion)
    except Exception as e:
        print(f"Error in primary parsing: {str(e)}", file=sys.stderr)
        # Don't return here, try the fallback method
    
    # If parsing failed to identify categories, fall back to simpler keyword-based parsing
    if all(len(suggestions) == 0 for suggestions in categories.values()):
        print("Primary parsing failed to extract suggestions, using fallback parser", file=sys.stderr)
        return fallback_parse_suggestions(text)
    
    # Final validation - if we still have nothing, create a generic suggestion
    if all(len(suggestions) == 0 for suggestions in categories.values()):
        print("Both parsers failed, creating generic suggestion", file=sys.stderr)
        categories["other"].append("The system analyzed your text but couldn't extract specific suggestions. The writing appears to be of good quality, or you may want to provide more text for analysis.")
    
    return categories

def fallback_parse_suggestions(text):
    """
    Simpler parsing method as a fallback if the regex parsing fails
    """
    print(f"Using fallback parser for text: {text[:100]}...", file=sys.stderr)
    
    categories = {
        "grammar": [],
        "style": [],
        "structure": [],
        "content": [],
        "clarity": [],
        "other": []
    }
    
    # If text is too short, extract as a single suggestion
    if len(text) < 100:
        categories["other"].append(text)
        return categories
    
    try:
        current_category = "other"
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Try to identify the category from the line
            lower_line = line.lower()
            
            if re.search(r'grammar|spelling|punctuation|typo', lower_line):
                current_category = "grammar"
            elif re.search(r'style|tone|voice|writing style', lower_line):
                current_category = "style"
            elif re.search(r'structure|organization|flow|paragraph', lower_line):
                current_category = "structure"
            elif re.search(r'content|substance|idea|topic|subject', lower_line):
                current_category = "content"
            elif re.search(r'clarity|clear|concise|understandable|readable', lower_line):
                current_category = "clarity"
            
            # Add the suggestion to the appropriate category
            # Skip category headers and numbered list markers
            if (line and not re.match(r'^(grammar|style|structure|content|clarity|[1-5]\.)', lower_line, re.IGNORECASE)
                and len(line) > 10):
                categories[current_category].append(line)
        
        # Last resort fallback: if no categories were found, treat the entire text as one suggestion
        if all(len(suggestions) == 0 for suggestions in categories.values()):
            print("Fallback parser couldn't identify categories, using whole text", file=sys.stderr)
            # Break the text into paragraphs for better readability
            paragraphs = re.split(r'\n\s*\n', text)
            for paragraph in paragraphs:
                if paragraph.strip() and len(paragraph.strip()) > 20:
                    # Limit to first 5 paragraphs to avoid overwhelming
                    if len(categories["other"]) < 5:
                        categories["other"].append(paragraph.strip())
        
        # If still empty, add a generic suggestion
        if all(len(suggestions) == 0 for suggestions in categories.values()):
            categories["other"].append("Your writing has been analyzed. Consider reviewing for grammar, style, and clarity improvements.")
    
    except Exception as e:
        print(f"Error in fallback parsing: {str(e)}", file=sys.stderr)
        categories["other"].append("An error occurred while analyzing your text. Please try again with different content.")
    
    return categories

def enhance_suggestions_quality(suggestions, document_type):
    """
    Enhance suggestions quality by applying quality scoring, filtering, 
    and deduplication across categories
    """
    print(f"Debug - Enhancing suggestions quality for document type: {document_type}", file=sys.stderr)
    
    # Initialize enhanced suggestions with the same structure
    enhanced_suggestions = {
        "grammar": [],
        "style": [],
        "structure": [],
        "content": [],
        "clarity": [],
        "other": []
    }
    
    # Track all suggestions to check for duplicates
    all_suggestions = []
    
    # Category-specific minimum quality thresholds
    quality_thresholds = {
        "grammar": 0.5,
        "style": 0.6,
        "structure": 0.6,
        "content": 0.7,
        "clarity": 0.6,
        "other": 0.5
    }
    
    # Category-specific processing for each type
    for category, items in suggestions.items():
        for suggestion in items:
            # Skip empty suggestions
            if not suggestion or len(suggestion.strip()) < 15:
                continue
                
            # Calculate quality score for this suggestion
            quality_score = calculate_suggestion_quality(suggestion, category, document_type)
            
            # Only keep high-quality suggestions
            if quality_score >= quality_thresholds.get(category, 0.5):
                # Check for duplicates or very similar suggestions
                if not is_duplicate(suggestion, all_suggestions):
                    # Apply category-specific enhancements
                    enhanced_suggestion = enhance_by_category(suggestion, category, document_type)
                    
                    # Add to the enhanced suggestions
                    enhanced_suggestions[category].append(enhanced_suggestion)
                    
                    # Track for duplicate detection
                    all_suggestions.append(enhanced_suggestion)
    
    # Ensure we have at least one suggestion for better user experience
    if all(len(items) == 0 for items in enhanced_suggestions.values()):
        print("Warning: No suggestions passed quality filters", file=sys.stderr)
        # Add a generic high-quality suggestion
        enhanced_suggestions["other"].append(
            "Consider reviewing your text for clarity and conciseness. Look for opportunities to simplify complex sentences and ensure your main points are clearly communicated."
        )
    
    return enhanced_suggestions

def calculate_suggestion_quality(suggestion, category, document_type):
    """
    Calculate a quality score for a suggestion based on multiple factors
    """
    score = 0.5  # Start with neutral score
    
    # Longer suggestions tend to be more specific and useful (up to a point)
    length = len(suggestion)
    if 30 <= length <= 200:
        score += 0.1
    elif length > 200:
        score += 0.05  # Still good but may be too verbose
    
    # Check for actionability - suggestions with clear actions are better
    action_words = ["change", "replace", "use", "remove", "add", "rewrite", "restructure", 
                   "consider", "incorporate", "eliminate", "improve", "simplify", "clarify"]
    if any(word in suggestion.lower() for word in action_words):
        score += 0.15
    
    # Check for specificity - suggestions with examples are better
    if "example" in suggestion.lower() or ":" in suggestion or '"' in suggestion:
        score += 0.15
    
    # Check for reasoning - suggestions that explain why are better
    reasoning_phrases = ["because", "since", "as", "due to", "reason", "why", "important", "matters"]
    if any(phrase in suggestion.lower() for phrase in reasoning_phrases):
        score += 0.1
    
    # Penalize vague language
    vague_phrases = ["somewhat", "rather", "quite", "very", "maybe", "perhaps", "in general", 
                    "try to", "seem to be", "appears to", "sort of"]
    vague_count = sum(1 for phrase in vague_phrases if phrase in suggestion.lower())
    score -= vague_count * 0.05
    
    # Category-specific scoring adjustments
    if category == "grammar" and any(w in suggestion.lower() for w in ["typo", "spelling", "punctuation", "grammar"]):
        score += 0.1
    elif category == "style" and document_type == "academic" and "formal" in suggestion.lower():
        score += 0.1
    elif category == "content" and document_type == "technical" and "accuracy" in suggestion.lower():
        score += 0.1
    
    # Clamp score to valid range
    return max(0.0, min(1.0, score))

def is_duplicate(suggestion, existing_suggestions, similarity_threshold=0.6):
    """
    Check if a suggestion is too similar to existing ones using basic similarity
    """
    suggestion_lower = suggestion.lower()
    
    for existing in existing_suggestions:
        existing_lower = existing.lower()
        
        # Quick length check first to skip obvious non-duplicates
        if abs(len(suggestion_lower) - len(existing_lower)) / max(len(suggestion_lower), len(existing_lower)) > 0.3:
            continue
        
        # Simple word overlap similarity
        words1 = set(suggestion_lower.split())
        words2 = set(existing_lower.split())
        common_words = words1.intersection(words2)
        
        if len(common_words) / min(len(words1), len(words2)) > similarity_threshold:
            return True
    
    return False

def enhance_by_category(suggestion, category, document_type):
    """
    Apply category-specific enhancements to the suggestion
    """
    if category == "grammar":
        # For grammar, ensure suggestions are precise
        if not any(w in suggestion.lower() for w in ["use", "replace", "change", "remove"]):
            if ":" not in suggestion and '"' not in suggestion:
                # Add clarity if the suggestion doesn't have an example
                suggestion += " For example, review punctuation and sentence structure."
    
    elif category == "style":
        # For style suggestions in academic/technical writing, ensure they emphasize formality
        if document_type in ["academic", "technical"] and "formal" not in suggestion.lower():
            suggestion = suggestion.rstrip('.') + ". Maintain formal academic tone throughout."
    
    elif category == "clarity":
        # For clarity, emphasize conciseness for business/technical docs
        if document_type in ["business", "technical"] and "concise" not in suggestion.lower():
            suggestion = suggestion.rstrip('.') + ". Aim for clarity and conciseness in professional communications."
    
    return suggestion

if __name__ == "__main__":
    # Read the input data from command line argument
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = generate_suggestions(input_data)
            print(result)
        except Exception as e:
            print(json.dumps({
                "error": f"Failed to process input: {str(e)}"
            }))
    else:
        print(json.dumps({
            "error": "No input data provided"
        })) 