#!/usr/bin/env python
import json
import sys
import os
import requests
import time
import re
from dotenv import load_dotenv
from utils import (
    extract_key_topics, 
    detect_content_type, 
    analyze_content_metrics,
    enrich_ai_response,
    analyze_response_statistics
)

# Load environment variables with explicit path
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
print(f"Debug - Looking for .env at: {dotenv_path}", file=sys.stderr)
load_dotenv(dotenv_path=dotenv_path)

def summarize_content(data):
    """
    Generate a summary of the provided content based on specified parameters
    """
    api_key = os.getenv('OPENROUTER_API_KEY')
    
    if not api_key:
        return json.dumps({
            "error": "OpenRouter API key not found in environment variables"
        })
    
    # Extract parameters from the input data
    content = data.get('content', '')
    summary_length = data.get('summaryLength', 'medium')  # short, medium, long
    focus_points = data.get('focusPoints', [])
    additional_instructions = data.get('additionalInstructions', '')
    model = data.get('model', os.getenv('DEFAULT_MODEL', 'nvidia/llama-3.1-nemotron-nano-8b-v1:free'))
    
    if not content:
        return json.dumps({
            "error": "No content provided for summarization"
        })
    
    # Map summary length to approximate word count with more precise ranges
    length_mapping = {
        "short": {
            "description": "a concise executive summary",
            "word_count": "75-125 words",
            "paragraphs": "1 paragraph"
        },
        "medium": {
            "description": "a comprehensive summary",
            "word_count": "200-300 words",
            "paragraphs": "2-3 paragraphs"
        },
        "long": {
            "description": "a detailed summary",
            "word_count": "400-600 words",
            "paragraphs": "4-6 paragraphs"
        }
    }
    
    # Get the appropriate length information or default to medium
    length_info = length_mapping.get(summary_length, length_mapping["medium"])
    
    # Analyze content to identify key topics and patterns
    topics = extract_key_topics(content)
    content_type = detect_content_type(content)
    
    # Prepare the enhanced system message for summarization
    system_message = f"""You are an expert content summarizer specializing in creating high-quality, accurate summaries. 

TASK: Create {length_info['description']} of approximately {length_info['word_count']} ({length_info['paragraphs']}) from the provided content.

CONTENT TYPE DETECTED: {content_type}

KEY TOPICS IDENTIFIED:
{', '.join(topics) if topics else 'Analyze and identify key topics'}

FOCUS REQUIREMENTS:
{', '.join(focus_points) if focus_points else 'Summarize all main points with balanced coverage'}

SUMMARY STYLE GUIDELINES:
- Be accurate and faithful to the original content
- Prioritize key information and main arguments
- Use clear, concise language
- Maintain an objective tone
- Preserve the original meaning and intent
- Structure the summary with logical flow
- Include transitions between major points
- End with the most significant conclusion or implication

FORMAT:
- Create a summary of {length_info['paragraphs']}
- Target word count: {length_info['word_count']}
- Begin with a strong topic sentence that captures the main idea
- For longer summaries, use appropriate paragraph breaks at logical transition points

ADDITIONAL INSTRUCTIONS:
{additional_instructions}

IMPORTANT: Your summary should be standalone and comprehensive, enabling a reader to understand the core content without needing to read the original text."""
    
    # Prepare the request
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://example.com"  # Replace with your actual domain
    }
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Please summarize this content:\n\n{content}"}
    ]
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.5,  # Lower temperature for more accurate summaries
        "max_tokens": 2000,   # Increased for longer summaries
        "top_p": 0.9,         # Add nucleus sampling
        "frequency_penalty": 0.3,
        "presence_penalty": 0.3
    }
    
    try:
        # Implement retry logic
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30  # Add timeout for reliability
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    
                    # Extract the assistant's message
                    summary = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
                    
                    # Apply enhanced response processing
                    enriched_response = enrich_ai_response(summary, content[:300])  # Using the first 300 chars of content as context
                    
                    # Calculate metrics for the summary
                    summary_stats = analyze_content_metrics(summary)
                    
                    # Combine the core response with the enhanced data
                    result = {
                        "summary": summary,
                        "word_count": len(summary.split()),
                        "usage": response_data.get('usage', {}),
                        "model": response_data.get('model', model),
                        "stats": summary_stats,
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
                    
                    return json.dumps(result)
                
                # Handle rate limiting with retry
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
                            "details": error_detail
                        })
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
                    return json.dumps({"error": f"Request error after retries: {str(req_err)}"})
            
    except Exception as e:
        return json.dumps({
            "error": f"Exception occurred: {str(e)}"
        })

def extract_key_topics(content):
    """
    Extract key topics from the content using basic frequency analysis
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
    topics = [word for word, count in top_words[:10] if count > 1]
    
    return topics

def detect_content_type(content):
    """
    Attempt to detect the type of content based on patterns and structure
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

def analyze_summary(summary, original_content):
    """
    Analyze the generated summary to provide useful metrics
    """
    # Calculate basic statistics
    summary_words = summary.split()
    summary_word_count = len(summary_words)
    original_word_count = len(original_content.split())
    compression_ratio = round(summary_word_count / max(original_word_count, 1) * 100, 1)
    
    # Count paragraphs
    summary_paragraphs = len([p for p in summary.split('\n\n') if p.strip()])
    
    # Estimate reading time (average reading speed: 200-250 words per minute)
    reading_time_minutes = round(summary_word_count / 225, 1)
    
    return {
        "compression_ratio": f"{compression_ratio}%",
        "paragraph_count": summary_paragraphs,
        "estimated_reading_time": f"{reading_time_minutes} min",
        "original_length": original_word_count
    }

if __name__ == "__main__":
    # Read the input data from command line argument
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = summarize_content(input_data)
            print(result)
        except Exception as e:
            print(json.dumps({
                "error": f"Failed to process input: {str(e)}"
            }))
    else:
        print(json.dumps({
            "error": "No input data provided"
        })) 