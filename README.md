# Personal AI Writing Assistant

A sophisticated AI-powered writing tool featuring a modern React frontend and Node.js/Python backend that helps users create, improve, and optimize various written content using the OpenRouter API with access to multiple LLM models.

## Features

- **Multi-Format Content Creation**: Specialized assistance for emails, blogs, academic papers, and creative writing
- **Advanced Style and Tone Customization**: Adjust temperature and select writing style (professional, casual, academic, etc.)
- **Real-Time AI Suggestions**: Get instant feedback and improvements for your content
- **Document Management System**: Save, organize, and compare different versions of your documents
- **Smart Export Options**: Download your content in Markdown, PDF, and DOCX formats
- **Custom Model Integration**: Add and use any model available through OpenRouter API
- **Chat Interface**: Communicate directly with AI models to discuss your writing
- **Content Analysis**: Get statistics and metrics about your writing
- **Response Quality Analysis**: Automatic evaluation of AI output with quality metrics and structure parsing

## Project Structure

```
ai-writing-assistant/
├── frontend/                # React frontend application
│   ├── src/                 # Frontend source code
│   │   ├── components/      # React components
│   │   └── styles/          # CSS and styling files
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
├── backend/                 # Node.js Express backend
│   ├── scripts/             # Python scripts for AI processing
│   │   ├── generate_response.py     # Generates AI responses
│   │   ├── summarize_content.py     # Creates text summaries
│   │   ├── generate_suggestions.py  # Provides writing suggestions
│   │   ├── improve_readability.py   # Enhances text clarity
│   │   └── utils.py                 # Shared utility functions
│   ├── server.js            # Express server entry point
│   └── package.json         # Backend dependencies
├── package.json             # Root package.json for running both apps
├── requirements.txt         # Python dependencies
└── .env.example             # Example environment variables
```

## System Requirements

- **Node.js**: v14.x or higher
- **Python**: v3.9 or higher
- **NPM**: v6.x or higher
- **OpenRouter API Key**: Register at [OpenRouter](https://openrouter.ai) to get an API key

## Quick Setup

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/personal-ai-writing-assistant.git
   cd personal-ai-writing-assistant
   ```

2. Create a `.env` file in the root directory with your API key and preferred model:
   ```
   # API Keys
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   
   # Application settings
   DEBUG=True
   LOG_LEVEL=INFO
   
   # Database configuration
   DATABASE_URL=sqlite:///./ai_writing_assistant.db
   
   # Model settings
   DEFAULT_MODEL=nvidia/llama-3.1-nemotron-nano-8b-v1:free
   TEMPERATURE=0.7
   MAX_TOKENS=1000
   ```

3. Install Node.js dependencies for both frontend and backend:
   ```
   npm run install-all
   ```

4. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Run the full application (both frontend and backend):
   ```
   npm start
   ```

   This will start:
   - React frontend on http://localhost:3000
   - Node.js backend on http://localhost:5000

## Development

### Frontend Only
```
cd frontend
npm start
```

### Backend Only
```
cd backend
npm start
```

### Python Scripts Development
The Python scripts in the `backend/scripts` directory handle the core AI functionality:

- **generate_response.py**: Creates responses based on user prompts with customizable parameters
- **summarize_content.py**: Generates summaries with adjustable length and focus points
- **generate_suggestions.py**: Provides detailed writing improvement suggestions
- **improve_readability.py**: Enhances text for better readability and clarity
- **utils.py**: Shared utility functions for all scripts

## API Endpoints

The backend provides several REST API endpoints:

- **POST /api/generate**: Generate AI responses for content creation
- **POST /api/chat**: Chat with AI models conversationally
- **POST /api/suggestions**: Get writing improvement suggestions
- **POST /api/improve**: Enhance content readability
- **POST /api/verify-model**: Verify custom model availability
- **GET /api/models**: Retrieve available AI models

## Response Quality Improvements

The system includes advanced response processing capabilities to ensure high-quality AI outputs:

### Enhanced Response Parsing

- **Structured Content Extraction**: Automatically identifies sections, lists, and content structure
- **Code Block Detection**: Isolates and properly formats code snippets in responses
- **Key-Value Recognition**: Extracts structured data like key-value pairs from responses

### Statistical Analysis

- **Detailed Metrics**: Calculates comprehensive statistics including sentence variety, lexical diversity, and content type indicators
- **Content Classification**: Analyzes whether content is primarily explanatory, instructional, analytical, or persuasive
- **Readability Assessment**: Evaluates sentence and paragraph structure for optimal readability

### Quality Evaluation

- **Multi-dimensional Scoring**: Evaluates responses on relevance, coherence, completeness, and structure
- **Contextual Evaluation**: Compares responses to original prompts for relevance
- **Issue Detection**: Identifies potential problems like repetition, inconsistency, or excessively long sentences
- **Automated Quality Warnings**: Flags responses that fall below quality thresholds

All API responses include this enhanced data, enabling intelligent presentation and feedback in the frontend.

## Available Scripts

In the root directory, you can run:

- `npm start` - Runs both frontend and backend
- `npm run frontend` - Runs only the React frontend
- `npm run backend` - Runs only the Node.js backend
- `npm run install-all` - Installs dependencies for all parts of the application
- `npm run build` - Builds the React frontend for production

## Model Selection

You can use any model available through OpenRouter by specifying it in your `.env` file. Some recommended options include:

- **Free Tier Models**:
  - `nvidia/llama-3.1-nemotron-nano-8b-v1:free` - Good balance of performance and speed
  - `google/gemini-2.5-pro-exp-03-25:free` - Strong reasoning capabilities
  - `deepseek/deepseek-chat-v3-0324:free` - Efficient knowledge retrieval

- **Premium Models**:
  - `openai/gpt-4o` - High performance general purpose model
  - `anthropic/claude-3-opus` - Excellent for complex writing tasks
  - `anthropic/claude-3-sonnet` - Good balance of quality and cost
  - `mistralai/mistral-large` - Strong performance for technical content

The application also supports adding custom models through the UI.

## Troubleshooting

### Common Issues

1. **API Key Issues**:
   - Ensure your OpenRouter API key is correctly set in the `.env` file
   - Verify API key has not expired or reached usage limits

2. **Connection Errors**:
   - Check that both frontend and backend servers are running
   - Verify ports 3000 and 5000 are not being used by other applications

3. **Python Dependency Issues**:
   - Make sure all required Python packages are installed
   - Use a virtual environment to avoid conflicts

4. **Model Availability**:
   - Some models may have downtime or rate limits
   - Try switching to a different model if encountering persistent errors

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- This project uses [OpenRouter](https://openrouter.ai) to access various LLM models
- Built with React, Node.js, and Python
- Uses SQLite for data storage
- Includes integrations with various text processing libraries 