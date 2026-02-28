import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { updateLoadStatus, updateLoad, deleteLoad, getDrivers, getCustomers, getCarriers, getVehicles, getLoadDocuments, uploadDocument, deleteDocument, getDocumentUrl, createSplitLoad, getUsers, getLoadById } from '../services/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, CheckCircle, AlertTriangle, Pencil, X, Save, Building, DollarSign, Plus, Trash2, Upload, FileText, Download, Snowflake, Link2, GitBranch, Eye, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import DispatchCard from './DispatchCard';
import AccessorialEditor from './AccessorialEditor';
import LocationAutocomplete from './LocationAutocomplete';
import LoadNotes from './LoadNotes';
import EditableField from './EditableField';
import EditableSelect from './EditableSelect';
import { EditableCombobox, Combobox } from '@/components/ui/combobox';
import useInlineLoadSave from '../hooks/useInlineLoadSave';
import { LOAD_STATUS_COLORS as statusColors, EQUIPMENT_TYPES, DOC_TYPES, REEFER_MODES, STOP_ACTION_TYPES, STOP_STATUSES, STOP_STATUS_COLORS, STOP_ACTION_TYPE_LABELS, STOP_ACTION_TYPE_COLORS, REEFER_MODE_LABELS, APPOINTMENT_TYPES, APPOINTMENT_TYPE_LABELS, STOP_REEFER_MODES, STOP_REEFER_MODE_LABELS, QUANTITY_TYPES, QUANTITY_TYPE_LABELS, RATE_TYPES } from '@/lib/constants';

