import React, { useState, useEffect } from 'react';
import { 
  PenTool, Save, Download, History, Settings, 
  Trash2, Check, RefreshCw, Send, FileText, 
  BookOpen, Mail, Edit3, ChevronDown, Loader
} from 'lucide-react';

export default function AIWritingAssistant() {
  const [content, setContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [documentType, setDocumentType] = useState('general');
  const [tone, setTone] = useState('professional');
  const [model, setModel] = useState('gpt-4');
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState('format');
  const [savedDocuments, setSavedDocuments] = useState([
    { id: 1, title: 'Project Proposal', date: '2025-04-08', type: 'business' },
    { id: 2, title: 'Research Notes', date: '2025-04-07', type: 'academic' }
  ]);

  // Document types with icons
  const documentTypes = [
    { id: 'general', name: 'General', icon: <FileText size={16} /> },
    { id: 'email', name: 'Email', icon: <Mail size={16} /> },
    { id: 'academic', name: 'Academic', icon: <BookOpen size={16} /> },
    { id: 'business', name: 'Business', icon: <PenTool size={16} /> },
    { id: 'creative', name: 'Creative', icon: <Edit3 size={16} /> }
  ];

  // Tone options
  const toneOptions = [
    'professional', 'casual', 'formal', 'friendly', 
    'persuasive', 'informative', 'entertaining'
  ];

  // LLM Models
  const models = [
    'gpt-4', 'claude-3-opus', 'llama-3', 'gemini-pro', 'mistral-large'
  ];

  // Mock function to generate suggestions
  const generateSuggestions = () => {
    setIsGenerating(true);
    
    // Simulate API call
    setTimeout(() => {
      setSuggestions([
        { id: 1, type: 'improvement', text: 'Consider using more concise language in the introduction.' },
        { id: 2, type: 'alternative', text: 'Alternative phrasing: "The implementation of this system would significantly enhance productivity."' },
        { id: 3, type: 'grammar', text: 'Grammar issue: Change "their" to "there" in paragraph 2.' }
      ]);
      setIsGenerating(false);
      
      // Add to history
      const now = new Date();
      setHistory([...history, {
        id: history.length + 1,
        timestamp: now.toLocaleTimeString(),
        action: 'Generated suggestions',
        version: history.length + 1
      }]);
    }, 1500);
  };

  // Mock function to apply a suggestion
  const applySuggestion = (id) => {
    const suggestion = suggestions.find(s => s.id === id);
    if (suggestion && suggestion.type === 'alternative') {
      // For demo purposes, just append the suggestion text
      setContent(content + '\n\n' + suggestion.text);
    }
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  // Handle export options
  const handleExport = (format) => {
    alert(`Exporting document as ${format.toUpperCase()}...`);
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="flex flex-col h-full">
          {/* App Logo & Title */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <PenTool className="text-blue-600" />
              {sidebarOpen && <span className="ml-2 font-bold">AI Writer</span>}
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronDown className={`transform ${sidebarOpen ? 'rotate-180' : ''}`} size={16} />
            </button>
          </div>

          {/* Sidebar Tabs */}
          <div className="flex border-b border-gray-200">
            <button 
              className={`flex-1 p-3 text-xs ${activeSidebarTab === 'format' ? 'bg-gray-100' : ''}`}
              onClick={() => setActiveSidebarTab('format')}
            >
              {sidebarOpen ? 'Format & Style' : <Settings size={16} className="mx-auto" />}
            </button>
            <button 
              className={`flex-1 p-3 text-xs ${activeSidebarTab === 'history' ? 'bg-gray-100' : ''}`}
              onClick={() => setActiveSidebarTab('history')}
            >
              {sidebarOpen ? 'History' : <History size={16} className="mx-auto" />}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeSidebarTab === 'format' && sidebarOpen && (
              <div className="p-4">
                {/* Document Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Document Type</label>
                  <select 
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    {documentTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tone */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Tone</label>
                  <select 
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    {toneOptions.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* Model Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">AI Model</label>
                  <select 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    {models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Export Options */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Export As</label>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleExport('markdown')}
                      className="flex-1 p-2 bg-gray-200 rounded-md text-xs hover:bg-gray-300"
                    >
                      Markdown
                    </button>
                    <button 
                      onClick={() => handleExport('pdf')}
                      className="flex-1 p-2 bg-gray-200 rounded-md text-xs hover:bg-gray-300"
                    >
                      PDF
                    </button>
                    <button 
                      onClick={() => handleExport('docx')}
                      className="flex-1 p-2 bg-gray-200 rounded-md text-xs hover:bg-gray-300"
                    >
                      DOCX
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSidebarTab === 'history' && sidebarOpen && (
              <div className="p-4">
                <h3 className="font-medium text-sm mb-2">Document History</h3>
                <div className="space-y-2">
                  {history.map(item => (
                    <div key={item.id} className="p-2 bg-gray-50 rounded-md text-xs">
                      <div className="flex justify-between">
                        <span>{item.action}</span>
                        <span className="text-gray-500">v{item.version}</span>
                      </div>
                      <div className="text-gray-500 mt-1">{item.timestamp}</div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-gray-500 text-xs p-2">No history yet</div>
                  )}
                </div>
              </div>
            )}

            {/* Saved Documents (Always visible if sidebar expanded) */}
            {sidebarOpen && (
              <div className="p-4 border-t border-gray-200">
                <h3 className="font-medium text-sm mb-2">Saved Documents</h3>
                <div className="space-y-2">
                  {savedDocuments.map(doc => (
                    <div key={doc.id} className="p-2 bg-gray-50 rounded-md text-xs hover:bg-gray-100 cursor-pointer">
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-gray-500 mt-1 flex justify-between">
                        <span>{doc.date}</span>
                        {documentTypes.find(t => t.id === doc.type)?.icon}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="font-medium bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 px-2 py-1 rounded"
            />
            <span className="mx-2 text-gray-400">|</span>
            <div className="flex items-center text-sm text-gray-500">
              {documentTypes.find(t => t.id === documentType)?.icon}
              <span className="ml-1">{documentTypes.find(t => t.id === documentType)?.name}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-md" title="Save">
              <Save size={18} className="text-gray-700" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-md" title="Download">
              <Download size={18} className="text-gray-700" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-md" title="Settings">
              <Settings size={18} className="text-gray-700" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing or type '/' for commands..."
                className="w-full h-full p-4 border-none focus:outline-none focus:ring-0 bg-transparent resize-none"
              />
            </div>
            
            {/* Editor Controls */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {content.split(/\s+/).filter(Boolean).length} words
              </div>
              <div className="flex space-x-2">
                <button 
                  className={`px-3 py-1 rounded-md text-sm flex items-center ${isGenerating ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                  onClick={generateSuggestions}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader className="mr-1 animate-spin" size={14} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1" size={14} />
                      Generate Suggestions
                    </>
                  )}
                </button>
                <button 
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm flex items-center hover:bg-blue-700"
                >
                  <Send className="mr-1" size={14} />
                  Improve Writing
                </button>
              </div>
            </div>
          </div>

          {/* Suggestions Panel */}
          <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200 font-medium text-sm">
              AI Suggestions
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {suggestions.length === 0 && !isGenerating ? (
                <div className="text-center text-gray-500 text-sm py-10">
                  <RefreshCw className="mx-auto mb-2" size={20} />
                  Click "Generate Suggestions" to get AI feedback on your writing
                </div>
              ) : isGenerating ? (
                <div className="text-center text-gray-500 text-sm py-10">
                  <Loader className="mx-auto mb-2 animate-spin" size={20} />
                  Analyzing your text...
                </div>
              ) : (
                suggestions.map(suggestion => (
                  <div 
                    key={suggestion.id} 
                    className={`p-3 rounded-md text-sm ${
                      suggestion.type === 'improvement' ? 'bg-blue-50' :
                      suggestion.type === 'grammar' ? 'bg-red-50' : 'bg-green-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-medium uppercase px-1.5 py-0.5 rounded ${
                        suggestion.type === 'improvement' ? 'bg-blue-100 text-blue-700' :
                        suggestion.type === 'grammar' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {suggestion.type}
                      </span>
                      <div className="flex space-x-1">
                        {suggestion.type === 'alternative' && (
                          <button 
                            onClick={() => applySuggestion(suggestion.id)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="Apply suggestion"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => setSuggestions(suggestions.filter(s => s.id !== suggestion.id))}
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                          title="Dismiss"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">{suggestion.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}