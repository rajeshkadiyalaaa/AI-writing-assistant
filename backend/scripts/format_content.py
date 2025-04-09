#!/usr/bin/env python
import json
import sys
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def format_content(data):
    """
    Format content based on the provided parameters
    """
    api_key = os.getenv('OPENROUTER_API_KEY')
    
    if not api_key:
        return json.dumps({
            "error": "OpenRouter API key not found in environment variables"
        })
    
    # Extract parameters from the input data
    content = data.get('content', '')
    document_type = data.get('documentType', 'general')
    tone = data.get('tone', 'professional')
    format_type = data.get('formatType', 'standard')
    additional_instructions = data.get('additionalInstructions', '')
    
    if not content:
        return json.dumps({
            "error": "No content provided for formatting"
        })
    
    # Prepare the system message for formatting
    system_message = f"""You are an expert content formatter. Format the provided text as a {document_type} document with a {tone} tone.
Follow these formatting guidelines:
- Format type: {format_type}
- Document type: {document_type}
- Tone: {tone}
- Additional instructions: {additional_instructions}

Maintain the original meaning and key points of the content while improving its formatting, structure, and readability."""
    
    # Prepare the request
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Please format this content:\n\n{content}"}
    ]
    
    payload = {
        "model": os.getenv('DEFAULT_MODEL', 'openai/gpt-4o'),
        "messages": messages,
        "temperature": float(os.getenv('TEMPERATURE', 0.7)),
        "max_tokens": int(os.getenv('MAX_TOKENS', 1000))
    }
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            response_data = response.json()
            
            # Extract the assistant's message
            formatted_content = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            return json.dumps({
                "formatted_content": formatted_content,
                "usage": response_data.get('usage', {})
            })
        else:
            return json.dumps({
                "error": f"API request failed with status code {response.status_code}",
                "details": response.text
            })
            
    except Exception as e:
        return json.dumps({
            "error": f"Exception occurred: {str(e)}"
        })

if __name__ == "__main__":
    # Read the input data from command line argument
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = format_content(input_data)
            print(result)
        except Exception as e:
            print(json.dumps({
                "error": f"Failed to process input: {str(e)}"
            }))
    else:
        print(json.dumps({
            "error": "No input data provided"
        })) 