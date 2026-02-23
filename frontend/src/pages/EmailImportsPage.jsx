import { useState } from 'react';
import ImportQueueTable from '../components/ImportQueueTable';
import DraftReviewModal from '../components/DraftReviewModal';
import { Mail } from 'lucide-react';

export default function EmailImportsPage() {
  const [selectedImport, setSelectedImport] = useState(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Email Imports
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered load extraction from emails</p>
        </div>
      </div>

      <ImportQueueTable onViewImport={setSelectedImport} />

      {selectedImport && (
        <DraftReviewModal
          emailImport={selectedImport}
          onClose={() => setSelectedImport(null)}
        />
      )}
    </div>
  );
}
