import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmailImports, retryImport } from '../services/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Mail, Eye, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'DRAFT_CREATED', label: 'Draft Created' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'SKIPPED', label: 'Skipped' },
];

const STATUS_BADGE_CLASSES = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  EXTRACTED: 'bg-cyan-100 text-cyan-700',
  DRAFT_CREATED: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  FAILED: 'bg-red-100 text-red-700',
  SKIPPED: 'bg-slate-100 text-slate-500',
};

function ConfidenceDot({ score }) {
  if (score === null || score === undefined) return null;
  const numScore = parseFloat(score);
  let color;
  if (numScore >= 0.8) color = 'bg-green-500';
  else if (numScore >= 0.5) color = 'bg-yellow-500';
  else color = 'bg-red-500';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1">
          <span className={`w-3 h-3 rounded-full ${color} inline-block`} />
          <span className="text-xs text-muted-foreground">{(numScore * 100).toFixed(0)}%</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Confidence: {numScore >= 0.8 ? 'High' : numScore >= 0.5 ? 'Medium' : 'Low'}
      </TooltipContent>
    </Tooltip>
  );
}

export default function ImportQueueTable({ onViewImport }) {
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [retryConfirm, setRetryConfirm] = useState(null);
  const queryClient = useQueryClient();

  const params = { page, limit: 20 };
  if (activeTab !== 'all') params.status = activeTab;

  const { data, isLoading } = useQuery({
    queryKey: ['email-imports', activeTab, page],
    queryFn: () => getEmailImports(params),
    refetchInterval: 5000,
  });

  const handleRetry = async (id) => {
    try {
      await retryImport(id);
      toast.success('Retry initiated');
      queryClient.invalidateQueries({ queryKey: ['email-imports'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    } catch (error) {
      toast.error('Retry failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const imports = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1 };

  return (
    <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPage(1); }}>
      <TabsList className="mb-4">
        {STATUS_TABS.map(tab => (
          <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
        ))}
      </TabsList>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Load</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </TableCell>
              </TableRow>
            ) : imports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Mail className="w-10 h-10 text-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">No imports found</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              imports.map(imp => (
                <TableRow key={imp.id} className="group cursor-pointer" onClick={() => onViewImport(imp)}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(imp.received_at || imp.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground" title={imp.from_address}>
                    {imp.from_address}
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate font-medium" title={imp.subject}>
                    {imp.subject}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE_CLASSES[imp.processing_status] || 'bg-slate-100 text-slate-500'}>
                      {imp.processing_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ConfidenceDot score={imp.confidence_score} />
                  </TableCell>
                  <TableCell>
                    {imp.load ? (
                      <span className="theme-brand-icon font-semibold">#{imp.load.id}</span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1.5 justify-end opacity-60 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {imp.processing_status === 'DRAFT_CREATED' && (
                        <Button size="xs" variant="secondary" onClick={() => onViewImport(imp)} className="theme-brand-badge">
                          Review
                        </Button>
                      )}
                      {['FAILED', 'SKIPPED'].includes(imp.processing_status) && (
                        <Button size="xs" variant="secondary" onClick={() => setRetryConfirm(imp.id)} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                          <RotateCw className="w-3 h-3" /> Retry
                        </Button>
                      )}
                      <Button size="xs" variant="secondary" onClick={() => onViewImport(imp)}>
                        <Eye className="w-3 h-3" /> View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!retryConfirm} onOpenChange={(open) => !open && setRetryConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry Extraction</AlertDialogTitle>
            <AlertDialogDescription>Retry extraction for this import?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleRetry(retryConfirm); setRetryConfirm(null); }}>
              Retry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
