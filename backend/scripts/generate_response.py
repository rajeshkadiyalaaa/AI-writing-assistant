#!/usr/bin/env python
import json
import sys
import os
import requests
import time
from dotenv import load_dotenv
from utils import (
    estimate_tokens, 
    estimate_context_window,
    enrich_ai_response,
    parse_structured_response,
    analyze_response_statistics,
    evaluate_response_quality
)

def generate_response(data):
    # Load environment variables with explicit path
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
    print(f"Debug - Looking for .env at: {dotenv_path}", file=sys.stderr)
    load_dotenv(dotenv_path=dotenv_path)
    
    # Debug: Check if API key is loaded
    api_key = os.getenv('OPENROUTER_API_KEY')
    print(f"Debug - API key found: {'Yes' if api_key else 'No'}", file=sys.stderr)
    if api_key:
        # Print first 5 chars to verify key format without exposing full key
        print(f"Debug - API key starts with: {api_key[:5]}...", file=sys.stderr)
    
    # Get API key from environment
    if not api_key:
        return json.dumps({
            "error": "API key not found. Please set OPENROUTER_API_KEY in your .env file."
        })
    
    # Extract data from input
    messages = data.get('messages', [])
    model = data.get('model', os.getenv('DEFAULT_MODEL', 'nvidia/llama-3.1-nemotron-nano-8b-v1:free'))
    document_type = data.get('documentType', 'general')
    tone = data.get('tone', 'professional')
    temperature = data.get('temperature', float(os.getenv('TEMPERATURE', 0.7)))
    max_tokens = data.get('max_tokens', int(os.getenv('MAX_TOKENS', 1000)))
    
    # Store original prompt for quality evaluation (if available)
    original_prompt = messages[-1].get('content', '') if messages else None
    
    # Enhanced context window management
    context_window = estimate_context_window(model)
    
    # Create enhanced system message based on document type and tone
    system_message = {
        "role": "system",
        "content": f"""You are an expert AI writing assistant specializing in creating and improving {document_type} content.

WRITING STYLE GUIDELINES:
- Maintain a {tone} tone throughout your responses
- Be clear, concise, and engaging
- Use active voice where appropriate
- Vary sentence structure for better readability
- Ensure logical flow between ideas and paragraphs
- Avoid unnecessary jargon unless required for the subject
- Focus on providing actionable and specific advice

DOCUMENT TYPE SPECIFICS ({document_type.upper()}):
"""
    }
    
    # Enhanced document type instructions
    if document_type == 'email':
        system_message["content"] += """
- Structure emails with clear subject lines, greetings, body, and closings
- Suggest appropriate salutations and sign-offs based on formality level
- Maintain brevity and get to the point quickly
- Provide multiple options for key phrases when appropriate
- Ensure a clear call to action when needed
- Be mindful of professional email etiquette"""
    elif document_type == 'academic':
        system_message["content"] += """
- Use formal academic language and appropriate terminology
- Maintain a logical structure with clear thesis statements and supporting evidence
- Include proper citations and references where needed
- Focus on precise, evidence-based arguments
- Avoid colloquialisms and informal language
- Suggest appropriate academic phrases and transitions"""
    elif document_type == 'business':
        system_message["content"] += """
- Focus on clear, actionable business communication
- Use appropriate business terminology and formats
- Incorporate data and metrics when relevant
- Ensure content is organized for busy professionals (executive summaries, bullet points, etc.)
- Maintain professionalism and focus on results
- Include business-appropriate section headings and structure"""
    elif document_type == 'creative':
        system_message["content"] += """
- Incorporate vivid imagery and descriptive language
- Suggest varied vocabulary and evocative phrases
- Consider rhythm and flow of language
- Develop character voice or narrative perspective as appropriate
- Balance showing vs. telling in descriptions
- Offer creative alternatives for common expressions"""
    else:  # general writing
        system_message["content"] += """
- Adapt to the user's specific needs while maintaining quality
- Provide balanced feedback focusing on both strengths and areas for improvement
- Offer structural and stylistic suggestions
- Ensure appropriate tone and voice for the intended audience
- Balance creativity with clarity based on the user's goals"""
    
    # Add advanced guidelines for response quality
    system_message["content"] += f"""

RESPONSE GUIDELINES:
- Provide thoughtful, in-depth assistance that directly addresses the user's needs
- Offer specific examples when explaining concepts
- When suggesting improvements, explain the reasoning behind recommendations
- Maintain the context of the conversation and refer back to previous exchanges when relevant
- If asked for writing assistance, provide properly formatted, high-quality content
- If asked to improve existing text, explain your proposed changes

Current conversation temperature setting: {temperature} - {'focus on creativity and exploration' if temperature > 0.7 else 'focus on precision and consistency'}
"""
    
    # Prepare full message list with system message and conversation history
    full_messages = [system_message]
    
    # Only include user messages and assistant responses (skip system messages from client)
    # Implement enhanced context management
    token_budget = max(context_window * 0.8, 2000)  # Reserve 20% for response
    current_tokens = estimate_tokens(system_message["content"])
    
    # Process messages from newest to oldest
    for msg in reversed(messages):
        if msg.get('role') in ['user', 'assistant']:
            msg_tokens = estimate_tokens(msg.get('content', ''))
            if current_tokens + msg_tokens < token_budget:
                full_messages.insert(1, msg)  # Insert after system message
                current_tokens += msg_tokens
            else:
                # Add a context note if we had to truncate
                if len(full_messages) == 1:  # Only system message so far
                    context_note = {
                        "role": "system",
                        "content": "Note: The conversation history is extensive. I'm focusing on your most recent messages."
                    }
                    full_messages.insert(1, context_note)
                break
    
    # Prepare headers for API request
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://example.com'  # Replace with your actual domain
    }
    
    # Debug: Print headers (without full API key)
    debug_headers = headers.copy()
    if 'Authorization' in debug_headers:
        auth_value = debug_headers['Authorization']
        if auth_value.startswith('Bearer '):
            debug_headers['Authorization'] = f"Bearer {auth_value[7:12]}..."
    print(f"Debug - Headers being sent: {debug_headers}", file=sys.stderr)
    
    # Prepare the request payload with enhanced parameters
    payload = {
        'messages': full_messages,
        'model': model,
        'temperature': temperature,
        'max_tokens': max_tokens,
        'top_p': 0.9,  # Add nucleus sampling
        'frequency_penalty': 0.5,  # Reduce repetition
        'presence_penalty': 0.5,  # Encourage topic diversity
    }
    
    try:
        # Implement retry logic
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                # Make the API request to OpenRouter
                print(f"Sending request to OpenRouter API with model: {model}", file=sys.stderr)
                response = requests.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    headers=headers,
                    json=payload,
                    timeout=30  # Add timeout
                )
                
                # Check if the request was successful
                if response.status_code == 200:
                    result = response.json()
                    assistant_response = result['choices'][0]['message']['content']
                    
                    # Enhanced response processing with quality improvements
                    enriched_response = enrich_ai_response(assistant_response, original_prompt)
                    
                    # Add usage information to the response
                    usage_info = result.get('usage', {})
                    model_info = result.get('model', model)
                    
                    # Combine basic API response with our enriched data
                    response_data = {
                        "response": assistant_response,
                        "usage": usage_info,
                        "model": model_info,
                        "enhanced_data": {
                            "structured_content": enriched_response["structured_data"],
                            "statistics": enriched_response["statistics"],
                            "quality_metrics": enriched_response["quality_metrics"],
                            "metadata": enriched_response["metadata"]
                        }
                    }
                    
                    # Add quality warnings if quality is below threshold
                    if enriched_response["quality_metrics"]["overall_quality_score"] < 0.7:
                        response_data["quality_warnings"] = enriched_response["quality_metrics"]["potential_issues"]
                    
                    return json.dumps(response_data)
                
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
                    # Return error message with details from the API
                    error_detail = response.text
                    print(f"API error: Status code {response.status_code}, Details: {error_detail}", file=sys.stderr)
                    return json.dumps({
                        "error": f"API request failed with status code {response.status_code}",
                        "details": error_detail
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
        # Return error message for any exceptions
        print(f"Exception in generate_response: {str(e)}", file=sys.stderr)
        return json.dumps({"error": f"Error: {str(e)}"})

if __name__ == "__main__":
    # Read input data from command line argument
    if len(sys.argv) > 1:
        try:
            data = json.loads(sys.argv[1])
            result = generate_response(data)
            print(result)
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON input"}))
        except Exception as e:
            print(json.dumps({"error": f"Unexpected error: {str(e)}"}))
    else:
        print(json.dumps({"error": "No input data provided"})) 