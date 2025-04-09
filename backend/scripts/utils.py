#!/usr/bin/env python
import os
import re
import time
import requests
import json
import sys
import statistics
from typing import Dict, List, Any, Optional, Union, Tuple
import nltk
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

"""
Shared utility functions for AI script operations
"""

def estimate_tokens(text: str) -> int:
    """
    Estimate the number of tokens in a text string.
    This is a simple approximation - about 4 characters per token for English.
    
    Args:
        text: The text to estimate tokens for
        
    Returns:
        Estimated token count
    """
    if not text:
        return 0
    return len(text) // 4

def estimate_context_window(model_id: str) -> int:
    """
    Estimate the context window size based on model ID.
    Returns a conservative estimate of tokens the model can handle.
    
    Args:
        model_id: The ID of the model
        
    Returns:
        Estimated context window size in tokens
    """
    context_windows = {
        'nvidia/llama-3.1-nemotron-nano-8b-v1:free': 8192,
        'openrouter/quasar-alpha': 16384,
        'google/gemini-2.5-pro-exp-03-25:free': 32768,
        'deepseek/deepseek-chat-v3-0324:free': 8192,
        'openai/gpt-4o': 32768,
        'anthropic/claude-3-opus': 32768,
        'anthropic/claude-3-sonnet': 32768,
        'anthropic/claude-3-haiku': 48000,
        'meta-llama/llama-3-70b-instruct': 8192
    }
    
    # Default to a conservative value if model not found
    return context_windows.get(model_id, 4096)

def extract_key_topics(content: str, max_topics: int = 10) -> List[str]:
    """
    Extract key topics from the content using basic frequency analysis
    
    Args:
        content: The text content to analyze
        max_topics: Maximum number of topics to return
        
    Returns:
        List of potential key topics
    """
    # Convert to lowercase and remove common punctuation
    text = content.lower()
    for char in ',."\'!?()[]{}:;':
        text = text.replace(char, ' ')
    
    # Split into words and count frequencies
    words = text.split()
    
    # Filter out common stop words (simplified list)
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 
                 'by', 'about', 'as', 'of', 'from', 'this', 'that', 'these', 'those', 'is', 
                 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 
                 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 
                 'might', 'must', 'it', 'they', 'them', 'their', 'we', 'us', 'our', 'i', 'me', 
                 'my', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'hers'}
    
    # Count word frequencies (excluding stop words and short words)
    word_counts = {}
    for word in words:
        if word not in stop_words and len(word) > 3:
            word_counts[word] = word_counts.get(word, 0) + 1
    
    # Get top words by frequency
    top_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:20]
    
    # Extract potential topics (just the words for simplicity)
    topics = [word for word, count in top_words[:max_topics] if count > 1]
    
    return topics

def detect_content_type(content: str) -> str:
    """
    Attempt to detect the type of content based on patterns and structure
    
    Args:
        content: The text content to analyze
        
    Returns:
        Identified content type
    """
    content_lower = content.lower()
    
    # Check for different content types
    if re.search(r'(abstract|conclusion|methodology|references|cited|journal|doi)', content_lower):
        return "Academic or research content"
    elif re.search(r'(executive\s+summary|project\s+plan|report|quarterly|fiscal|revenue|profit|market|strategy)', content_lower):
        return "Business report or analysis"
    elif re.search(r'(chapter|novel|character|plot|scene|story)', content_lower):
        return "Narrative or creative writing"
    elif re.search(r'(news|reported|according\s+to|yesterday|today|official|statement)', content_lower):
        return "News article or press release"
    elif re.search(r'(click|subscribe|offer|limited\s+time|discount|buy|purchase|product)', content_lower):
        return "Marketing or promotional content"
    elif re.search(r'(steps|guide|how\s+to|tips|tricks|advice|should|recommendation)', content_lower):
        return "Instructional or guide content"
    else:
        return "General informative content"

