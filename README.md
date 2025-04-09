# Personal AI Writing Assistant

A sophisticated AI-powered writing tool featuring a modern React frontend and Node.js/Python backend that helps users create, improve, and optimize various written content using the OpenRouter API with access to multiple LLM models.

## What This Project Actually Does

The Personal AI Writing Assistant is a comprehensive writing enhancement platform that leverages large language models (LLMs) to help users at every stage of the writing process:

1. **Content Generation**: Creates high-quality first drafts based on minimal input, from emails to academic papers
2. **Real-time Editing**: Provides inline suggestions, grammar corrections, and style improvements as you type
3. **Content Transformation**: Converts between writing styles (formal, casual, technical) while preserving content
4. **Quality Analysis**: Evaluates writing along multiple dimensions and suggests specific improvements
5. **Document Management**: Maintains version history with intelligent comparisons between drafts

### User Flow and Interaction

1. Users select a document type (email, blog, academic, creative) and writing parameters
2. As they type, the system continuously analyzes the text and offers suggestions
3. Users can request specific improvements (clarity, conciseness, tone adjustment)
4. Final content can be exported in various formats with appropriate formatting

### Technical Implementation

This application uses a hybrid architecture:
- **React frontend**: Provides responsive UI with real-time editing capabilities
- **Node.js backend**: Handles API routing, authentication, and document management
- **Python processing layer**: Manages AI interactions and complex text analysis
- **SQLite database**: Stores user documents, preferences, and version history

The system employs advanced prompt engineering to extract optimal performance from LLMs, with specialized prompts for different document types and writing tasks. Response processing includes structured parsing and quality evaluation to ensure consistently high-quality output.

## Deployment with Vercel

This project is configured for seamless deployment on Vercel:

1. **Fork or clone this repository**
   - Create your own copy of the repository on GitHub

2. **Set up a Vercel account**
   - Go to [Vercel](https://vercel.com) and sign up or log in
   - Connect your GitHub account

3. **Import your repository**
   - In Vercel dashboard, click "Add New" → "Project"
   - Select your repository from the list
   - Vercel will automatically detect the project configuration

4. **Configure environment variables**
   - Add the following environment variables in Vercel's project settings:
     ```
     OPENROUTER_API_KEY=your_api_key_here
     NODE_ENV=production
     DEBUG=false
     LOG_LEVEL=INFO
     DEFAULT_MODEL=nvidia/llama-3.1-nemotron-nano-8b-v1:free
     TEMPERATURE=0.7
     MAX_TOKENS=1000
     ```

5. **Deploy**
   - Click "Deploy" and Vercel will build and deploy your application
   - Your AI Writing Assistant will be available at a vercel.app domain

The included `vercel.json` file handles the configuration for both frontend and backend, ensuring that API routes are properly directed to the backend while static content is served from the frontend.

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
- **Operating System**: Windows 10/11, macOS 10.15+, Ubuntu 20.04+
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: At least 500MB free space for installation
- **Browser**: Chrome 90+, Firefox 90+, Edge 90+ (for using the web interface)

## Dependencies

### Frontend Dependencies
- React 18.x
- Tailwind CSS 3.x
- Lucide React (for icons)
- Axios (for API requests)
- React Markdown (for rendering)

### Backend Dependencies
- Express 4.x
- CORS
- Body-parser
- Node-fetch
- Dotenv

### Python Dependencies
- NLTK
- SQLAlchemy
- Requests
- Python-dotenv
- Statistics
- Typing extensions

## Quick Setup

1. Clone this repository:
   ```
   git clone https://github.com/rajeshkadiyalaaa/AI-writing-assistant.git
   cd AI-writing-assistant
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

## Usage Examples

### Example 1: Creating a Professional Email

1. Select "Email" from the document type dropdown
2. Choose "Professional" tone
3. Enter a brief description of the email purpose: "Request for project timeline extension"
4. Click "Generate Draft" for an initial version
5. Edit the generated content as needed
6. Use the "Improve" button for specific enhancements
7. Export as plain text or directly copy to your email client

### Example 2: Academic Paper Assistance

1. Select "Academic" from the document type dropdown
2. Set tone to "Formal" and adjust temperature to 0.5 for more precise output
3. Upload an existing draft or outline if available
4. Use the section-by-section generation for introduction, methodology, results, etc.
5. Request specific improvements like "Add more technical detail to methodology"
6. Generate appropriate citations in your preferred format
7. Export as DOCX or PDF with proper academic formatting

### Example 3: Creative Writing Enhancement

1. Select "Creative" from the document type dropdown
2. Choose your genre (fiction, poetry, screenplay)
3. Set a higher temperature (0.7-0.9) for more creative variations
4. Enter a scene description or character details
5. Use the chat interface to discuss plot development or character arcs
6. Request specific improvements like "Make the dialogue more natural"
7. Save different versions to compare alternative approaches

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
  - Parameters: `messages`, `model`, `documentType`, `tone`, `temperature`
  - Returns: Generated text with quality metrics and usage statistics

- **POST /api/chat**: Chat with AI models conversationally
  - Parameters: `message`, `model`
  - Returns: AI response in conversational format

- **POST /api/suggestions**: Get writing improvement suggestions
  - Parameters: `content`, `documentType`, `tone`
  - Returns: Categorized suggestions for grammar, style, structure, clarity, and content

- **POST /api/improve**: Enhance content readability
  - Parameters: `content`, `targetAudience`, `readingLevel`, `additionalInstructions`
  - Returns: Improved content with readability metrics

- **POST /api/verify-model**: Verify custom model availability
  - Parameters: `model` (model ID to verify)
  - Returns: Success status and model information

- **GET /api/models**: Retrieve available AI models
  - Returns: List of available models and default model

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

## Performance Considerations

- **Response Time**: Typical response times range from 1-5 seconds depending on the model and request complexity
- **Token Usage**: The application optimizes prompts to minimize token usage while maintaining quality
- **Caching**: Frequently used responses are cached to improve performance and reduce API costs
- **Connection Management**: The application handles connection interruptions gracefully with automatic retry logic

## Security Features

- Environment variables for sensitive configuration
- API key validation and secure storage
- Input sanitization to prevent injection attacks
- Rate limiting to prevent abuse
- No storage of user credentials (if implementing authentication)

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

To contribute to this project:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Acknowledgements

- This project uses [OpenRouter](https://openrouter.ai) to access various LLM models
- Built with React, Node.js, and Python
- Uses SQLite for data storage
- Includes integrations with various text processing libraries 