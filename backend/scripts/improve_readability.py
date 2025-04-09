#!/usr/bin/env python
import json
import sys
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def improve_readability(data):
    """
    Improve the readability of the provided content based on specified parameters
    """
    api_key = os.getenv('OPENROUTER_API_KEY')
    
    if not api_key:
        return json.dumps({
            "error": "OpenRouter API key not found in environment variables"
        })
    
    # Extract parameters from the input data
    content = data.get('content', '')
    target_audience = data.get('targetAudience', 'general')  # general, technical, academic, etc.
    reading_level = data.get('readingLevel', 'intermediate')  # simple, intermediate, advanced
    additional_instructions = data.get('additionalInstructions', '')
    
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
        "Content-Type": "application/json"
    }
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Please improve the readability of this content:\n\n{content}"}
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
            improved_content = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            return json.dumps({
                "improved_content": improved_content,
                "original_word_count": len(content.split()),
                "improved_word_count": len(improved_content.split()),
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