#!/usr/bin/env python
import json
import sys
import os
import requests
import re
import time
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

def generate_suggestions(data):
    """
    Generate writing suggestions based on the provided content
    """
    api_key = os.getenv('OPENROUTER_API_KEY')
    
    if not api_key:
        print(f"Error: OpenRouter API key not found in environment variables", file=sys.stderr)
        return json.dumps({
            "error": "OpenRouter API key not found in environment variables"
        })
    
    # Extract parameters from the input data
    content = data.get('content', '')
    document_type = data.get('documentType', 'general')
    tone = data.get('tone', 'professional')
    model = data.get('model', os.getenv('DEFAULT_MODEL', 'nvidia/llama-3.1-nemotron-nano-8b-v1:free'))
    
    print(f"Debug - Processing suggestion request with model: {model}", file=sys.stderr)
    
    if not content:
        return json.dumps({
            "error": "No content provided for generating suggestions"
        })
    
    # Determine appropriate suggestion depth based on content length
    content_length = len(content)
    suggestion_depth = "detailed"
    if content_length < 200:
        suggestion_depth = "basic"
    elif content_length > 2000:
        suggestion_depth = "comprehensive"
    
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
        "temperature": 0.5,  # Lower temperature for more consistent analysis
        "max_tokens": 2000,  # Increased token count for more detailed suggestions
        "top_p": 0.9,
        "frequency_penalty": 0.3,
        "presence_penalty": 0.3
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
                    
                    # Extract the assistant's message
                    suggestions = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
                    
                    # Apply enhanced response processing
                    enriched_response = enrich_ai_response(suggestions, content[:300])  # Using the first 300 chars of content as context
                    
                    # Parse suggestions into categories
                    parsed_suggestions = parse_suggestions_improved(suggestions)
                    
                    # Prepare enhanced response data
                    result = {
                        "suggestions": parsed_suggestions,
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