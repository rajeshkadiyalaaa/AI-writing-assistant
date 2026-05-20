import { useState, useRef } from 'react';
import useClickOutside from './useClickOutside';

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

function htmlFallback(title, content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;line-height:1.6;max-width:800px;margin:2rem auto;padding:0 1rem}
h1{font-size:1.5rem}pre{white-space:pre-wrap}</style></head>
<body><h1>${title}</h1><pre>${content}</pre></body></html>`;
}

export default function useExport({ content, documentTitle, showNotification }) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  useClickOutside(exportMenuRef, showExportMenu, () => setShowExportMenu(false));

  const handleExport = (format) => {
    if (!content.trim()) {
      showNotification('Add content before exporting', 'warning');
      return;
    }

    const filename = documentTitle.replace(/\s+/g, '_');

    if (format === 'markdown') {
      downloadFile(new Blob([content], { type: 'text/plain;charset=utf-8' }), `${filename}.md`);
      return;
    }

    if (format === 'pdf') {
      import('jspdf')
        .then(({ default: jsPDF }) => import('jspdf-autotable').then(() => {
          const doc = new jsPDF();
          doc.setFontSize(18);
          doc.text(documentTitle, 14, 22);
          doc.setFontSize(12);
          doc.text(doc.splitTextToSize(content, 180), 14, 30);
          downloadFile(doc.output('blob'), `${filename}.pdf`);
        }))
        .catch(() => {
          downloadFile(
            new Blob([htmlFallback(documentTitle, content)], { type: 'text/html' }),
            `${filename}.html`
          );
          showNotification('PDF failed — saved as HTML', 'warning');
        });
      return;
    }

    if (format === 'docx') {
      import('docx')
        .then((docx) => {
          const { Document, Paragraph, Packer } = docx;
          const doc = new Document({
            sections: [{
              children: content.split('\n\n').map((para) => new Paragraph({ text: para })),
            }],
          });
          return Packer.toBlob(doc).then((blob) => {
            downloadFile(
              new Blob([blob], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              }),
              `${filename}.docx`
            );
          });
        })
        .catch(() => {
          downloadFile(
            new Blob([htmlFallback(documentTitle, content)], { type: 'text/html' }),
            `${filename}.html`
          );
          showNotification('DOCX failed — saved as HTML', 'warning');
        });
    }
  };

  return { showExportMenu, setShowExportMenu, exportMenuRef, handleExport };
}
