# AI Writing Assistant

A sophisticated AI-powered writing tool featuring a modern React frontend and Node.js/Python backend that helps users create, improve, and optimize various written content using the OpenRouter API with access to multiple LLM models.

## What This Project Does

The AI Writing Assistant is a comprehensive writing enhancement platform that leverages large language models (LLMs) to help users at every stage of the writing process:

1. **Content Generation**: Creates high-quality first drafts based on minimal input, from emails to academic papers
2. **Real-time Editing**: Provides inline suggestions, grammar corrections, and style improvements as you type
3. **Content Transformation**: Converts between writing styles (formal, casual, technical) while preserving content
4. **Quality Analysis**: Evaluates writing along multiple dimensions and suggests specific improvements
5. **Document Management**: Maintains version history with intelligent comparisons between drafts
6. **Multi-format Export**: Exports documents in Markdown, PDF, and Word formats with proper formatting

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

## Latest Updates

- **Fixed PDF Export**: Implemented proper blob handling for PDF files with correct MIME types
- **Improved Word Document Export**: Added proper MIME type handling for .docx files
- **Enhanced Export Error Handling**: Added HTML fallback when PDF or Word generation fails
- **Responsive Design Improvements**: Better mobile UI and sidebar usability
- **Performance Optimizations**: Reduced token usage and improved response time

## Deployment Options

### Standard Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the application**:
   ```bash
   npm start
   ```

### Hosting Options

You can deploy this application on any standard hosting platform:

1. **Traditional Hosting**:
   - Upload the built frontend files to any web hosting service
   - Deploy the backend on a Node.js hosting service like Heroku, Digital Ocean, or AWS

2. **Docker Deployment**:
   - Create a Docker container for the application
   - Deploy to any container hosting service

3. **Cloud Services**:
   - AWS: Deploy frontend to S3 + CloudFront and backend to EC2 or Lambda
   - Google Cloud: Host frontend on Firebase and backend on Cloud Run
   - Azure: Use Azure Static Web Apps for frontend and App Service for backend

4. **Configure Environment Variables**:
   Ensure these environment variables are set in your hosting platform:
   ```
   OPENROUTER_API_KEY=your_api_key_here
   NODE_ENV=production
   DEBUG=false
   LOG_LEVEL=INFO
   FRONTEND_URL=your_frontend_url
   DEFAULT_MODEL=nvidia/llama-3.1-nemotron-nano-8b-v1:free
   TEMPERATURE=0.7
   MAX_TOKENS=1000
   ```

## Features

- **Multi-Format Content Creation**: Specialized assistance for emails, blogs, academic papers, and creative writing
- **Advanced Style and Tone Customization**: Adjust temperature and select writing style (professional, casual, academic, etc.)
- **Real-Time AI Suggestions**: Get instant feedback and improvements for your content
- **Document Management System**: Save, organize, and compare different versions of your documents
- **Smart Export Options**: Download your content in Markdown, PDF, and DOCX formats with proper formatting
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
│   │   ├── api/             # API integration
│   │   ├── hooks/           # Custom React hooks
│   │   └── styles/          # CSS and styling files
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
├── backend/                 # Node.js Express backend
│   ├── scripts/             # Python scripts for AI processing
│   │   ├── generate_response.py     # Generates AI responses
│   │   ├── generate_suggestions.py  # Provides writing suggestions
│   │   ├── improve_readability.py   # Enhances text clarity
│   │   ├── test_api_key.py          # Tests the OpenRouter API key
│   │   └── utils.py                 # Shared utility functions
│   ├── server.js            # Express server entry point
│   └── package.json         # Backend dependencies
├── package.json             # Root package.json for running both apps
├── requirements.txt         # Python dependencies
└── .env                     # Environment variables
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
- jsPDF (for PDF export)
- docx (for Word document export)

### Backend Dependencies
- Express 4.x
- CORS
- Body-parser
- Node-fetch
- Dotenv
- Child_process (for Python script execution)

### Python Dependencies
- Requests
- Python-dotenv
- SQLAlchemy (for database operations)
- NLTK (for natural language processing)

## Quick Setup

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/ai-writing-assistant.git
   cd ai-writing-assistant
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
  - Parameters: `content`, `documentType`, `tone`, `model`
  - Returns: Structured suggestions for improving the content

- **POST /api/improve**: Improve the readability of content
  - Parameters: `content`, `targetAudience`, `readingLevel`, `additionalInstructions`, `model`
  - Returns: Improved content with better readability

- **POST /api/verify-model**: Verify a custom model from OpenRouter
  - Parameters: `model`, `apiKey`
  - Returns: Verification status and model details

- **POST /api/settings/apikey**: Update the OpenRouter API key
  - Parameters: `apiKey`
  - Returns: Success status and masked API key

- **GET /api/settings/apikey**: Get the masked API key
  - Returns: Masked API key and status

- **GET /api/models**: Get available models
  - Returns: List of available models and default model

- **GET /api/health**: Health check endpoint
  - Returns: Server status and version information

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to OpenRouter for providing access to multiple AI models through a single API
- All the open-source libraries and frameworks that made this project possible 