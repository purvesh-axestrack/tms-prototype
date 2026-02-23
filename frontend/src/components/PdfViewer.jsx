import { getDocumentUrl } from '../services/api';
import { FileX } from 'lucide-react';

export default function PdfViewer({ documentId, className = '' }) {
  if (!documentId) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <FileX className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No PDF available</p>
        </div>
      </div>
    );
  }

  const url = getDocumentUrl(documentId);

  return (
    <iframe
      src={url}
      className={`w-full rounded-lg border ${className}`}
      title="PDF Viewer"
      style={{ minHeight: '500px' }}
    />
  );
}
