import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { updateLoadStatus, updateLoad, deleteLoad, getDrivers, getCustomers, getCarriers, getVehicles, getLoadDocuments, uploadDocument, deleteDocument, getDocumentUrl, createSplitLoad } from '../services/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPlus, CheckCircle, AlertTriangle, Pencil, X, Save, Building, DollarSign, Plus, Trash2, GripVertical, Upload, FileText, Download, Snowflake, Link2, GitBranch, Eye } from 'lucide-react';
import { toast } from 'sonner';
import DriverAssignModal from './DriverAssignModal';
import AccessorialEditor from './AccessorialEditor';
import LocationAutocomplete from './LocationAutocomplete';
import { LOAD_STATUS_COLORS as statusColors, EQUIPMENT_TYPES, DOC_TYPES, REEFER_MODES, STOP_ACTION_TYPES, STOP_STATUSES, STOP_STATUS_COLORS, STOP_ACTION_TYPE_LABELS, STOP_ACTION_TYPE_COLORS, REEFER_MODE_LABELS } from '@/lib/constants';

export default function LoadDetail({ load, onClose, onUpdate }) {
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [confirmTransition, setConfirmTransition] = useState(null);
  const [showBrokerDialog, setShowBrokerDialog] = useState(false);
  const [brokerCarrierId, setBrokerCarrierId] = useState('');
  const [brokerRate, setBrokerRate] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    enabled: editing,
  });

  const { data: carriers = [] } = useQuery({
    queryKey: ['carriers'],
    queryFn: getCarriers,
    enabled: showBrokerDialog || !!load.carrier_id,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    enabled: editing,
  });

  const tractors = vehicles.filter(v => v.type === 'TRACTOR' && v.status === 'ACTIVE');
  const trailers = vehicles.filter(v => v.type === 'TRAILER' && v.status === 'ACTIVE');

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ['documents', 'load', load.id],
    queryFn: () => getLoadDocuments(load.id),
  });

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('OTHER');
  const [previewDoc, setPreviewDoc] = useState(null);

  const splitMutation = useMutation({
    mutationFn: () => createSplitLoad(load.id),
    onSuccess: () => {
      toast.success('Split load created');
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      onUpdate();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create split');
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      await uploadDocument(load.id, file, uploadDocType);
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
    mutationFn: (newStatus) => updateLoadStatus(load.id, newStatus),
    onSuccess: () => {
      toast.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onUpdate();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update status');
    },
  });

  const editMutation = useMutation({
    mutationFn: (updates) => updateLoad(load.id, updates),
    onSuccess: () => {
      toast.success('Load updated');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onUpdate();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update load');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLoad(load.id),
    onSuccess: () => {
      toast.success('Load deleted');
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete load');
    },
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
    if (!brokerCarrierId) {
      toast.error('Please select a carrier');
      return;
    }
    statusMutation.mutate({
      status: 'BROKERED',
      carrier_id: brokerCarrierId,
      carrier_rate: brokerRate ? parseFloat(brokerRate) : undefined,
    });
    setShowBrokerDialog(false);
  };

  const startEditing = () => {
    setEditData({
      reference_number: load.reference_number || '',
      customer_id: load.customer_id || '',
      rate_amount: load.rate_amount || '',
      rate_type: load.rate_type || 'FLAT',
      loaded_miles: load.loaded_miles || 0,
      empty_miles: load.empty_miles || 0,
      commodity: load.commodity || '',
      weight: load.weight || 0,
      equipment_type: load.equipment_type || 'DRY_VAN',
      fuel_surcharge_amount: load.fuel_surcharge_amount || 0,
      special_instructions: load.special_instructions || '',
      truck_id: load.truck_id || '',
      trailer_id: load.trailer_id || '',
      stops: (load.stops || []).map(s => ({ ...s })),
      // Domain depth fields
      is_reefer: load.is_reefer || false,
      reefer_mode: load.reefer_mode || '',
      set_temp: load.set_temp || '',
      reefer_fuel_pct: load.reefer_fuel_pct || '',
      bol_number: load.bol_number || '',
      po_number: load.po_number || '',
      pro_number: load.pro_number || '',
      pickup_number: load.pickup_number || '',
      delivery_number: load.delivery_number || '',
      is_ltl: load.is_ltl || false,
      exclude_from_settlement: load.exclude_from_settlement || false,
      driver2_id: load.driver2_id || '',
    });
    setEditing(true);
  };

  const handleSave = () => {
    const { stops, ...fields } = editData;
    editMutation.mutate({ ...fields, stops });
  };

  const updateStop = (index, field, value) => {
    const newStops = [...editData.stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setEditData({ ...editData, stops: newStops });
  };

  const addStop = () => {
    const newStops = [...editData.stops, {
      stop_type: 'DELIVERY',
      facility_name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      appointment_start: null,
      appointment_end: null,
    }];
    setEditData({ ...editData, stops: newStops });
  };

  const removeStop = (index) => {
    if (editData.stops.length <= 2) {
      toast.error('A load must have at least 2 stops');
      return;
    }
    const newStops = editData.stops.filter((_, i) => i !== index);
    setEditData({ ...editData, stops: newStops });
  };

  const currentDriver = drivers.find(d => d.id === load.driver_id);

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
              </div>
              <SheetDescription className="theme-sidebar-text">
                {editing ? (
                  <Input
                    value={editData.reference_number}
                    onChange={(e) => setEditData({ ...editData, reference_number: e.target.value })}
                    placeholder="Reference number"
                    className="h-7 text-sm theme-sidebar-light text-white mt-1" style={{ borderColor: 'var(--theme-sidebar-border)' }}
                  />
                ) : (
                  load.reference_number
                )}
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {!editing && load.available_transitions?.length > 0 && (
                  <>
                    <span className="text-xs font-medium text-muted-foreground mr-1">Actions:</span>
                    {load.available_transitions.map(transition => (
                      <Button
                        key={transition}
                        size="sm"
                        onClick={() => handleStatusChange(transition)}
                        disabled={statusMutation.isPending}
                        className="theme-brand-bg text-white"
                      >
                        {statusMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        {transition.replaceAll('_', ' ')}
                      </Button>
                    ))}
                  </>
                )}
              </div>
              {editing ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                    <X className="w-3.5 h-3.5" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={editMutation.isPending} className="bg-green-600 hover:bg-green-700">
                    {editMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={startEditing}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  {['OPEN', 'CANCELLED'].includes(load.status) && (
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="py-4">
                <CardContent>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer</div>
                  {editing ? (
                    <Select
                      value={editData.customer_id ? String(editData.customer_id) : undefined}
                      onValueChange={(v) => setEditData({ ...editData, customer_id: v })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-lg font-bold">{load.customer_name}</div>
                  )}
                </CardContent>
              </Card>
              <Card className="py-4">
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Driver</div>
                    {!load.driver_id && (
                      <Button size="xs" onClick={() => setShowDriverModal(true)} className="theme-brand-bg text-white">
                        <UserPlus className="w-3 h-3" />
                        Assign
                      </Button>
                    )}
                  </div>
                  {load.driver_name ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-bold theme-brand-badge">
                          {load.driver_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold">{load.driver_name}</div>
                        {currentDriver && (
                          <div className="text-xs text-muted-foreground">{currentDriver.phone} &middot; {currentDriver.pay_model}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground italic text-sm">Not assigned</div>
                  )}
                </CardContent>
              </Card>
            </div>

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

            {/* Reference Numbers */}
            {(editing || load.bol_number || load.po_number || load.pro_number || load.pickup_number || load.delivery_number) && (
              <Card className="py-4">
                <CardContent>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Reference Numbers</div>
                  {editing ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {[['bol_number', 'BOL #'], ['po_number', 'PO #'], ['pro_number', 'PRO #'], ['pickup_number', 'Pickup #'], ['delivery_number', 'Delivery #']].map(([field, label]) => (
                        <div key={field} className="space-y-1">
                          <Label className="text-xs">{label}</Label>
                          <Input value={editData[field] || ''} onChange={(e) => setEditData({ ...editData, [field]: e.target.value })} className="h-8" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {[['bol_number', 'BOL #'], ['po_number', 'PO #'], ['pro_number', 'PRO #'], ['pickup_number', 'Pickup #'], ['delivery_number', 'Delivery #']].map(([field, label]) => (
                        load[field] && (
                          <div key={field} className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-16 flex-shrink-0">{label}</span>
                            <span className="font-medium">{load[field]}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Reefer */}
            {(editing || load.is_reefer) && (
              <Card className="py-4 border-l-4 border-l-sky-400">
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Snowflake className="w-4 h-4 text-sky-500" />
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reefer</div>
                    {editing && (
                      <Switch checked={editData.is_reefer} onCheckedChange={(v) => setEditData({ ...editData, is_reefer: v })} className="ml-auto" />
                    )}
                  </div>
                  {editing && editData.is_reefer ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Mode</Label>
                        <Select value={editData.reefer_mode || undefined} onValueChange={(v) => setEditData({ ...editData, reefer_mode: v })}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Select mode" /></SelectTrigger>
                          <SelectContent>
                            {REEFER_MODES.map(m => <SelectItem key={m} value={m}>{REEFER_MODE_LABELS[m]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Set Temp (&deg;F)</Label>
                        <Input type="number" step="0.1" value={editData.set_temp} onChange={(e) => setEditData({ ...editData, set_temp: e.target.value })} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fuel %</Label>
                        <Input type="number" step="0.1" value={editData.reefer_fuel_pct} onChange={(e) => setEditData({ ...editData, reefer_fuel_pct: e.target.value })} className="h-8" />
                      </div>
                    </div>
                  ) : load.is_reefer ? (
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><span className="text-muted-foreground text-xs">Mode</span><div className="font-medium">{REEFER_MODE_LABELS[load.reefer_mode] || '\u2014'}</div></div>
                      <div><span className="text-muted-foreground text-xs">Set Temp</span><div className="font-medium">{load.set_temp != null ? `${load.set_temp}\u00b0F` : '\u2014'}</div></div>
                      <div><span className="text-muted-foreground text-xs">Fuel %</span><div className="font-medium">{load.reefer_fuel_pct != null ? `${load.reefer_fuel_pct}%` : '\u2014'}</div></div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            <Card className="py-4">
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Route Details</div>
                  {editing && (
                    <Button size="sm" variant="outline" onClick={addStop}>
                      <Plus className="w-3.5 h-3.5" /> Add Stop
                    </Button>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-3">
                    {editData.stops?.map((stop, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {index + 1}
                            </div>
                            <Select
                              value={stop.stop_type}
                              onValueChange={(v) => updateStop(index, 'stop_type', v)}
                            >
                              <SelectTrigger className="h-7 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PICKUP">Pickup</SelectItem>
                                <SelectItem value="DELIVERY">Delivery</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeStop(index)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <LocationAutocomplete
                            value={stop.facility_name || ''}
                            onChange={(val) => updateStop(index, 'facility_name', val)}
                            onSelect={(loc) => {
                              const newStops = [...editData.stops];
                              newStops[index] = {
                                ...newStops[index],
                                facility_name: loc.facility_name,
                                address: loc.address || '',
                                city: loc.city || '',
                                state: loc.state || '',
                                zip: loc.zip || '',
                              };
                              setEditData({ ...editData, stops: newStops });
                            }}
                            className="h-7 text-sm"
                          />
                          <Input
                            value={stop.address || ''}
                            onChange={(e) => updateStop(index, 'address', e.target.value)}
                            placeholder="Address"
                            className="h-7 text-sm"
                          />
                          <Input
                            value={stop.city || ''}
                            onChange={(e) => updateStop(index, 'city', e.target.value)}
                            placeholder="City"
                            className="h-7 text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={stop.state || ''}
                              onChange={(e) => updateStop(index, 'state', e.target.value)}
                              placeholder="ST"
                              maxLength={2}
                              className="h-7 text-sm"
                            />
                            <Input
                              value={stop.zip || ''}
                              onChange={(e) => updateStop(index, 'zip', e.target.value)}
                              placeholder="ZIP"
                              className="h-7 text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Appt Start</Label>
                            <Input
                              type="datetime-local"
                              value={stop.appointment_start ? stop.appointment_start.slice(0, 16) : ''}
                              onChange={(e) => updateStop(index, 'appointment_start', e.target.value ? new Date(e.target.value).toISOString() : null)}
                              className="h-7 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Appt End</Label>
                            <Input
                              type="datetime-local"
                              value={stop.appointment_end ? stop.appointment_end.slice(0, 16) : ''}
                              onChange={(e) => updateStop(index, 'appointment_end', e.target.value ? new Date(e.target.value).toISOString() : null)}
                              className="h-7 text-sm"
                            />
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Appointment</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {load.stops?.map((stop, index) => {
                        const detentionMin = (stop.arrival_time && stop.departure_time)
                          ? Math.max(0, Math.round((new Date(stop.departure_time) - new Date(stop.arrival_time)) / 60000) - (stop.free_time_minutes || 120))
                          : null;
                        return (
                          <TableRow key={stop.id}>
                            <TableCell>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {index + 1}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge className={stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                                  {stop.stop_type}
                                </Badge>
                                {stop.action_type && (
                                  <Badge className={`block w-fit ${STOP_ACTION_TYPE_COLORS[stop.action_type] || 'bg-slate-100 text-slate-600'}`}>
                                    {STOP_ACTION_TYPE_LABELS[stop.action_type]}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {stop.facility_name && <div className="font-medium">{stop.facility_name}</div>}
                                <div className="text-muted-foreground">{stop.address}, {stop.city}, {stop.state} {stop.zip}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {stop.appointment_start && (
                                <>
                                  {new Date(stop.appointment_start).toLocaleString()}
                                  {stop.appointment_end && <> - {new Date(stop.appointment_end).toLocaleTimeString()}</>}
                                </>
                              )}
                              {stop.arrival_time && (
                                <div className="text-xs mt-1">
                                  Arr: {new Date(stop.arrival_time).toLocaleString()}
                                  {stop.departure_time && <> &middot; Dep: {new Date(stop.departure_time).toLocaleTimeString()}</>}
                                </div>
                              )}
                              {detentionMin != null && detentionMin > 0 && (
                                <div className="text-xs text-red-600 font-medium mt-0.5">Detention: {Math.floor(detentionMin / 60)}h {detentionMin % 60}m</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {stop.stop_status && (
                                <Badge className={STOP_STATUS_COLORS[stop.stop_status] || 'bg-slate-100 text-slate-600'}>
                                  {stop.stop_status.replaceAll('_', ' ')}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Split Loads */}
            {(load.parent_load || load.child_loads?.length > 0 || !load.parent_load_id) && (load.parent_load || load.child_loads?.length > 0) && (
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

            {/* Create Split button for standalone loads with no children yet */}
            {!load.parent_load_id && !load.child_loads?.length && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => splitMutation.mutate()} disabled={splitMutation.isPending}>
                  {splitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                  Create Split Load
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <Card className="py-4">
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Line Haul</div>
                  {editing ? (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        value={editData.rate_amount}
                        onChange={(e) => setEditData({ ...editData, rate_amount: e.target.value })}
                        step="0.01"
                        className="h-8"
                      />
                      <Select
                        value={editData.rate_type}
                        onValueChange={(v) => setEditData({ ...editData, rate_type: v })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select rate type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FLAT">Flat</SelectItem>
                          <SelectItem value="CPM">Per Mile</SelectItem>
                          <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">${Number(load.rate_amount).toLocaleString()}</div>
                      {load.fuel_surcharge_amount > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">+ ${Number(load.fuel_surcharge_amount).toFixed(2)} FSC</div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              <Card className="py-4 bg-green-50">
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
                  {editing ? (
                    <div className="space-y-1">
                      <Label className="text-[10px]">Fuel Surcharge</Label>
                      <Input
                        type="number"
                        value={editData.fuel_surcharge_amount}
                        onChange={(e) => setEditData({ ...editData, fuel_surcharge_amount: e.target.value })}
                        step="0.01"
                        className="h-8"
                      />
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-green-700">${Number(load.total_amount || load.rate_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  )}
                </CardContent>
              </Card>
              <Card className="py-4">
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Miles / Weight</div>
                  {editing ? (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        value={editData.loaded_miles}
                        onChange={(e) => setEditData({ ...editData, loaded_miles: e.target.value })}
                        placeholder="Loaded miles"
                        className="h-8"
                      />
                      <Input
                        type="number"
                        value={editData.weight}
                        onChange={(e) => setEditData({ ...editData, weight: e.target.value })}
                        placeholder="Weight (lbs)"
                        className="h-8"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="text-lg font-bold">{load.loaded_miles} mi</div>
                      <div className="text-xs text-muted-foreground">{load.weight?.toLocaleString()} lbs</div>
                    </>
                  )}
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
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-7 text-xs relative" disabled={uploadingDoc}>
                      {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                      Upload
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        disabled={uploadingDoc}
                      />
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
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteDoc(doc.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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

            <Card className="py-4">
              <CardContent>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Additional Details</div>
                {editing ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Commodity</Label>
                      <Input
                        value={editData.commodity}
                        onChange={(e) => setEditData({ ...editData, commodity: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Equipment</Label>
                      <Select
                        value={editData.equipment_type}
                        onValueChange={(v) => setEditData({ ...editData, equipment_type: v })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select equipment" />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Empty Miles</Label>
                      <Input
                        type="number"
                        value={editData.empty_miles}
                        onChange={(e) => setEditData({ ...editData, empty_miles: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tractor</Label>
                      <Select
                        value={editData.truck_id || 'NONE'}
                        onValueChange={(v) => setEditData({ ...editData, truck_id: v === 'NONE' ? null : v })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select tractor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          {tractors.map(v => <SelectItem key={v.id} value={v.id}>{v.unit_number} - {v.make} {v.model}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Trailer</Label>
                      <Select
                        value={editData.trailer_id || 'NONE'}
                        onValueChange={(v) => setEditData({ ...editData, trailer_id: v === 'NONE' ? null : v })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select trailer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          {trailers.map(v => <SelectItem key={v.id} value={v.id}>{v.unit_number} - {v.make} {v.model}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Special Instructions</Label>
                      <Textarea
                        value={editData.special_instructions}
                        onChange={(e) => setEditData({ ...editData, special_instructions: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <Separator className="col-span-2" />
                    <div className="col-span-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Flags</div>
                    <div className="space-y-1">
                      <Label className="text-xs">Team Driver</Label>
                      <Select value={editData.driver2_id || 'NONE'} onValueChange={(v) => setEditData({ ...editData, driver2_id: v === 'NONE' ? null : v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select driver" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          {drivers.filter(d => d.id !== load.driver_id).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-6 pt-3">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={editData.is_ltl} onCheckedChange={(v) => setEditData({ ...editData, is_ltl: !!v })} />
                        LTL
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={editData.exclude_from_settlement} onCheckedChange={(v) => setEditData({ ...editData, exclude_from_settlement: !!v })} />
                        Exclude from Settlement
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs w-20 flex-shrink-0">Commodity</span>
                      <span className="font-medium">{load.commodity || '\u2014'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs w-20 flex-shrink-0">Equipment</span>
                      <span className="font-medium">{load.equipment_type || '\u2014'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs w-20 flex-shrink-0">Empty Miles</span>
                      <span className="font-medium">{load.empty_miles}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs w-20 flex-shrink-0">Rate Type</span>
                      <span className="font-medium">{load.rate_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs w-20 flex-shrink-0">Tractor</span>
                      <span className="font-medium">{load.truck_unit ? `${load.truck_unit} ${load.truck_info ? `(${load.truck_info})` : ''}` : '\u2014'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs w-20 flex-shrink-0">Trailer</span>
                      <span className="font-medium">{load.trailer_unit ? `${load.trailer_unit} ${load.trailer_info ? `(${load.trailer_info})` : ''}` : '\u2014'}</span>
                    </div>
                    {load.driver2_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs w-20 flex-shrink-0">Team Driver</span>
                        <span className="font-medium">{load.driver2_name}</span>
                      </div>
                    )}
                    {load.special_instructions && (
                      <div className="col-span-2 flex items-start gap-2">
                        <span className="text-muted-foreground text-xs w-20 flex-shrink-0">Instructions</span>
                        <span className="font-medium">{load.special_instructions}</span>
                      </div>
                    )}
                    {(load.is_ltl || load.exclude_from_settlement) && (
                      <div className="col-span-2 flex gap-2 pt-1">
                        {load.is_ltl && <Badge className="bg-cyan-100 text-cyan-700">LTL</Badge>}
                        {load.exclude_from_settlement && <Badge className="bg-red-100 text-red-700">Excluded from Settlement</Badge>}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      {showDriverModal && (
        <DriverAssignModal
          load={load}
          onClose={() => setShowDriverModal(false)}
          onAssigned={() => {
            setShowDriverModal(false);
            queryClient.invalidateQueries({ queryKey: ['loads'] });
            onUpdate();
          }}
        />
      )}

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
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
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
            <AlertDialogAction onClick={() => {
              statusMutation.mutate(confirmTransition);
              setConfirmTransition(null);
            }}>
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
              <Select value={brokerCarrierId} onValueChange={setBrokerCarrierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a carrier..." />
                </SelectTrigger>
                <SelectContent>
                  {carriers.filter(c => c.status === 'ACTIVE').map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name} {c.mc_number ? `(MC# ${c.mc_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Carrier Rate ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={brokerRate}
                onChange={(e) => setBrokerRate(e.target.value)}
                placeholder="e.g. 2500.00"
              />
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

              if (isPdf) {
                return <iframe src={url} className="w-full h-[60vh] rounded-lg border" title={previewDoc.filename} />;
              }
              if (isImage) {
                return <img src={url} alt={previewDoc.filename} className="max-w-full max-h-[60vh] mx-auto rounded-lg object-contain" />;
              }
              return (
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
                  <FileText className="w-12 h-12" />
                  <p>Preview not available for this file type</p>
                  <Button asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" /> Download File
                    </a>
                  </Button>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
