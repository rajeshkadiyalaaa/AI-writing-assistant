#!/usr/bin/env python
import os
import requests
import json
import sys
from dotenv import load_dotenv

# Load environment variables with explicit path
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
print(f"Looking for .env at: {dotenv_path}")
load_dotenv(dotenv_path=dotenv_path)

# Get API key
api_key = os.getenv('OPENROUTER_API_KEY')
if not api_key:
    print("Error: API key not found in environment variables")
    sys.exit(1)

print(f"API key found: {api_key[:5]}...")

# Test OpenRouter API with a simple request
headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://example.com'
}

# Simple test payload
payload = {
    'model': 'nvidia/llama-3.1-nemotron-nano-8b-v1:free',
    'messages': [
        {'role': 'system', 'content': 'You are a helpful assistant.'},
        {'role': 'user', 'content': 'Hello, world!'}
    ],
    'max_tokens': 10
}

print("Sending test request to OpenRouter API...")
try:
    response = requests.post(
        'https://openrouter.ai/api/v1/chat/completions',
        headers=headers,
        json=payload,
        timeout=30
    )
    
    print(f"Response status code: {response.status_code}")
    print(f"Response headers: {response.headers}")
    print(f"Response body: {response.text}")
    
    if response.status_code == 200:
        print("Success! API key is working correctly")
    else:
        print(f"Error: {response.status_code} - {response.text}")
        
except Exception as e:
    print(f"Exception occurred: {str(e)}") 