def api_call_with_retry(
    endpoint: str, 
    payload: Dict[str, Any], 
    headers: Dict[str, str],
    max_retries: int = 3,
    timeout: int = 30
) -> Tuple[Dict[str, Any], int]:
    """
    Make an API call with retry logic for handling rate limits and timeouts
    
    Args:
        endpoint: API endpoint URL
        payload: Request payload
        headers: Request headers
        max_retries: Maximum number of retry attempts
        timeout: Request timeout in seconds
        
    Returns:
        Tuple of (response_data, status_code)
    """
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            response = requests.post(
                endpoint,
                headers=headers,
                json=payload,
                timeout=timeout
            )
            
            if response.status_code == 200:
                return response.json(), response.status_code
                
            # Handle rate limiting
            elif response.status_code == 429:
                if attempt < max_retries - 1:
                    print(f"Rate limited. Retrying in {retry_delay} seconds...", file=sys.stderr)
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    return {
                        "error": "API rate limit exceeded. Please try again later.",
                        "details": response.text
                    }, response.status_code
            else:
                return {
                    "error": f"API request failed with status code {response.status_code}",
                    "details": response.text
                }, response.status_code
                
        except requests.RequestException as req_err:
            if attempt < max_retries - 1:
                print(f"Request error: {str(req_err)}. Retrying...", file=sys.stderr)
                time.sleep(retry_delay)
                retry_delay *= 2
                continue
            else:
                return {
                    "error": f"Request error after retries: {str(req_err)}"
                }, 500
                
    # This should never be reached, but just in case
    return {"error": "Maximum retries exceeded"}, 500

def get_optimal_parameters(model_id: str, task_type: str) -> Dict[str, Any]:
    """
    Get optimal parameters for different models and tasks
    
    Args:
        model_id: The model identifier
        task_type: The type of task (summarize, generate, improve, etc.)
        
    Returns:
        Dictionary of optimal parameters
    """
    # Default parameters
    default_params = {
        "temperature": 0.7,
        "max_tokens": 1000,
        "top_p": 1.0,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0
    }
    
    # Task-specific parameter adjustments
    task_params = {
        "summarize": {
            "temperature": 0.5,
            "max_tokens": 2000,
            "top_p": 0.9,
            "frequency_penalty": 0.3,
            "presence_penalty": 0.3
        },
        "generate": {
            "temperature": 0.7,
            "max_tokens": 1500,
            "top_p": 0.9,
            "frequency_penalty": 0.5,
            "presence_penalty": 0.5
        },
        "improve": {
            "temperature": 0.4,
            "max_tokens": 2000,
            "top_p": 0.8,
            "frequency_penalty": 0.2,
            "presence_penalty": 0.4
        },
        "analyze": {
            "temperature": 0.3,
            "max_tokens": 2000,
            "top_p": 0.8,
            "frequency_penalty": 0.3,
            "presence_penalty": 0.3
        },
        "chat": {
            "temperature": 0.8,
            "max_tokens": 1000,
            "top_p": 0.9,
            "frequency_penalty": 0.6,
            "presence_penalty": 0.6
        }
    }
    
    # Get task-specific parameters
    params = task_params.get(task_type.lower(), default_params).copy()
    
    # Model-specific adjustments
    if 'claude' in model_id.lower():
        # Claude models often need higher temperature
        params['temperature'] += 0.1
    elif 'gpt-4' in model_id.lower():
        # GPT-4 models work well with default parameters
        pass
    elif 'llama' in model_id.lower():
        # Llama models might need more frequency penalty to reduce repetition
        params['frequency_penalty'] += 0.1
    
    return params

def analyze_content_metrics(content: str) -> Dict[str, Any]:
    """
    Analyze content and return useful metrics
    
    Args:
        content: The text content to analyze
        
    Returns:
        Dictionary of content metrics
    """
    # Basic metrics
    words = content.split()
    word_count = len(words)
    char_count = len(content)
    
    # Paragraphs
    paragraphs = content.split('\n\n')
    para_count = len([p for p in paragraphs if p.strip()])
    
    # Sentence analysis
    sentences = re.split(r'[.!?]+', content)
    sentence_count = len([s for s in sentences if s.strip()])
    
    # Average lengths
    avg_sentence_length = round(word_count / max(sentence_count, 1), 1)
    avg_paragraph_length = round(word_count / max(para_count, 1), 1)
    
    # Reading time (average reading speed: 200-250 words per minute)
    reading_time_minutes = round(word_count / 225, 1)
    
    return {
        "word_count": word_count,
        "character_count": char_count,
        "paragraph_count": para_count,
        "sentence_count": sentence_count,
        "avg_sentence_length": avg_sentence_length,
        "avg_paragraph_length": avg_paragraph_length,
        "estimated_reading_time": f"{reading_time_minutes} min"
    }

