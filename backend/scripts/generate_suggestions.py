#!/usr/bin/env python
import json
import sys
import os
import requests
import re
import time
import random
import traceback
import nltk
from dotenv import load_dotenv
from utils import (
    enrich_ai_response,
    parse_structured_response,
    analyze_response_statistics,
    evaluate_response_quality,
    safe_tokenize,
    estimate_tokens,
    extract_key_topics,
    detect_content_type,
    parse_response,
    extract_json,
    format_traceback,
    is_valid_json
)

# Load environment variables with explicit path
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
print(f"Debug - Looking for .env at: {dotenv_path}", file=sys.stderr)
load_dotenv(dotenv_path=dotenv_path)

def generate_suggestions(input_data, num_retries=3):
    """
    Generate writing suggestions based on content, document type, tone, and length.
    
    Args:
        input_data: Dictionary containing the input data
        num_retries: Number of retries for API calls
        
    Returns:
        Dictionary containing the generated suggestions
    """
    try:
        # Get API keys
        openai_api_key = os.environ.get("OPENAI_API_KEY", "")
        openrouter_api_key = os.environ.get("OPENROUTER_API_KEY", "")
        
        if not openrouter_api_key and not openai_api_key:
            return {"error": "Missing API keys. Please set OPENROUTER_API_KEY or OPENAI_API_KEY in your environment variables."}
        
        # Use OpenRouter API key if available, otherwise fallback to OpenAI
        api_key = openrouter_api_key if openrouter_api_key else openai_api_key
        
        # Extract parameters from input data
        content = input_data.get("content", "").strip()
        if not content:
            return {"error": "No content provided"}
        
        document_type = input_data.get("document_type", "")
        tone = input_data.get("tone", "")
        model = input_data.get("model", "anthropic/claude-3-opus:beta")
        
        # Set temperature based on model (use lower temperature for more deterministic results)
        temperature = 0.7
        
        # Print debug information
        print(f"Content length: {len(content)} characters", file=sys.stderr)
        print(f"Estimated tokens: {estimate_tokens(content)}", file=sys.stderr)
        print(f"Document type: {document_type}", file=sys.stderr)
        print(f"Tone: {tone}", file=sys.stderr)
        print(f"Model: {model}", file=sys.stderr)
        
        # Detect content type if not provided
        if not document_type:
            document_type = detect_content_type(content)
            print(f"Detected document type: {document_type}", file=sys.stderr)
        
        # Extract key topics for better prompting
        try:
            topics = extract_key_topics(content)
            topics_text = ", ".join(topics[:5]) if topics else "general topics"
            print(f"Key topics: {topics_text}", file=sys.stderr)
        except Exception as e:
            print(f"Error extracting topics: {str(e)}", file=sys.stderr)
            topics_text = "general topics"
        
        # Use safe tokenization to determine length statistics
        try:
            sentences = safe_tokenize(content)
            num_sentences = len(sentences)
            avg_sentence_length = sum(len(s.split()) for s in sentences) / max(1, num_sentences)
            print(f"Number of sentences: {num_sentences}", file=sys.stderr)
            print(f"Average sentence length: {avg_sentence_length:.1f} words", file=sys.stderr)
        except Exception as e:
            print(f"Error analyzing content: {str(e)}", file=sys.stderr)
            num_sentences = 1
            avg_sentence_length = 20
        
        # Check cache and handle chunking for long content
        processed_chunk = process_with_chunking_and_caching(content, document_type, tone, model)
        if processed_chunk and processed_chunk != content:
            # If we got a chunk back instead of full content, use it
            print(f"Debug - Using processed chunk: {len(processed_chunk)} chars", file=sys.stderr)
            content = processed_chunk
            # Flag that we're processing a chunk, not the full content
            is_chunk = True
        else:
            is_chunk = False
        
        # Determine appropriate suggestion depth based on content length
        content_length = len(content)
        suggestion_depth = "detailed"
        if content_length < 200:
            suggestion_depth = "basic"
        elif content_length > 2000:
            suggestion_depth = "comprehensive"
        
        # Select optimal model configuration based on content type and length
        top_p = 0.9        # Default top_p
        frequency_penalty = 0.3
        presence_penalty = 0.3
        
        # Optimize parameters based on document type
        if document_type in ['academic', 'technical', 'scientific']:
            # More precise, factual output for academic/technical content
            temperature = 0.3
            top_p = 0.85
            frequency_penalty = 0.2
        elif document_type in ['creative', 'narrative', 'marketing']:
            # More creative output for creative/marketing content
            temperature = 0.7
            top_p = 0.95
            frequency_penalty = 0.4
            presence_penalty = 0.4
        elif document_type in ['email', 'business', 'formal']:
            # Balanced output for business content
            temperature = 0.5
            top_p = 0.9
            frequency_penalty = 0.3
        
        # Further adjust for content length
        if content_length > 3000:
            # Slightly more deterministic for longer content
            temperature = max(0.2, temperature - 0.1)
        
        # Adjust max tokens based on content length
        max_tokens = 2000  # Default
        if content_length > 5000:
            max_tokens = 3000
        elif content_length < 500:
            max_tokens = 1500
        
        print(f"Debug - Optimized parameters: temp={temperature}, top_p={top_p}, max_tokens={max_tokens}", file=sys.stderr)
        
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
- Begin each category with the exact heading from above (e.g., "GRAMMAR:", "STYLE:", etc.)
- Under each category, provide specific, numbered suggestions
- For each suggestion, include:
  * The specific issue or area for improvement
  * Why it matters
  * A concrete example of how to implement the change
