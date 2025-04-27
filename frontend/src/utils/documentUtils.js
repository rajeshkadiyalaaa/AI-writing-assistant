/**
 * Document utilities for the AI Writing Assistant
 */

/**
 * Estimate token count for a text
 * @param {string} text - The text to estimate tokens for
 * @returns {number} Estimated token count
 */
export const estimateTokens = (text) => {
  // Simple estimation: ~4 characters per token on average
  // This is a rough estimate - more accurate models are available
  return Math.ceil(text.length / 4);
};

/**
 * Download a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename to use
 */
export const downloadFile = (blob, filename) => {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Add to document, click to download, then clean up
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Save documents to localStorage
 * @param {Array} documents - The documents to save
 */
export const saveDocumentsToStorage = (documents) => {
  localStorage.setItem('saved_documents', JSON.stringify(documents));
};

/**
 * Load documents from localStorage
 * @returns {Array} The saved documents
 */
export const loadDocumentsFromStorage = () => {
  return JSON.parse(localStorage.getItem('saved_documents') || '[]');
};

/**
 * Convert content to different formats (Markdown, PDF, DOCX)
 * @param {string} content - The content to convert
 * @param {string} format - The format to convert to ('markdown', 'pdf', 'docx')
 * @param {string} title - The document title
 * @returns {Promise<Blob>} A promise resolving to a blob of the converted content
 */
export const convertContent = async (content, format, title) => {
  // This is a placeholder for actual conversion logic
  // In a real implementation, you would use libraries like jsPDF, docx, etc.
  
  switch (format) {
    case 'markdown':
      return new Blob([content], { type: 'text/markdown' });
      
    case 'pdf':
      // Placeholder for PDF conversion
      // In a real implementation, you would use jsPDF or similar
      const pdfContent = `# ${title}\n\n${content}`;
      return new Blob([pdfContent], { type: 'application/pdf' });
      
    case 'docx':
      // Placeholder for DOCX conversion
      // In a real implementation, you would use docx.js or similar
      const docxContent = `# ${title}\n\n${content}`;
      return new Blob([docxContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}; 