def parse_structured_response(response_text: str) -> Dict[str, Any]:
    """
    Enhanced parsing of AI response text to identify sections, lists, and structured content.
    
    Args:
        response_text: The raw response text from the AI model
        
    Returns:
        A dictionary with structured components of the response
    """
    # Initialize structure
    structured_response = {
        "main_sections": [],
        "lists": [],
        "code_blocks": [],
        "structured_content": {},
        "original_text": response_text
    }
    
    # Extract main sections (identified by headers)
    section_pattern = r'(?m)^(#{1,3}\s+.+?$|[A-Z][A-Z\s]+:)'
    sections = re.finditer(section_pattern, response_text)
    
    current_pos = 0
    for match in sections:
        section_title = match.group(0).strip()
        start_pos = match.start()
        
        # Add the section to our list
        if start_pos > current_pos:
            structured_response["main_sections"].append({
                "title": section_title.replace('#', '').strip(),
                "start": start_pos,
                "text": response_text[start_pos:].split('\n\n')[0]
            })
        current_pos = start_pos
    
    # Extract lists
    list_patterns = [
        r'(?m)^(\d+\.\s+.+?$(?:\n\d+\.\s+.+?$)*)',  # Numbered lists
        r'(?m)^([*\-+]\s+.+?$(?:\n[*\-+]\s+.+?$)*)'  # Bulleted lists
    ]
    
    for pattern in list_patterns:
        lists = re.finditer(pattern, response_text, re.MULTILINE)
        for match in lists:
            list_text = match.group(0)
            list_items = re.findall(r'(?m)^(?:\d+\.|[*\-+])\s+(.+?)$', list_text)
            structured_response["lists"].append({
                "type": "numbered" if pattern.startswith(r'(?m)^\d') else "bulleted",
                "items": list_items,
                "raw_text": list_text
            })
    
    # Extract code blocks
    code_blocks = re.finditer(r'```(?:\w+)?\n(.*?)\n```', response_text, re.DOTALL)
    for match in code_blocks:
        structured_response["code_blocks"].append({
            "language": match.group(1).split('\n')[0] if match.group(1).split('\n')[0] else "generic",
            "code": match.group(1),
            "start": match.start(),
            "end": match.end()
        })
    
    # Look for structured content patterns like JSON or key-value pairs
    kv_pattern = r'(?m)^(\w+(?:[A-Z]\w*)*|[A-Z][A-Z_]+):\s+(.+?)$'
    kv_matches = re.finditer(kv_pattern, response_text)
    
    for match in kv_matches:
        key = match.group(1).strip()
        value = match.group(2).strip()
        structured_response["structured_content"][key] = value
    
    return structured_response

def analyze_response_statistics(response_text: str) -> Dict[str, Any]:
    """
    Perform detailed statistical analysis on the generated response.
    
    Args:
        response_text: The raw response text from the AI model
        
    Returns:
        A dictionary of statistical metrics about the response
    """
    # Tokenize the text for more accurate analysis
    try:
        sentences = nltk.sent_tokenize(response_text)
    except:
        # Fallback if NLTK fails
        sentences = re.split(r'[.!?]+', response_text)
        sentences = [s.strip() for s in sentences if s.strip()]
    
    words = response_text.split()
    
    # Calculate sentence and word statistics
    sentence_lengths = [len(s.split()) for s in sentences]
    word_lengths = [len(w) for w in words]
    
    # Calculate basic statistics
    stats = {
        "sentence_count": len(sentences),
        "word_count": len(words),
        "avg_sentence_length": round(sum(sentence_lengths) / max(len(sentence_lengths), 1), 1),
        "median_sentence_length": round(statistics.median(sentence_lengths) if sentence_lengths else 0, 1),
        "avg_word_length": round(sum(word_lengths) / max(len(word_lengths), 1), 1),
        "unique_words": len(set(w.lower() for w in words)),
        "lexical_diversity": round(len(set(w.lower() for w in words)) / max(len(words), 1), 3),
    }
    
    # Advanced metrics
    if len(sentence_lengths) > 1:
        stats["sentence_length_variance"] = round(statistics.variance(sentence_lengths), 2)
        stats["sentence_length_std_dev"] = round(statistics.stdev(sentence_lengths), 2)
    
    # Content type detection
    content_types = {
        "explanatory": len(re.findall(r'\b(explain|because|reason|therefore|thus|hence|due to)\b', response_text, re.IGNORECASE)),
        "instructional": len(re.findall(r'\b(step|guide|how to|follow|instruction|process)\b', response_text, re.IGNORECASE)),
        "analytical": len(re.findall(r'\b(analyze|analysis|evaluate|assessment|compare|contrast)\b', response_text, re.IGNORECASE)),
        "persuasive": len(re.findall(r'\b(should|recommend|suggest|advise|best|better|improve)\b', response_text, re.IGNORECASE))
    }
    
    dominant_type = max(content_types.items(), key=lambda x: x[1])
    stats["content_type_indicators"] = content_types
    stats["dominant_content_type"] = dominant_type[0] if dominant_type[1] > 0 else "informative"
    
    return stats

