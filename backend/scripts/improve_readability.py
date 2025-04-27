#!/usr/bin/env python
import json
import sys
import os
import requests
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

def improve_readability(data):
    """
    Improve the readability of the provided content based on specified parameters
    """
    api_key = os.getenv('OPENROUTER_API_KEY')
    
    if not api_key:
        print(f"Error: OpenRouter API key not found in environment variables", file=sys.stderr)
        return json.dumps({
            "error": "OpenRouter API key not found in environment variables"
        })
    
    # Extract parameters from the input data
    content = data.get('content', '')
    target_audience = data.get('targetAudience', 'general')  # general, technical, academic, etc.
    reading_level = data.get('readingLevel', 'intermediate')  # simple, intermediate, advanced
    additional_instructions = data.get('additionalInstructions', '')
    model = data.get('model', os.getenv('DEFAULT_MODEL', 'nvidia/llama-3.1-nemotron-nano-8b-v1:free'))
    
    print(f"Debug - Processing improve request with model: {model}", file=sys.stderr)
    
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
    
    # Prepare the system message for readability improvement
    system_message = f"""You are an expert in improving text readability. Rewrite the provided content for better clarity and readability.

Target Audience: {target_audience}
Reading Level: {reading_level} ({grade_level})

Guidelines for improving readability:
1. Use clear, concise language appropriate for the {target_audience} audience at a {reading_level} reading level
2. Break down complex sentences into simpler ones where appropriate
3. Use active voice instead of passive voice when possible
4. Replace jargon or complex terminology with simpler alternatives when appropriate
5. Organize information with logical flow and transitions
6. Maintain the original meaning and key points of the content
7. Add appropriate paragraph breaks to improve visual scanning

Additional instructions: {additional_instructions}

The improved content should maintain the same overall meaning and information while being easier to read and understand."""
    
    # Prepare the request
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-writing-assistant.vercel.app",
        "X-Title": "AI Writing Assistant"
    }
    
    print(f"Debug - Using headers: {headers}", file=sys.stderr)
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Please improve the readability of this content:\n\n{content}"}
    ]
    
    # Create model-specific payloads
    if "nvidia/llama-3.1-nemotron-nano" in model:
        print(f"Debug - Detected Nvidia Llama model, using optimized parameters", file=sys.stderr)
        # Optimize for Nvidia Llama models
        payload = {
            "model": model,
            "prompt": f"<|system|>\n{system_message}\n<|user|>\nPlease improve the readability of this content:\n\n{content}\n<|assistant|>",
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
    
    print(f"Debug - Using model: {model} for suggestions", file=sys.stderr)
    print(f"Debug - Payload format: {'prompt-based' if 'prompt' in payload else 'messages-based'}", file=sys.stderr)
    
    # For nvidia models, use a different endpoint if needed
    api_endpoint = "https://openrouter.ai/api/v1/chat/completions"
    if "nvidia/llama-3.1-nemotron-nano" in model:
        # Check if we need to use a different endpoint for this model
        # Some providers require model-specific endpoints
        print(f"Debug - Using standard API endpoint for Nvidia model: {api_endpoint}", file=sys.stderr)
    
    print(f"Debug - Sending API request to improve readability with model: {model}", file=sys.stderr)
    
    try:
        # Implement retry logic
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                print(f"Debug - Attempt {attempt+1} to improve readability", file=sys.stderr)
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
                    
                    # Extract the assistant's message with better error handling
                    try:
                        improved_content = handle_alternative_response_formats(response_data)
                        
                        if not improved_content or improved_content.startswith("Could not extract"):
                            print(f"Warning: Failed to extract content from response", file=sys.stderr)
                            return json.dumps({
                                "error": "Failed to extract improved content from API response",
                                "details": "The response format was unexpected. Please try again or try a different model."
                            })
                        
                        print(f"Debug - Successfully received improved content", file=sys.stderr)
                        
                        return json.dumps({
                            "improved_content": improved_content,
                            "original_word_count": len(content.split()),
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
                            "details": error_detail
                        })
                else:
                    error_message = f"API request failed with status code {response.status_code}"
                    print(f"Debug - Error: {error_message}", file=sys.stderr)
                    print(f"Debug - Response: {response.text}", file=sys.stderr)
                    
                    return json.dumps({
                        "error": error_message,
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
        error_message = f"Exception occurred: {str(e)}"
        print(f"Debug - Error: {error_message}", file=sys.stderr)
        
        return json.dumps({
            "error": error_message
        })

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
    return f"Could not extract improvement text. Response keys found: {keys_found}"

if __name__ == "__main__":
    # Read the input data from command line argument
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = improve_readability(input_data)
            print(result)
        except Exception as e:
            print(json.dumps({
                "error": f"Failed to process input: {str(e)}"
            }))
    else:
        print(json.dumps({
            "error": "No input data provided"
        })) 