export default function LoadDetail({ loadId, initialData, onClose }) {
  const [confirmTransition, setConfirmTransition] = useState(null);
  const [showBrokerDialog, setShowBrokerDialog] = useState(false);
  const [brokerCarrierId, setBrokerCarrierId] = useState('');
  const [brokerRate, setBrokerRate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingStops, setEditingStops] = useState(false);
  const [stopDraft, setStopDraft] = useState([]);
  const queryClient = useQueryClient();

  // Self-fetch with initialData for instant display
  const { data: load } = useQuery({
    queryKey: ['loads', loadId],
    queryFn: () => getLoadById(loadId),
    initialData,
    enabled: !!loadId,
  });

  const { saveField, saveFields, isSaving } = useInlineLoadSave(loadId);

  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: getDrivers });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: carriers = [] } = useQuery({ queryKey: ['carriers'], queryFn: getCarriers });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const trucks = vehicles.filter(v => v.type === 'TRACTOR' && v.status === 'ACTIVE');
  const trailers = vehicles.filter(v => v.type === 'TRAILER' && v.status === 'ACTIVE');

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ['documents', 'load', loadId],
    queryFn: () => getLoadDocuments(loadId),
    enabled: !!loadId,
  });

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('OTHER');
  const [previewDoc, setPreviewDoc] = useState(null);

  const splitMutation = useMutation({
    mutationFn: () => createSplitLoad(loadId),
    onSuccess: () => {
      toast.success('Split load created');
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['loads', loadId] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create split'),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      await uploadDocument(loadId, file, uploadDocType);
      toast.success('Document uploaded');
      refetchDocs();
      setUploadDocType('OTHER');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await deleteDocument(docId);
      toast.success('Document deleted');
      refetchDocs();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  const statusMutation = useMutation({
    mutationFn: (newStatus) => updateLoadStatus(loadId, newStatus),
    onSuccess: () => {
      toast.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['loads', loadId] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  const stopSaveMutation = useMutation({
    mutationFn: (stops) => updateLoad(loadId, { stops }),
    onSuccess: () => {
      toast.success('Stops updated');
      setEditingStops(false);
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['loads', loadId] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update stops'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLoad(loadId),
    onSuccess: () => {
      toast.success('Load deleted');
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete load'),
  });

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'BROKERED') {
      setBrokerCarrierId('');
      setBrokerRate('');
      setShowBrokerDialog(true);
    } else {
      setConfirmTransition(newStatus);
    }
  };

  const handleBrokerSubmit = () => {
    if (!brokerCarrierId) { toast.error('Please select a carrier'); return; }
    statusMutation.mutate({
      status: 'BROKERED',
      carrier_id: brokerCarrierId,
      carrier_rate: brokerRate ? parseFloat(brokerRate) : undefined,
    });
    setShowBrokerDialog(false);
  };

  // ── Stop editing helpers ──
  const startEditStops = () => {
    setStopDraft((load.stops || []).map(s => ({ ...s })));
    setEditingStops(true);
  };
  const updateStop = (index, field, value) => {
    const updated = [...stopDraft];
    updated[index] = { ...updated[index], [field]: value };
    setStopDraft(updated);
  };
  const addStop = () => setStopDraft([...stopDraft, {
    stop_type: 'DELIVERY', facility_name: '', address: '', city: '', state: '', zip: '',
    appointment_start: null, appointment_end: null,
  }]);
  const removeStop = (index) => {
    if (stopDraft.length <= 2) { toast.error('A load must have at least 2 stops'); return; }
    setStopDraft(stopDraft.filter((_, i) => i !== index));
  };

  if (!load) return null;

  // ── Build option arrays for EditableSelect ──
  const customerOpts = customers.map(c => ({ value: String(c.id), label: c.company_name }));
  const equipmentOpts = EQUIPMENT_TYPES.map(t => ({ value: t, label: t.replaceAll('_', ' ') }));
  const rateTypeOpts = RATE_TYPES.map(t => ({ value: t, label: t === 'CPM' ? 'Per Mile' : t.charAt(0) + t.slice(1).toLowerCase() }));
  const carrierOpts = carriers.map(c => ({ value: String(c.id), label: c.company_name }));
  const userOpts = users.map(u => ({ value: String(u.id), label: u.full_name }));

  return (
    <>
      <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <div className="theme-sidebar text-white p-6">
            <SheetHeader className="p-0">
              <div className="flex items-center gap-3 mb-1">
                <SheetTitle className="text-2xl font-display font-bold text-white">Load #{load.id}</SheetTitle>
                <Badge className={statusColors[load.status]}>
                  {load.status.replaceAll('_', ' ')}
                </Badge>
                {load.parent_load_id && <Badge className="bg-orange-100 text-orange-700">SPLIT LEG</Badge>}
                {load.child_loads?.length > 0 && <Badge className="bg-purple-100 text-purple-700">SPLIT PARENT</Badge>}
                {load.is_ltl && <Badge className="bg-cyan-100 text-cyan-700">LTL</Badge>}
                {isSaving && <Loader2 className="w-4 h-4 animate-spin text-white/60" />}
              </div>
              <SheetDescription className="theme-sidebar-text">
                <EditableField
                  value={load.reference_number}
                  onSave={(v) => saveField('reference_number', v)}
                  placeholder="Reference number"
                  className="text-white/90 hover:bg-white/10 [&_svg]:text-white/50"
                  disabled={!editing}
                />
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="p-6 space-y-5">
            {/* Actions bar */}
            <div className="flex items-center justify-end gap-2">
              {load.available_transitions?.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="theme-brand-bg text-white" disabled={statusMutation.isPending}>
                      {statusMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                      Move to <ChevronDown className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {load.available_transitions.map(transition => (
                      <DropdownMenuItem key={transition} onClick={() => handleStatusChange(transition)}>
                        {transition.replaceAll('_', ' ')}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!['COMPLETED', 'INVOICED'].includes(load.status) && (
                editing ? (
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                    <CheckCircle className="w-3.5 h-3.5" /> Done
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                )
              )}
              {['OPEN', 'CANCELLED'].includes(load.status) && (
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              )}
            </div>

            {/* Customer */}
            <Card className="py-4">
              <CardContent>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer</div>
                <EditableCombobox
                  value={load.customer_id ? String(load.customer_id) : null}
                  displayValue={load.customer_name}
                  onSave={(v) => saveField('customer_id', v)}
                  options={customerOpts}
                  placeholder="Select customer"
                  searchPlaceholder="Search customers..."
                  disabled={!editing}
                />
              </CardContent>
            </Card>

            {/* Dispatch — unified driver/truck/trailer/team */}
            <DispatchCard
              load={load}
              drivers={drivers}
              trucks={trucks}
              trailers={trailers}
              carriers={carriers}
              saveField={saveField}
              saveFields={saveFields}
              isSaving={isSaving}
              disabled={!editing}
            />

            {/* Brokered carrier */}
            {load.carrier_id && (
              <Card className="py-4 theme-brand-alert">
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Brokered Carrier</div>
                    <Badge className="theme-brand-badge">BROKERED</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg theme-brand-icon-box flex items-center justify-center">
                      <Building className="w-5 h-5 theme-brand-icon-color" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{load.carrier_name || 'Unknown Carrier'}</div>
                      {load.carrier_rate && (
                        <div className="text-xs text-muted-foreground">
                          Carrier rate: ${Number(load.carrier_rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          {' '}&middot;{' '}
                          <span className={Number(load.rate_amount) - Number(load.carrier_rate) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            Margin: ${(Number(load.rate_amount) - Number(load.carrier_rate)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Authority / Sales Agent / Customer Ref */}
            <Card className="py-4">
              <CardContent>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Load Metadata</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Booking Authority</Label>
                    <EditableCombobox
                      value={load.booking_authority_id ? String(load.booking_authority_id) : null}
                      displayValue={load.booking_authority_name}
                      onSave={(v) => saveField('booking_authority_id', v)}
                      options={carrierOpts}
                      placeholder="None"
                      searchPlaceholder="Search carriers..."
                      allowNone
                      disabled={!editing}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Sales Agent</Label>
                    <EditableCombobox
                      value={load.sales_agent_id ? String(load.sales_agent_id) : null}
                      displayValue={load.sales_agent_name}
                      onSave={(v) => saveField('sales_agent_id', v)}
                      options={userOpts}
                      placeholder="None"
                      searchPlaceholder="Search users..."
                      allowNone
                      disabled={!editing}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Customer Ref #</Label>
                    <EditableField
                      value={load.customer_ref_number}
                      onSave={(v) => saveField('customer_ref_number', v)}
                      placeholder="—"
                      disabled={!editing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Route Details / Stops */}
            <Card className="py-4">
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Route Details</div>
                  {editingStops ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={addStop}>
                        <Plus className="w-3.5 h-3.5" /> Add Stop
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingStops(false)}>
                        <X className="w-3.5 h-3.5" /> Cancel
                      </Button>
                      <Button size="sm" onClick={() => stopSaveMutation.mutate(stopDraft)} disabled={stopSaveMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                        {stopSaveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Stops
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={startEditStops} disabled={!editing}>
                      <Pencil className="w-3.5 h-3.5" /> Edit Stops
                    </Button>
                  )}
                </div>
                {editingStops ? (
                  <div className="space-y-3">
                    {stopDraft.map((stop, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>{index + 1}</div>
                            <Select value={stop.stop_type} onValueChange={(v) => updateStop(index, 'stop_type', v)}>
                              <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PICKUP">Pickup</SelectItem>
                                <SelectItem value="DELIVERY">Delivery</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeStop(index)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <LocationAutocomplete
                            value={stop.facility_name || ''}
                            onChange={(val) => updateStop(index, 'facility_name', val)}
                            onSelect={(loc) => {
                              const newStops = [...stopDraft];
                              newStops[index] = { ...newStops[index], facility_name: loc.facility_name, address: loc.address || '', city: loc.city || '', state: loc.state || '', zip: loc.zip || '' };
                              setStopDraft(newStops);
                            }}
                            className="h-7 text-sm"
                          />
                          <Input value={stop.address || ''} onChange={(e) => updateStop(index, 'address', e.target.value)} placeholder="Address" className="h-7 text-sm" />
                          <Input value={stop.city || ''} onChange={(e) => updateStop(index, 'city', e.target.value)} placeholder="City" className="h-7 text-sm" />
                          <div className="grid grid-cols-2 gap-2">
                            <Input value={stop.state || ''} onChange={(e) => updateStop(index, 'state', e.target.value)} placeholder="ST" maxLength={2} className="h-7 text-sm" />
                            <Input value={stop.zip || ''} onChange={(e) => updateStop(index, 'zip', e.target.value)} placeholder="ZIP" className="h-7 text-sm" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Appt Start</Label>
                            <Input type="datetime-local" value={stop.appointment_start ? stop.appointment_start.slice(0, 16) : ''} onChange={(e) => updateStop(index, 'appointment_start', e.target.value ? new Date(e.target.value).toISOString() : null)} className="h-7 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Appt End</Label>
                            <Input type="datetime-local" value={stop.appointment_end ? stop.appointment_end.slice(0, 16) : ''} onChange={(e) => updateStop(index, 'appointment_end', e.target.value ? new Date(e.target.value).toISOString() : null)} className="h-7 text-sm" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Action Type</Label>
                            <Select value={stop.action_type || 'NONE'} onValueChange={(v) => updateStop(index, 'action_type', v === 'NONE' ? null : v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">None</SelectItem>
                                {STOP_ACTION_TYPES.map(t => <SelectItem key={t} value={t}>{STOP_ACTION_TYPE_LABELS[t]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Stop Status</Label>
                            <Select value={stop.stop_status || 'NONE'} onValueChange={(v) => updateStop(index, 'stop_status', v === 'NONE' ? null : v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">None</SelectItem>
                                {STOP_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replaceAll('_', ' ')}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Free Time (min)</Label>
                            <Input type="number" value={stop.free_time_minutes ?? 120} onChange={(e) => updateStop(index, 'free_time_minutes', parseInt(e.target.value) || 0)} className="h-7 text-sm" />
                          </div>
                        </div>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Appt Type</Label>
                            <Select value={stop.appointment_type || 'APPOINTMENT'} onValueChange={(v) => updateStop(index, 'appointment_type', v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {APPOINTMENT_TYPES.map(t => <SelectItem key={t} value={t}>{APPOINTMENT_TYPE_LABELS[t]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Quantity</Label>
                            <Input type="number" step="0.01" value={stop.quantity || ''} onChange={(e) => updateStop(index, 'quantity', e.target.value)} className="h-7 text-sm" placeholder="0" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Qty Type</Label>
                            <Select value={stop.quantity_type || 'NONE'} onValueChange={(v) => updateStop(index, 'quantity_type', v === 'NONE' ? null : v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">None</SelectItem>
                                {QUANTITY_TYPES.map(t => <SelectItem key={t} value={t}>{QUANTITY_TYPE_LABELS[t]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Commodity</Label>
                            <Input value={stop.commodity || ''} onChange={(e) => updateStop(index, 'commodity', e.target.value)} className="h-7 text-sm" placeholder="e.g. General Freight" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Weight (lbs)</Label>
                            <Input type="number" step="0.01" value={stop.weight || ''} onChange={(e) => updateStop(index, 'weight', e.target.value)} className="h-7 text-sm" placeholder="0" />
                          </div>
                        </div>
                        {stop.stop_type === 'PICKUP' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Snowflake className="w-3 h-3 text-sky-500" /> Reefer Mode</Label>
                              <Select value={stop.stop_reefer_mode || 'NONE'} onValueChange={(v) => updateStop(index, 'stop_reefer_mode', v === 'NONE' ? null : v)}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">None</SelectItem>
                                  {STOP_REEFER_MODES.map(m => <SelectItem key={m} value={m}>{STOP_REEFER_MODE_LABELS[m]}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            {stop.stop_reefer_mode && (
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Set Temp (&deg;F)</Label>
                                <Input type="number" step="0.1" value={stop.stop_set_temp || ''} onChange={(e) => updateStop(index, 'stop_set_temp', e.target.value)} className="h-7 text-sm" placeholder="e.g. -10" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">BOL #</Label>
                            <Input value={stop.bol_number || ''} onChange={(e) => updateStop(index, 'bol_number', e.target.value)} className="h-7 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">PO #</Label>
                            <Input value={stop.po_number || ''} onChange={(e) => updateStop(index, 'po_number', e.target.value)} className="h-7 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{stop.stop_type === 'PICKUP' ? 'PU #' : 'DEL #'}</Label>
                            <Input value={stop.ref_number || ''} onChange={(e) => updateStop(index, 'ref_number', e.target.value)} className="h-7 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Instructions</Label>
                          <Input value={stop.instructions || ''} onChange={(e) => updateStop(index, 'instructions', e.target.value)} className="h-7 text-sm" placeholder="Stop-specific instructions" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {load.stops?.map((stop, index) => {
                      const detentionMin = (stop.arrival_time && stop.departure_time)
                        ? Math.max(0, Math.round((new Date(stop.departure_time) - new Date(stop.arrival_time)) / 60000) - (stop.free_time_minutes || 120))
                        : null;
                      return (
                        <div key={stop.id} className={`border rounded-lg p-3 border-l-4 ${stop.stop_type === 'PICKUP' ? 'border-l-blue-400' : 'border-l-green-400'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>{index + 1}</div>
                            <Badge className={stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                              {stop.stop_type}
                            </Badge>
                            {stop.action_type && (
                              <Badge className={STOP_ACTION_TYPE_COLORS[stop.action_type] || 'bg-slate-100 text-slate-600'}>
                                {STOP_ACTION_TYPE_LABELS[stop.action_type]}
                              </Badge>
                            )}
                            <Badge className={stop.appointment_type === 'FCFS' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}>
                              {APPOINTMENT_TYPE_LABELS[stop.appointment_type] || 'Appt'}
                            </Badge>
                            {stop.stop_status && (
                              <Badge className={STOP_STATUS_COLORS[stop.stop_status] || 'bg-slate-100 text-slate-600'}>
                                {stop.stop_status.replaceAll('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div>
                              {stop.facility_name && <div className="font-medium">{stop.facility_name}</div>}
                              <div className="text-muted-foreground text-xs">{stop.address}, {stop.city}, {stop.state} {stop.zip}</div>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {stop.appointment_start && (
                                <div>{new Date(stop.appointment_start).toLocaleString()}{stop.appointment_end && <> - {new Date(stop.appointment_end).toLocaleTimeString()}</>}</div>
                              )}
                              {stop.arrival_time && (
                                <div>Arr: {new Date(stop.arrival_time).toLocaleString()}{stop.departure_time && <> &middot; Dep: {new Date(stop.departure_time).toLocaleTimeString()}</>}</div>
                              )}
                              {detentionMin != null && detentionMin > 0 && (
                                <div className="text-red-600 font-medium">Detention: {Math.floor(detentionMin / 60)}h {detentionMin % 60}m</div>
                              )}
                            </div>
                          </div>
                          {(stop.commodity || stop.weight || stop.quantity || stop.bol_number || stop.po_number || stop.ref_number || stop.stop_reefer_mode || stop.instructions) && (
                            <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              {(stop.quantity || stop.commodity || stop.weight) && (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                  {stop.commodity && <span><span className="text-muted-foreground">Commodity:</span> {stop.commodity}</span>}
                                  {stop.quantity && <span><span className="text-muted-foreground">Qty:</span> {stop.quantity} {stop.quantity_type ? QUANTITY_TYPE_LABELS[stop.quantity_type] : ''}</span>}
                                  {stop.weight && <span><span className="text-muted-foreground">Weight:</span> {stop.weight} lbs</span>}
                                </div>
                              )}
                              {stop.stop_reefer_mode && (
                                <div className="flex items-center gap-1">
                                  <Snowflake className="w-3 h-3 text-sky-500" />
                                  <span>{STOP_REEFER_MODE_LABELS[stop.stop_reefer_mode]}</span>
                                  {stop.stop_set_temp != null && <span>@ {stop.stop_set_temp}&deg;F</span>}
                                </div>
                              )}
                              {(stop.bol_number || stop.po_number || stop.ref_number) && (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                  {stop.bol_number && <span><span className="text-muted-foreground">BOL:</span> {stop.bol_number}</span>}
                                  {stop.po_number && <span><span className="text-muted-foreground">PO:</span> {stop.po_number}</span>}
                                  {stop.ref_number && <span><span className="text-muted-foreground">{stop.stop_type === 'PICKUP' ? 'PU#' : 'DEL#'}:</span> {stop.ref_number}</span>}
                                </div>
                              )}
                              {stop.instructions && (
                                <div className="col-span-2 text-muted-foreground italic">{stop.instructions}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Split Loads */}
            {(load.parent_load || load.child_loads?.length > 0) && (
              <Card className="py-4 border-l-4 border-l-purple-400">
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-purple-500" />
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Split Loads</div>
                    </div>
                    {!load.parent_load_id && (
                      <Button size="sm" variant="outline" onClick={() => splitMutation.mutate()} disabled={splitMutation.isPending}>
                        {splitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Create Split
                      </Button>
                    )}
                  </div>
                  {load.parent_load && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-orange-50 rounded-lg text-sm">
                      <Link2 className="w-4 h-4 text-orange-500" />
                      <span>Parent Load: <span className="font-bold">#{load.parent_load.id}</span> ({load.parent_load.reference_number})</span>
                    </div>
                  )}
                  {load.child_loads?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Miles</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {load.child_loads.map(child => (
                          <TableRow key={child.id}>
                            <TableCell className="font-medium">#{child.id}</TableCell>
                            <TableCell className="text-sm">{child.reference_number}</TableCell>
                            <TableCell className="text-sm">{child.driver_name || '\u2014'}</TableCell>
                            <TableCell><Badge className={statusColors[child.status]}>{child.status.replaceAll('_', ' ')}</Badge></TableCell>
                            <TableCell className="text-sm">{child.loaded_miles || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Create Split button for standalone loads */}
            {!load.parent_load_id && !load.child_loads?.length && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => splitMutation.mutate()} disabled={splitMutation.isPending}>
                  {splitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                  Create Split Load
                </Button>
              </div>
            )}

            {/* Rate / Revenue / Miles — inline editable */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="py-4">
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Line Haul</div>
                  <EditableField
                    value={load.rate_amount}
                    onSave={(v) => saveField('rate_amount', v)}
                    type="number"
                    prefix="$"
                    formatDisplay={(v) => v != null ? Number(v).toLocaleString() : null}
                    className="text-2xl font-bold"
                    disabled={!editing}
                  />
                  <EditableSelect
                    value={load.rate_type}
                    displayValue={load.rate_type === 'CPM' ? 'Per Mile' : load.rate_type}
                    onSave={(v) => saveField('rate_type', v)}
                    options={rateTypeOpts}
                    className="mt-1"
                    disabled={!editing}
                  />
                </CardContent>
              </Card>
              <Card className="py-4 bg-green-50">
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
                  <div className="text-2xl font-bold text-green-700">${Number(load.total_amount || load.rate_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="mt-1">
                    <Label className="text-[10px] text-muted-foreground">Fuel Surcharge</Label>
                    <EditableField
                      value={load.fuel_surcharge_amount}
                      onSave={(v) => saveField('fuel_surcharge_amount', v)}
                      type="number"
                      prefix="$"
                      formatDisplay={(v) => v != null && v > 0 ? Number(v).toFixed(2) : '0.00'}
                      disabled={!editing}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="py-4">
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Miles / Weight</div>
                  <EditableField
                    value={load.loaded_miles}
                    onSave={(v) => saveField('loaded_miles', v)}
                    type="number"
                    suffix="mi"
                    className="text-lg font-bold"
                    disabled={!editing}
                  />
                  <EditableField
                    value={load.weight}
                    onSave={(v) => saveField('weight', v)}
                    type="number"
                    suffix="lbs"
                    formatDisplay={(v) => v != null ? Number(v).toLocaleString() : null}
                    className="text-xs text-muted-foreground"
                    disabled={!editing}
                  />
                </CardContent>
              </Card>
            </div>

            <AccessorialEditor loadId={load.id} />

            {/* Documents */}
            <Card className="py-4">
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Documents</div>
                  <div className="flex items-center gap-2">
                    <Select value={uploadDocType} onValueChange={setUploadDocType}>
                      <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-7 text-xs relative" disabled={uploadingDoc}>
                      {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                      Upload
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploadingDoc} />
                    </Button>
                  </div>
                </div>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents attached</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                          <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate hover:underline">{doc.filename}</div>
                            <div className="text-xs text-muted-foreground">
                              {doc.doc_type.replace(/_/g, ' ')} &middot; {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewDoc(doc)} title="Preview">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                            <a href={getDocumentUrl(doc.id)} target="_blank" rel="noopener noreferrer">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteDoc(doc.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Load Notes */}
            <LoadNotes loadId={load.id} />

            {/* Invoice status */}
            {load.invoice_id ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Invoiced (Invoice #{load.invoice_id})</span>
              </div>
            ) : load.status === 'COMPLETED' ? (
              <div className="flex items-center gap-2 p-3 theme-brand-alert rounded-xl">
                <AlertTriangle className="w-4 h-4 theme-brand-icon" />
                <span className="text-sm theme-brand-alert-text font-medium">Uninvoiced &mdash; Ready for billing</span>
              </div>
            ) : null}

            {/* Additional Details — inline editable */}
            <Card className="py-4">
              <CardContent>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Additional Details</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Commodity</Label>
                    <EditableField value={load.commodity} onSave={(v) => saveField('commodity', v)} placeholder="—" disabled={!editing} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Equipment</Label>
                    <EditableCombobox
                      value={load.equipment_type}
                      displayValue={load.equipment_type?.replaceAll('_', ' ')}
                      onSave={(v) => saveField('equipment_type', v)}
                      options={equipmentOpts}
                      placeholder="None"
                      searchPlaceholder="Search equipment..."
                      allowNone
                      disabled={!editing}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Empty Miles</Label>
                    <EditableField value={load.empty_miles} onSave={(v) => saveField('empty_miles', v)} type="number" disabled={!editing} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Special Instructions</Label>
                    <EditableField value={load.special_instructions} onSave={(v) => saveField('special_instructions', v)} placeholder="—" disabled={!editing} />
                  </div>
                  <div className="col-span-2 flex gap-6 pt-1">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!load.is_ltl}
                        onCheckedChange={(v) => saveField('is_ltl', !!v)}
                        disabled={!editing}
                      />
                      LTL
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!load.exclude_from_settlement}
                        onCheckedChange={(v) => saveField('exclude_from_settlement', !!v)}
                        disabled={!editing}
                      />
                      Exclude from Settlement
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Load #{load.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete load {load.reference_number} and all its stops, accessorials, and documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Load'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmTransition} onOpenChange={(open) => !open && setConfirmTransition(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Change status to {confirmTransition?.replaceAll('_', ' ')}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { statusMutation.mutate(confirmTransition); setConfirmTransition(null); }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showBrokerDialog} onOpenChange={setShowBrokerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broker Load #{load.id}</DialogTitle>
            <DialogDescription>
              Select a carrier and set the carrier rate. Margin is calculated as customer rate minus carrier rate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Carrier *</Label>
              <Combobox
                value={brokerCarrierId}
                onValueChange={(v) => setBrokerCarrierId(v || '')}
                options={carriers.filter(c => c.status !== 'INACTIVE').map(c => ({
                  value: c.id,
                  label: `${c.company_name}${c.mc_number ? ` (MC# ${c.mc_number})` : ''}`,
                }))}
                placeholder="Select a carrier..."
                searchPlaceholder="Search carriers..."
              />
            </div>
            <div className="space-y-2">
              <Label>Carrier Rate ($)</Label>
              <Input type="number" step="0.01" value={brokerRate} onChange={(e) => setBrokerRate(e.target.value)} placeholder="e.g. 2500.00" />
            </div>
            {brokerRate && (
              <Card className="py-3">
                <CardContent className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <div>Customer rate: <span className="font-medium text-foreground">${Number(load.rate_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    <div>Carrier rate: <span className="font-medium text-foreground">${Number(brokerRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Margin</div>
                    <div className={`text-xl font-bold ${Number(load.rate_amount) - Number(brokerRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(Number(load.rate_amount) - Number(brokerRate)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrokerDialog(false)}>Cancel</Button>
            <Button onClick={handleBrokerSubmit} disabled={statusMutation.isPending} className="theme-brand-bg text-white">
              {statusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Broker Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.filename}</DialogTitle>
            <DialogDescription>
              {previewDoc?.doc_type?.replace(/_/g, ' ')} &middot; {previewDoc?.file_size ? `${(previewDoc.file_size / 1024).toFixed(0)} KB` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-[60vh]">
            {previewDoc && (() => {
              const url = getDocumentUrl(previewDoc.id);
              const ext = previewDoc.filename?.split('.').pop()?.toLowerCase();
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
              const isPdf = ext === 'pdf';
              if (isPdf) return <iframe src={url} className="w-full h-[60vh] rounded-lg border" title={previewDoc.filename} />;
              if (isImage) return <img src={url} alt={previewDoc.filename} className="max-w-full max-h-[60vh] mx-auto rounded-lg object-contain" />;
              return (
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
                  <FileText className="w-12 h-12" />
                  <p>Preview not available for this file type</p>
                  <Button asChild><a href={url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /> Download File</a></Button>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