def evaluate_response_quality(response_text: str, prompt_text: str = None, expected_outputs: List[str] = None) -> Dict[str, Any]:
    """
    Evaluate the quality of the AI response against various metrics.
    
    Args:
        response_text: The raw response text from the AI model
        prompt_text: Optional original prompt for contextual evaluation
        expected_outputs: Optional list of expected elements in the response
        
    Returns:
        Dictionary of quality metrics
    """
    quality_metrics = {
        "relevance_score": 0.0,
        "coherence_score": 0.0,
        "completeness_score": 0.0,
        "structure_score": 0.0,
        "overall_quality_score": 0.0,
        "potential_issues": []
    }
    
    # Structure evaluation
    has_clear_structure = bool(re.search(r'(?m)^(#{1,3}\s+.+?$|[A-Z][A-Z\s]+:)', response_text))
    has_paragraphs = len([p for p in response_text.split('\n\n') if p.strip()]) > 1
    has_lists = bool(re.search(r'(?m)^(\d+\.\s+|\*\s+|\-\s+)', response_text))
    
    quality_metrics["structure_score"] = calculate_score([
        has_clear_structure * 0.4,
        has_paragraphs * 0.3,
        has_lists * 0.3
    ])
    
    # Coherence evaluation
    sentences = nltk.sent_tokenize(response_text) if 'nltk' in sys.modules else re.split(r'[.!?]+', response_text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    coherence_indicators = {
        "connective_words": len(re.findall(r'\b(however|therefore|additionally|furthermore|moreover|in addition|consequently|thus|hence|nevertheless)\b', response_text, re.IGNORECASE)),
        "pronoun_consistency": check_pronoun_consistency(sentences),
        "logical_flow": check_logical_flow(sentences)
    }
    
    quality_metrics["coherence_score"] = calculate_score([
        min(coherence_indicators["connective_words"] / 5, 1) * 0.3,
        coherence_indicators["pronoun_consistency"] * 0.3,
        coherence_indicators["logical_flow"] * 0.4
    ])
    
    # Completeness evaluation
    completeness_score = 0.7  # Base score assuming reasonable completeness
    
    # If expected outputs were provided, check for their presence
    if expected_outputs:
        matched_outputs = 0
        for expected in expected_outputs:
            if re.search(rf'\b{re.escape(expected)}\b', response_text, re.IGNORECASE):
                matched_outputs += 1
        
        if expected_outputs:
            completeness_score = matched_outputs / len(expected_outputs)
    
    quality_metrics["completeness_score"] = completeness_score
    
    # Relevance evaluation (if prompt was provided)
    if prompt_text:
        # Extract key terms from prompt
        prompt_terms = set(extract_key_terms(prompt_text))
        response_terms = set(extract_key_terms(response_text))
        
        # Calculate term overlap
        if prompt_terms:
            term_overlap = len(prompt_terms.intersection(response_terms)) / len(prompt_terms)
            quality_metrics["relevance_score"] = min(term_overlap * 1.5, 1.0)  # Scale up but cap at 1.0
        else:
            quality_metrics["relevance_score"] = 0.7  # Default without prompt analysis
    else:
        quality_metrics["relevance_score"] = 0.7  # Default without prompt
    
    # Check for potential issues
    quality_metrics["potential_issues"] = identify_quality_issues(response_text)
    
    # Calculate overall quality score (weighted average of other scores)
    quality_metrics["overall_quality_score"] = calculate_score([
        quality_metrics["relevance_score"] * 0.25,
        quality_metrics["coherence_score"] * 0.25,
        quality_metrics["completeness_score"] * 0.25,
        quality_metrics["structure_score"] * 0.25
    ])
    
    return quality_metrics

def extract_key_terms(text: str) -> List[str]:
    """Extract key terms from text, filtering out common words"""
    # Basic tokenization and filtering
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    stop_words = {'about', 'above', 'after', 'again', 'against', 'all', 'and', 'any', 'are', 'because', 
                 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'can', 'did', 'does', 
                 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 
                 'have', 'having', 'here', 'how', 'into', 'itself', 'just', 'more', 'most', 'not', 
                 'now', 'only', 'other', 'our', 'over', 'same', 'should', 'some', 'such', 'than', 
                 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 
                 'through', 'under', 'until', 'very', 'was', 'were', 'what', 'when', 'where', 'which', 
                 'while', 'who', 'with', 'your'}
    
    return [w for w in words if w not in stop_words]

def check_pronoun_consistency(sentences: List[str]) -> float:
    """Check for consistent pronoun usage across sentences"""
    if len(sentences) < 3:
        return 0.8  # Not enough context to properly evaluate
    
    # Look for mismatched pronouns (simplified approach)
    first_person = sum(1 for s in sentences if re.search(r'\b(I|me|my|mine|we|us|our|ours)\b', s, re.IGNORECASE))
    third_person = sum(1 for s in sentences if re.search(r'\b(he|him|his|she|her|hers|it|its|they|them|their|theirs)\b', s, re.IGNORECASE))
    
    total = first_person + third_person
    if total < 3:
        return 0.8  # Not enough pronouns to evaluate
    
    # If one perspective dominates, score is higher
    if first_person > third_person * 3 or third_person > first_person * 3:
        return 0.9
    elif first_person > 0 and third_person > 0:
        # Mixed pronouns - may be appropriate depending on context
        return 0.7
    
    return 0.8  # Default for inconclusive analysis

def check_logical_flow(sentences: List[str]) -> float:
    """Check for logical flow between sentences (simplified)"""
    if len(sentences) < 3:
        return 0.8  # Not enough sentences to evaluate
    
    # Check for logical connectors between sentences
    logical_connections = 0
    for i in range(1, len(sentences)):
        if re.search(r'^(however|therefore|additionally|furthermore|moreover|consequently|thus|hence|nevertheless|also|instead|still|yet|so)\b', 
                     sentences[i], re.IGNORECASE):
            logical_connections += 1
    
    # Score based on frequency of logical connections
    connection_ratio = logical_connections / (len(sentences) - 1)
    
    # We don't want too many or too few connectors
    if connection_ratio > 0.6:
        return 0.7  # Too many connectors can be awkward
    elif connection_ratio > 0.2:
        return 0.9  # Good balance
    elif connection_ratio > 0.1:
        return 0.7  # Could use more connectors
    else:
        return 0.5  # Very few connectors
        
def identify_quality_issues(text: str) -> List[str]:
    """Identify potential quality issues in the response"""
    issues = []
    
    # Check for repetition
    if re.search(r'(\b\w+\b)((?:\s+\w+){0,3}\s+\1\b){2,}', text, re.IGNORECASE):
        issues.append("Excessive word repetition detected")
        
    # Check for very short paragraphs
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    if any(len(p.split()) < 10 for p in paragraphs if len(paragraphs) > 1):
        issues.append("Contains very short paragraphs that may lack substance")
    
    # Check for very long sentences
    sentences = re.split(r'[.!?]+', text)
    if any(len(s.split()) > 50 for s in sentences):
        issues.append("Contains excessively long sentences that may be difficult to read")
    
    # Check for placeholder/filler phrases
    if re.search(r'\b(as you can see|as mentioned|it is important to note|keep in mind|needless to say)\b', text, re.IGNORECASE):
        issues.append("Contains filler phrases that add little value")
    
    # Check for potential inconsistencies
    if re.search(r'\b(however|but|although|yet)\b.*\b(however|but|although|yet)\b', text, re.IGNORECASE):
        issues.append("May contain logical inconsistencies or contradictions")
        
    return issues

def calculate_score(components: List[float]) -> float:
    """Calculate a weighted score from component scores"""
    if not components:
        return 0.0
    return round(sum(components), 2)

def enrich_ai_response(response_text: str, prompt: str = None) -> Dict[str, Any]:
    """
    Process an AI response with enhanced parsing, statistical analysis, and quality metrics.
    
    Args:
        response_text: The raw response text from the AI model
        prompt: Optional original prompt for context
        
    Returns:
        Enhanced response object with structured data and quality metrics
    """
    # Start with basic response
    enriched_response = {
        "response": response_text,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Add structured parsing
    structured_data = parse_structured_response(response_text)
    enriched_response["structured_data"] = structured_data
    
    # Add statistical analysis
    stats = analyze_response_statistics(response_text)
    enriched_response["statistics"] = stats
    
    # Add quality metrics
    quality = evaluate_response_quality(response_text, prompt)
    enriched_response["quality_metrics"] = quality
    
    # Add metadata about the structure
    enriched_response["metadata"] = {
        "sections_count": len(structured_data["main_sections"]),
        "lists_count": len(structured_data["lists"]),
        "code_blocks_count": len(structured_data["code_blocks"]),
        "content_type": stats["dominant_content_type"],
        "quality_score": quality["overall_quality_score"]
    }
    
    return enriched_response

def format_error_response(error_msg: str, details: Optional[str] = None) -> str:
    """
    Format a standardized error response
    
    Args:
        error_msg: The main error message
        details: Optional additional error details
        
    Returns:
        JSON formatted error response
    """
    response = {
        "error": error_msg,
        "success": False,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    if details:
        response["details"] = details
        
    return json.dumps(response) 