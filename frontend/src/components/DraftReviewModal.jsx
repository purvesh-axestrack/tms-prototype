import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmailImportById, approveImport, rejectImport, retryImport, getCustomers } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import PdfViewer from './PdfViewer';

function ConfidenceDot({ score }) {
  if (score === null || score === undefined) return null;
  const numScore = parseFloat(score);
  let color, label;
  if (numScore >= 0.8) { color = 'bg-green-500'; label = 'High'; }
  else if (numScore >= 0.5) { color = 'bg-yellow-500'; label = 'Medium'; }
  else { color = 'bg-red-500'; label = 'Low'; }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`w-2.5 h-2.5 rounded-full ${color} inline-block`} />
      </TooltipTrigger>
      <TooltipContent>{label}: {(numScore * 100).toFixed(0)}%</TooltipContent>
    </Tooltip>
  );
}

export default function DraftReviewModal({ emailImport, onClose }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const { data: importDetail } = useQuery({
    queryKey: ['email-import', emailImport.id],
    queryFn: () => getEmailImportById(emailImport.id),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const extracted = importDetail?.extracted_data
    ? (typeof importDetail.extracted_data === 'string'
      ? JSON.parse(importDetail.extracted_data)
      : importDetail.extracted_data)
    : null;

  const load = importDetail?.load;
  const docs = importDetail?.documents || [];
  const firstDoc = docs[0];

  const [form, setForm] = useState({});

  useEffect(() => {
    if (load) {
      setForm({
        reference_number: load.reference_number || '',
        customer_id: load.customer_id || '',
        rate_amount: load.rate_amount || 0,
        rate_type: load.rate_type || 'FLAT',
        loaded_miles: load.loaded_miles || 0,
        commodity: load.commodity || '',
        weight: load.weight || 0,
        equipment_type: load.equipment_type || 'Dry Van',
        special_instructions: load.special_instructions || '',
        stops: load.stops || [],
      });
    }
  }, [load]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateStop = (index, field, value) => {
    setForm(prev => {
      const stops = [...prev.stops];
      stops[index] = { ...stops[index], [field]: value };
      return { ...prev, stops };
    });
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await approveImport(emailImport.id, form);
      toast.success('Load approved and created');
      queryClient.invalidateQueries({ queryKey: ['email-imports'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    } catch (error) {
      toast.error('Approve failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await rejectImport(emailImport.id);
      toast.success('Import rejected');
      queryClient.invalidateQueries({ queryKey: ['email-imports'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    } catch (error) {
      toast.error('Reject failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = async () => {
    setSaving(true);
    try {
      await retryImport(emailImport.id);
      toast.success('Re-extraction initiated');
      queryClient.invalidateQueries({ queryKey: ['email-imports'] });
      queryClient.invalidateQueries({ queryKey: ['email-import', emailImport.id] });
    } catch (error) {
      toast.error('Retry failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const getFieldConfidence = (fieldName) => extracted?.data?.[fieldName]?.confidence;
  const isDraft = importDetail?.processing_status === 'DRAFT_CREATED';

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-7xl max-h-[95vh] flex flex-col p-0" showCloseButton={true}>
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-display">
              {isDraft ? 'Review Draft Load' : 'Import Details'}
              {load && <span className="ml-2 text-amber-500">#{load.id}</span>}
            </DialogTitle>
            <DialogDescription>
              From: {importDetail?.from_address} &middot; Subject: {importDetail?.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto flex border-t">
            <div className="w-3/5 p-6 overflow-auto space-y-4">
              {importDetail?.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {importDetail.error_message}
                </div>
              )}

              {extracted?.confidence != null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">Overall Confidence:</span>
                  <ConfidenceDot score={extracted.confidence} />
                  <span className="text-sm text-muted-foreground">{(parseFloat(extracted.confidence) * 100).toFixed(0)}%</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1"><Label className="text-xs">Reference Number</Label><ConfidenceDot score={getFieldConfidence('reference_number')} /></div>
                  <Input type="text" value={form.reference_number || ''} onChange={(e) => updateField('reference_number', e.target.value)} disabled={!isDraft} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1"><Label className="text-xs">Customer</Label><ConfidenceDot score={getFieldConfidence('broker_name')} /></div>
                  <Select value={form.customer_id ? String(form.customer_id) : undefined} onValueChange={(v) => updateField('customer_id', v)} disabled={!isDraft}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="-- Select Customer --" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1"><Label className="text-xs">Rate ($)</Label><ConfidenceDot score={getFieldConfidence('rate_amount')} /></div>
                  <Input type="number" value={form.rate_amount || ''} onChange={(e) => updateField('rate_amount', parseFloat(e.target.value) || 0)} disabled={!isDraft} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1"><Label className="text-xs">Rate Type</Label><ConfidenceDot score={getFieldConfidence('rate_type')} /></div>
                  <Select value={form.rate_type || 'FLAT'} onValueChange={(v) => updateField('rate_type', v)} disabled={!isDraft}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLAT">Flat</SelectItem>
                      <SelectItem value="CPM">Per Mile</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1"><Label className="text-xs">Equipment</Label><ConfidenceDot score={getFieldConfidence('equipment_type')} /></div>
                  <Input type="text" value={form.equipment_type || ''} onChange={(e) => updateField('equipment_type', e.target.value)} disabled={!isDraft} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1"><Label className="text-xs">Commodity</Label><ConfidenceDot score={getFieldConfidence('commodity')} /></div>
                  <Input type="text" value={form.commodity || ''} onChange={(e) => updateField('commodity', e.target.value)} disabled={!isDraft} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1"><Label className="text-xs">Weight (lbs)</Label><ConfidenceDot score={getFieldConfidence('weight')} /></div>
                  <Input type="number" value={form.weight || ''} onChange={(e) => updateField('weight', parseInt(e.target.value) || 0)} disabled={!isDraft} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1"><Label className="text-xs">Loaded Miles</Label><ConfidenceDot score={getFieldConfidence('loaded_miles')} /></div>
                  <Input type="number" value={form.loaded_miles || ''} onChange={(e) => updateField('loaded_miles', parseInt(e.target.value) || 0)} disabled={!isDraft} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1"><Label className="text-xs">Special Instructions</Label><ConfidenceDot score={getFieldConfidence('special_instructions')} /></div>
                <Textarea value={form.special_instructions || ''} onChange={(e) => updateField('special_instructions', e.target.value)} disabled={!isDraft} rows={2} />
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Stops</h4>
                <div className="space-y-3">
                  {(form.stops || []).map((stop, index) => (
                    <Card key={stop.id || index} className="py-3">
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {index + 1}
                          </span>
                          <Badge className={stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                            {stop.stop_type}
                          </Badge>
                          {extracted?.data?.stops?.[index]?.confidence != null && (
                            <ConfidenceDot score={extracted.data.stops[index].confidence} />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <Input value={stop.facility_name || ''} onChange={(e) => updateStop(index, 'facility_name', e.target.value)} placeholder="Facility" disabled={!isDraft} className="h-8" />
                          <Input value={stop.address || ''} onChange={(e) => updateStop(index, 'address', e.target.value)} placeholder="Address" disabled={!isDraft} className="h-8" />
                          <Input value={stop.city || ''} onChange={(e) => updateStop(index, 'city', e.target.value)} placeholder="City" disabled={!isDraft} className="h-8" />
                          <div className="flex gap-2">
                            <Input value={stop.state || ''} onChange={(e) => updateStop(index, 'state', e.target.value)} placeholder="ST" disabled={!isDraft} className="h-8 w-16" />
                            <Input value={stop.zip || ''} onChange={(e) => updateStop(index, 'zip', e.target.value)} placeholder="ZIP" disabled={!isDraft} className="h-8 flex-1" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div className="space-y-1">
                            <Label className="text-xs">Appt Start</Label>
                            <Input type="datetime-local" value={stop.appointment_start ? new Date(stop.appointment_start).toISOString().slice(0, 16) : ''} onChange={(e) => updateStop(index, 'appointment_start', e.target.value ? new Date(e.target.value).toISOString() : null)} disabled={!isDraft} className="h-8" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Appt End</Label>
                            <Input type="datetime-local" value={stop.appointment_end ? new Date(stop.appointment_end).toISOString().slice(0, 16) : ''} onChange={(e) => updateStop(index, 'appointment_end', e.target.value ? new Date(e.target.value).toISOString() : null)} disabled={!isDraft} className="h-8" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-2/5 p-4 bg-muted flex flex-col">
              <h4 className="text-sm font-semibold mb-2">Original Document</h4>
              <PdfViewer documentId={firstDoc?.id} className="flex-1" />
            </div>
          </div>

          {isDraft && (
            <div className="border-t px-6 py-3 flex items-center justify-between bg-muted shrink-0">
              <Button variant="outline" onClick={() => setConfirmAction('retry')} disabled={saving}>
                <RotateCw className="w-4 h-4" /> Re-extract
              </Button>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={() => setConfirmAction('reject')} disabled={saving}>
                  Reject
                </Button>
                <Button onClick={() => setConfirmAction('approve')} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Approve & Create Load
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' && 'Approve Load'}
              {confirmAction === 'reject' && 'Reject Import'}
              {confirmAction === 'retry' && 'Re-extract Data'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve' && 'Approve this load and move to Open status?'}
              {confirmAction === 'reject' && 'Reject this import? The draft load will be cancelled.'}
              {confirmAction === 'retry' && 'Re-extract data from the PDF?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmAction === 'reject' ? 'destructive' : 'default'}
              onClick={() => {
                if (confirmAction === 'approve') handleApprove();
                else if (confirmAction === 'reject') handleReject();
                else if (confirmAction === 'retry') handleRetry();
                setConfirmAction(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
