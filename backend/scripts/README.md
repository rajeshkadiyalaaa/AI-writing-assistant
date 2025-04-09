# Enhanced AI Processing Scripts

This directory contains a collection of Python scripts designed to interact with AI language models via the OpenRouter API. These scripts have been optimized for high-quality responses, reliability, and improved error handling.

## Scripts Overview

- **generate_response.py**: Generates AI responses for chat and writing assistance
- **generate_suggestions.py**: Creates detailed suggestions for improving written content
- **improve_readability.py**: Enhances text for better readability and clarity
- **summarize_content.py**: Creates concise summaries with customizable length and focus
- **format_content.py**: Formats content according to specific requirements
- **utils.py**: Common utility functions shared across scripts

## Key Enhancements

### 1. Improved Prompt Engineering

- **Document Type Specialization**: Each script now provides specialized instructions based on the document type (email, academic, business, creative).
- **Detailed Formatting Guidelines**: Clear, explicit formatting instructions ensure consistent and high-quality output.
- **Context-Aware Prompting**: Content analysis to determine the appropriate style and approach.

### 2. Reliability Improvements

- **Robust Error Handling**: Comprehensive error handling with detailed error messages.
- **Retry Logic**: Automatic retries for rate limits and transient errors with exponential backoff.
- **Context Window Management**: Dynamic content management based on model context windows.

### 3. Smart Content Analysis

- **Topic Extraction**: Automatic identification of key topics in content.
- **Content Type Detection**: Classification of text into various content types.
- **Statistical Analysis**: Content metrics for word count, reading time, and content complexity.

### 4. Model Optimization

- **Task-Specific Parameters**: Optimized temperature, max_tokens, and other parameters for different tasks.
- **Model-Specific Adjustments**: Parameter tuning based on the specific model being used.
- **Response Parsing**: Improved parsing for consistent output formatting.

### 5. Performance Enhancements

- **Code Efficiency**: Optimized code for better performance.
- **Shared Utilities**: Common functions extracted to utils.py to reduce duplication.
- **Type Annotations**: Added type hints for better code quality and IDE support.

## Usage Examples

For detailed usage examples, refer to the docstring at the top of each script or the import them in your own code:

```python
# Example: Generate suggestions for content
from scripts.generate_suggestions import generate_suggestions

result = generate_suggestions({
    "content": "Your text content here",
    "documentType": "email",
    "tone": "professional",
    "model": "openai/gpt-4o"
})

print(result)
```

## Configuration

All scripts use the OpenRouter API key configured in your .env file:

```
OPENROUTER_API_KEY=your_api_key_here
DEFAULT_MODEL=preferred_default_model
```

## Further Customization

Each script accepts additional parameters for customizing behavior. See the individual script documentation for details on available options. 