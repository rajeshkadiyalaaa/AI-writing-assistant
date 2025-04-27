/**
 * Custom hook for document management
 */
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  saveDocumentsToStorage, 
  loadDocumentsFromStorage, 
  convertContent, 
  downloadFile 
} from '../utils/documentUtils';

/**
 * Custom hook for document management
 * @param {Function} showNotification - Function to show notifications
 * @returns {Object} Document management state and functions
 */
export const useDocuments = (showNotification) => {
  // Document state
  const [title, setTitle] = useState('Untitled Document');
  const [content, setContent] = useState('');
  const [documentType, setDocumentType] = useState('general');
  const [tone, setTone] = useState('professional');
  const [savedDocuments, setSavedDocuments] = useState(loadDocumentsFromStorage);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [history, setHistory] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Load saved documents from localStorage on mount
  useEffect(() => {
    setSavedDocuments(loadDocumentsFromStorage());
  }, []);

  /**
   * Create a new document
   */
  const createNewDocument = () => {
    // Confirm if there are unsaved changes
    if (content.trim() && !window.confirm('Are you sure you want to create a new document? Any unsaved changes will be lost.')) {
      return;
    }
    
    // Reset document state
    setTitle('Untitled Document');
    setContent('');
    setDocumentType('general');
    setTone('professional');
    setCurrentDocumentId(null);
    setHistory([]);
    
    // Show confirmation
    showNotification('New document created', 'success');
  };

  /**
   * Save the current document
   * @returns {string} The ID of the saved document
   */
  const saveDocument = () => {
    // Generate a new ID if needed
    const documentId = currentDocumentId || uuidv4();
    
    // Create document object
    const document = {
      id: documentId,
      title,
      content,
      type: documentType,
      tone,
      date: new Date().toLocaleDateString(),
      lastEdited: new Date().toISOString()
    };
    
    // Update saved documents
    const updatedDocuments = currentDocumentId
      ? savedDocuments.map(doc => doc.id === currentDocumentId ? document : doc)
      : [document, ...savedDocuments];
    
    // Update state and localStorage
    setSavedDocuments(updatedDocuments);
    saveDocumentsToStorage(updatedDocuments);
    setCurrentDocumentId(documentId);
    
    // Add to history
    const now = new Date();
    setHistory([
      ...history,
      {
        id: history.length + 1,
        timestamp: now.toLocaleTimeString(),
        action: currentDocumentId ? 'Document updated' : 'Document saved',
        version: history.length + 1
      }
    ]);
    
    // Show confirmation
    showNotification('Document saved successfully', 'success');
    
    return documentId;
  };

  /**
   * Load a document by ID
   * @param {string} id - The document ID to load
   * @returns {boolean} Whether the load was successful
   */
  const loadDocument = (id) => {
    // Confirm if there are unsaved changes
    if (content.trim() && currentDocumentId !== id && 
        !window.confirm('Are you sure you want to load another document? Any unsaved changes will be lost.')) {
      return false;
    }
    
    // Find document
    const document = savedDocuments.find(doc => doc.id === id);
    
    if (!document) {
      showNotification('Document not found', 'error');
      return false;
    }
    
    // Update state
    setTitle(document.title);
    setContent(document.content);
    setDocumentType(document.type || 'general');
    setTone(document.tone || 'professional');
    setCurrentDocumentId(id);
    setHistory([{
      id: 1,
      timestamp: new Date().toLocaleTimeString(),
      action: 'Document loaded',
      version: 1
    }]);
    
    // Show confirmation
    showNotification(`Document "${document.title}" loaded`, 'success');
    return true;
  };

  /**
   * Delete a document by ID
   * @param {string} id - The document ID to delete
   * @returns {boolean} Whether the deletion was successful
   */
  const deleteDocument = (id) => {
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return false;
    }
    
    // Find document
    const document = savedDocuments.find(doc => doc.id === id);
    
    if (!document) {
      showNotification('Document not found', 'error');
      return false;
    }
    
    // Update state and localStorage
    const updatedDocuments = savedDocuments.filter(doc => doc.id !== id);
    setSavedDocuments(updatedDocuments);
    saveDocumentsToStorage(updatedDocuments);
    
    // Reset current document if it was deleted
    if (currentDocumentId === id) {
      setTitle('Untitled Document');
      setContent('');
      setCurrentDocumentId(null);
      setHistory([]);
    }
    
    // Show confirmation
    showNotification(`Document "${document.title}" deleted`, 'success');
    return true;
  };

  /**
   * Export the current document
   * @param {string} format - The format to export to ('markdown', 'pdf', 'docx')
   * @returns {Promise<boolean>} Whether the export was successful
   */
  const handleExport = async (format) => {
    if (!content.trim()) {
      showNotification('Cannot export empty document', 'error');
      return false;
    }
    
    setIsExporting(true);
    
    try {
      const blob = await convertContent(content, format, title);
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
      
      downloadFile(blob, filename);
      
      // Add to history
      const now = new Date();
      setHistory([
        ...history,
        {
          id: history.length + 1,
          timestamp: now.toLocaleTimeString(),
          action: `Exported as ${format.toUpperCase()}`,
          version: history.length + 1
        }
      ]);
      
      showNotification(`Document exported as ${format.toUpperCase()}`, 'success');
      return true;
    } catch (error) {
      console.error(`Error exporting as ${format}:`, error);
      showNotification(`Failed to export as ${format}: ${error.message}`, 'error');
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    // State
    title,
    content,
    documentType,
    tone,
    savedDocuments,
    currentDocumentId,
    history,
    isExporting,
    
    // State setters
    setTitle,
    setContent,
    setDocumentType,
    setTone,
    setHistory,
    
    // Functions
    createNewDocument,
    saveDocument,
    loadDocument,
    deleteDocument,
    handleExport
  };
}; 