- Keep suggestions actionable and precise
- IMPORTANT: If there are no issues in a category, explicitly state "No issues found in this category."

ADDITIONAL GUIDELINES:
- Focus on providing substantive, helpful feedback rather than general comments
- Consider the purpose and audience for {document_type} content
- Tailor your suggestions to support a {tone} tone
- Provide 3-5 suggestions per category for balanced feedback
- Use professional, supportive language in your assessment

HERE ARE EXAMPLES OF HIGH-QUALITY SUGGESTIONS:

EXAMPLE 1:
GRAMMAR:
1. There's a subject-verb agreement error in paragraph 2: "The team of researchers were" should be "The team of researchers was" since "team" is a singular collective noun.
2. Inconsistent use of Oxford commas throughout the document. For consistency and clarity, either use them in all lists or omit them entirely.

EXAMPLE 2:
STYLE:
1. The opening paragraph uses passive voice extensively ("It was determined that..."). For a more engaging {tone} tone, use active voice: "The researchers determined that..."
2. The vocabulary level varies significantly throughout the document. For a consistent {document_type} style, maintain a {tone} vocabulary level. For example, replace "utilize" with "use" and "commence" with "begin" for a more accessible tone.

EXAMPLE 3:
CLARITY:
1. The sentence "The implementation of the methodology facilitated the achievement of the anticipated outcomes" is unnecessarily complex. Simplify to: "The method helped achieve the expected results."
2. The paragraph about data collection procedures contains excessive jargon. Consider defining technical terms or replacing them with more accessible alternatives to improve readability.
"""

        # Prepare the request with model-specific adjustments
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
        
        # Create model-specific payloads
        if "nvidia/llama-3.1-nemotron-nano" in model:
            print(f"Debug - Detected Nvidia Llama model, using optimized parameters", file=sys.stderr)
            # Optimize for Nvidia Llama models
            payload = {
                "model": model,
                "prompt": f"<|system|>\n{system_message}\n<|user|>\nPlease analyze this {document_type} content and provide specific improvement suggestions:\n\n{content}\n<|assistant|>",
                "temperature": temperature,
                "max_tokens": max_tokens,
                "top_p": top_p,
                "stop": ["<|user|>", "<|system|>"],
                "frequency_penalty": frequency_penalty,
                "presence_penalty": presence_penalty
            }
        else:
            # Standard format for other models
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "top_p": top_p,
                "frequency_penalty": frequency_penalty,
                "presence_penalty": presence_penalty
            }
        
        print(f"Debug - Using model: {model} for suggestions", file=sys.stderr)
        print(f"Debug - Payload format: {'prompt-based' if 'prompt' in payload else 'messages-based'}", file=sys.stderr)
        
        # For nvidia models, use a different endpoint if needed
        api_endpoint = "https://openrouter.ai/api/v1/chat/completions"
        if "nvidia/llama-3.1-nemotron-nano" in model:
            # Check if we need to use a different endpoint for this model
            # Some providers require model-specific endpoints
            print(f"Debug - Using standard API endpoint for Nvidia model: {api_endpoint}", file=sys.stderr)
        
        # Implement retry logic
        retry_delay = 2
        
        for attempt in range(num_retries):
            try:
                print(f"Debug - Attempt {attempt+1} to generate suggestions", file=sys.stderr)
                response = requests.post(
                    api_endpoint,
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                
                print(f"Debug - API response status: {response.status_code}", file=sys.stderr)
                if response.status_code == 404:
                    print(f"Debug - 404 error: API endpoint not found. Full response: {response.text}", file=sys.stderr)
                    return json.dumps({
                        "error": "API endpoint not found (404). Please check the OpenRouter API URL.",
                        "details": response.text
                    })
                
                if response.status_code == 401:
                    print(f"Debug - 401 error: Authentication failed. Full response: {response.text}", file=sys.stderr)
                    return json.dumps({
                        "error": "Authentication failed (401). Please check your OpenRouter API key.",
                        "details": "Your API key may be invalid or expired. Get a new key at https://openrouter.ai/keys"
                    })
                
                if response.status_code == 200:
                    response_data = response.json()
                    
                    # Debug the complete response for troubleshooting
                    print(f"Debug - Raw API response: {response_data}", file=sys.stderr)
                    
                    # Extract the assistant's message with robust error handling
                    try:
                        choices = response_data.get('choices', [])
                        if not choices or len(choices) == 0:
                            print(f"Warning: Response doesn't contain 'choices' array or it's empty", file=sys.stderr)
                            # Try alternative response formats
                            print(f"Attempting to extract content from alternative response formats...", file=sys.stderr)
                            suggestions = handle_alternative_response_formats(response_data)
                        else:
                            message = choices[0].get('message', {})
                            if not message:
                                print(f"Warning: Response doesn't contain 'message' in the first choice", file=sys.stderr)
                                # Try alternative response formats
                                suggestions = handle_alternative_response_formats(response_data)
                            else:
                                suggestions = message.get('content', '')
                                if not suggestions:
                                    print(f"Warning: Response doesn't contain 'content' in the message", file=sys.stderr)
                                    # Try alternative response formats
                                    suggestions = handle_alternative_response_formats(response_data)
                    except Exception as e:
                        print(f"Exception when extracting suggestions from response: {str(e)}", file=sys.stderr)
                        print(f"Response data structure: {response_data.keys() if hasattr(response_data, 'keys') else 'Not a dictionary'}", file=sys.stderr)
                        # Try alternative response formats as a last resort
                        suggestions = handle_alternative_response_formats(response_data)
                    
                    # Apply enhanced response processing
                    enriched_response = enrich_ai_response(suggestions, content[:300])  # Using the first 300 chars of content as context
                    
                    # Parse suggestions into categories
                    parsed_suggestions = parse_suggestions_improved(suggestions)
                    
                    # Apply quality filtering to suggestions
                    filtered_suggestions = filter_suggestions_by_quality(parsed_suggestions, quality_threshold=0.45)
                    
                    # Prepare enhanced response data
                    result = {
                        "suggestions": filtered_suggestions,
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
                    
                    # Add information about chunking if applicable
                    if is_chunk:
                        result["processing_info"] = {
                            "chunked": True,
                            "total_length": len(input_data.get('content', '')),
                            "processed_length": len(content),
                            "chunk_ratio": round(len(content) / len(input_data.get('content', '')) * 100, 1)
                        }
                    
                    # Cache the result if it's a full document analysis
                    if not is_chunk and len(content) > 500:  # Only cache substantial content
                        cache_key = get_suggestion_cache_key(content, document_type, tone, model)
                        suggestion_cache[cache_key] = filtered_suggestions
                        print(f"Debug - Cached suggestions with key: {cache_key}", file=sys.stderr)
                    
                    # Add quality warnings if quality is below threshold
                    if enriched_response["quality_metrics"]["overall_quality_score"] < 0.7:
                        result["quality_warnings"] = enriched_response["quality_metrics"]["potential_issues"]
                    
                    return json.dumps(result)
                # Handle rate limiting
                elif response.status_code == 429:
                    if attempt < num_retries - 1:
                        print(f"Rate limited. Retrying in {retry_delay} seconds...", file=sys.stderr)
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        error_detail = response.text
                        print(f"API rate limit exceeded: {error_detail}", file=sys.stderr)
                        return json.dumps({
                            "error": "API rate limit exceeded. Please try again later.",
                            "details": error_detail
                        })
                else:
                    return json.dumps({
                        "error": f"API request failed with status code {response.status_code}",
                        "details": response.text
                    })
            
            except requests.RequestException as req_err:
                if attempt < num_retries - 1:
                    print(f"Request error: {str(req_err)}. Retrying...", file=sys.stderr)
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                else:
                    print(f"Request failed after {num_retries} attempts: {str(req_err)}", file=sys.stderr)
                    return json.dumps({"error": f"Request error after retries: {str(req_err)}"})
                
    except Exception as e:
        return json.dumps({
            "error": f"Exception occurred: {str(e)}"
        })

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

def score_suggestion_quality(suggestion, category):
    """
    Score the quality of a suggestion based on specificity, actionability, and relevance.
    Returns a score from 0-1, where higher is better.
    """
    if not suggestion or len(suggestion) < 15:
        return 0.0
    
    score = 0.5  # Base score
    
    # Factor 1: Length - longer suggestions tend to be more detailed
    # But not too long, as that might be unfocused
    length = len(suggestion)
    if 30 <= length <= 300:
        score += 0.1
    elif length > 300:
        score -= 0.1  # Too verbose
    elif length < 30:
        score -= 0.1  # Too short
    
    # Factor 2: Specificity - look for concrete examples, numbers, quotes
    if re.search(r'(for example|such as|e\.g\.|i\.e\.|specifically|\"|\'\').*', suggestion, re.IGNORECASE):
        score += 0.15
    
    # Factor 3: Actionability - look for action-oriented language
    if re.search(r'(change|replace|use|add|remove|consider|rewrite|restructure|revise).*', suggestion, re.IGNORECASE):
        score += 0.15
    
    # Factor 4: Relevance to category
    category_terms = {
        'grammar': r'(grammar|spelling|punctuation|tense|singular|plural|verb|noun|adjective|adverb)',
        'style': r'(style|tone|voice|formal|informal|casual|professional|academic|concise|verbose)',
        'structure': r'(structure|organization|flow|paragraph|section|order|sequence|transition)',
        'content': r'(content|information|detail|example|evidence|argument|point|idea|concept)',
        'clarity': r'(clarity|clear|concise|readable|understandable|confusing|ambiguous)'
    }
    
    if category in category_terms and re.search(category_terms[category], suggestion, re.IGNORECASE):
        score += 0.2
    
    # Factor 5: Penalize generic suggestions
    generic_patterns = [
        r'consider (revising|reviewing)',
        r'(try to|make sure to) be (more|less)',
        r'this (section|paragraph|sentence) (could|might|may) benefit from',
        r'it (would|might) be (better|good|helpful)'
    ]
    
    for pattern in generic_patterns:
        if re.search(pattern, suggestion, re.IGNORECASE):
            score -= 0.15
            break
    
    return min(1.0, max(0.0, score))  # Clamp between 0 and 1

def filter_suggestions_by_quality(categories, quality_threshold=0.5):
    """
    Filter out low-quality suggestions from each category
    """
    filtered_categories = {}
    for category, suggestions in categories.items():
        # Score and filter suggestions
        quality_suggestions = []
        for suggestion in suggestions:
            quality_score = score_suggestion_quality(suggestion, category)
            if quality_score >= quality_threshold:
                quality_suggestions.append(suggestion)
        
        # Always keep at least one suggestion per category if available
        if not quality_suggestions and suggestions:
            # Find the highest quality suggestion even if below threshold
            best_suggestion = max(suggestions, key=lambda s: score_suggestion_quality(s, category))
            quality_suggestions.append(best_suggestion)
        
        filtered_categories[category] = quality_suggestions
    
    return filtered_categories

def chunk_content(content, max_chunk_size=3000, overlap=300):
    """
    Split long content into overlapping chunks for more efficient processing
    """
    if len(content) <= max_chunk_size:
        return [content]
    
    # Find natural break points (paragraphs)
    paragraphs = re.split(r'\n\s*\n', content)
    
    chunks = []
    current_chunk = ""
    
    for paragraph in paragraphs:
        # If adding this paragraph exceeds max size, store current chunk and start new one
        if len(current_chunk) + len(paragraph) > max_chunk_size and current_chunk:
            chunks.append(current_chunk)
            # Start new chunk with overlap from previous chunk
            if len(current_chunk) > overlap:
                # Use the last bit of the previous chunk for context overlap
                current_chunk = current_chunk[-overlap:] + "\n\n" + paragraph
            else:
                current_chunk = paragraph
        else:
            if current_chunk:
                current_chunk += "\n\n" + paragraph
            else:
                current_chunk = paragraph
    
    # Add the last chunk if not empty
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks

def get_suggestion_cache_key(content, document_type, tone, model):
    """
    Generate a cache key based on input parameters
    """
    # Use a hash of the content to avoid long keys
    content_hash = str(hash(content))
    return f"{content_hash}_{document_type}_{tone}_{model}"

# Simple in-memory cache for demonstration
suggestion_cache = {}

def process_with_chunking_and_caching(content, document_type, tone, model):
    """
    Process content with chunking and caching for improved performance
    """
    # Check cache first
    cache_key = get_suggestion_cache_key(content, document_type, tone, model)
    if cache_key in suggestion_cache:
        print(f"Debug - Using cached suggestions for {cache_key}", file=sys.stderr)
        return suggestion_cache[cache_key]
    
    # For short content, process directly
    if len(content) <= 3000:
        return None  # Signal to process normally
    
    print(f"Debug - Processing long content ({len(content)} chars) with chunking", file=sys.stderr)
    
    # Chunk the content
    chunks = chunk_content(content)
    print(f"Debug - Split into {len(chunks)} chunks", file=sys.stderr)
    
    # Process each chunk separately
    all_suggestions = {
        "grammar": [],
        "style": [],
        "structure": [],
        "content": [],
        "clarity": [],
        "other": []
    }
    
    # We'll only process a subset of chunks to save API calls
    # Choose strategic chunks: first, middle, and last for best coverage
    chunks_to_process = []
    if len(chunks) == 2:
        chunks_to_process = chunks  # Process both if only 2
    elif len(chunks) > 2:
        chunks_to_process = [
            chunks[0],  # First chunk
            chunks[len(chunks) // 2],  # Middle chunk
            chunks[-1]  # Last chunk
        ]
    
    # Process each selected chunk
    for i, chunk in enumerate(chunks_to_process):
        print(f"Debug - Processing chunk {i+1} of {len(chunks_to_process)}", file=sys.stderr)
        # This is a placeholder - the actual API call would happen inside generate_suggestions
        # For now, we'll just return this to signal the main function which chunk to process
        if i == 0:  # Only return the first chunk for actual processing
            result = chunk
            break
    
    # Cache the results for future use (would be populated after actual processing)
    # suggestion_cache[cache_key] = all_suggestions
    
    return result  # Return the first chunk to process

def handle_alternative_response_formats(response_data):
    """
    Handle alternative response formats that OpenRouter might return
    depending on the underlying model provider
    """
    # Try different known response formats
    
    # Format 1: OpenAI-style format (most common)
    if 'choices' in response_data and isinstance(response_data['choices'], list) and len(response_data['choices']) > 0:
        choice = response_data['choices'][0]
        if 'message' in choice and 'content' in choice['message']:
            return choice['message']['content']
        elif 'text' in choice:  # Some models return direct text
            return choice['text']
            
    # Format 2: Direct output in 'output' field
    if 'output' in response_data:
        if isinstance(response_data['output'], str):
            return response_data['output']
        elif isinstance(response_data['output'], dict) and 'text' in response_data['output']:
            return response_data['output']['text']
    
    # Format 3: Response directly in 'response' field
    if 'response' in response_data:
        if isinstance(response_data['response'], str):
            return response_data['response']
    
    # Format 4: Some models use 'generations' format
    if 'generations' in response_data and isinstance(response_data['generations'], list) and len(response_data['generations']) > 0:
        generation = response_data['generations'][0]
        if 'text' in generation:
            return generation['text']
        elif 'content' in generation:
            return generation['content']
    
    # Format 5: Anthropic-style format
    if 'completion' in response_data:
        return response_data['completion']
        
    # Format 6: Simplified output
    if 'output_text' in response_data:
        return response_data['output_text']
    
    # If nothing found, look for any key that might contain the response text
    text_field_candidates = ['text', 'content', 'message', 'result', 'answer']
    for field in text_field_candidates:
        if field in response_data and isinstance(response_data[field], str):
            return response_data[field]
    
    # Last resort: return all keys found in the response
    keys_found = str(list(response_data.keys()))
    return f"Could not extract suggestion text. Response keys found: {keys_found}"

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