import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { updateLoadStatus, updateLoad, getDrivers, getCustomers } from '../services/api';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, CheckCircle, AlertTriangle, Pencil, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import DriverAssignModal from './DriverAssignModal';
import AccessorialEditor from './AccessorialEditor';

const statusColors = {
  OPEN: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  IN_PICKUP_YARD: 'bg-purple-100 text-purple-700',
  IN_TRANSIT: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-green-100 text-green-700',
  TONU: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  INVOICED: 'bg-emerald-100 text-emerald-700',
  BROKERED: 'bg-amber-100 text-amber-700',
};

const EQUIPMENT_TYPES = ['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'POWER_ONLY', 'STRAIGHT_TRUCK'];

export default function LoadDetail({ load, onClose, onUpdate }) {
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [confirmTransition, setConfirmTransition] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
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

  const handleStatusChange = (newStatus) => {
    setConfirmTransition(newStatus);
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
    });
    setEditing(true);
  };

  const handleSave = () => {
    editMutation.mutate(editData);
  };

  const currentDriver = drivers.find(d => d.id === load.driver_id);

  return (
    <>
      <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <div className="bg-navy-900 text-white p-6">
            <SheetHeader className="p-0">
              <div className="flex items-center gap-3 mb-1">
                <SheetTitle className="text-2xl font-display font-bold text-white">Load #{load.id}</SheetTitle>
                <Badge className={statusColors[load.status]}>
                  {load.status.replaceAll('_', ' ')}
                </Badge>
              </div>
              <SheetDescription className="text-slate-400">
                {editing ? (
                  <Input
                    value={editData.reference_number}
                    onChange={(e) => setEditData({ ...editData, reference_number: e.target.value })}
                    placeholder="Reference number"
                    className="h-7 text-sm bg-navy-800 border-navy-700 text-white mt-1"
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
                        className="bg-amber-500 hover:bg-amber-600"
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
                <Button size="sm" variant="outline" onClick={startEditing}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
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
                      <Button size="xs" onClick={() => setShowDriverModal(true)} className="bg-amber-500 hover:bg-amber-600">
                        <UserPlus className="w-3 h-3" />
                        Assign
                      </Button>
                    )}
                  </div>
                  {load.driver_name ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-bold bg-amber-100 text-amber-700">
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

            <Card className="py-4">
              <CardContent>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Route Details</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Appointment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {load.stops?.map((stop, index) => (
                      <TableRow key={stop.id}>
                        <TableCell>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                            {stop.stop_type}
                          </Badge>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

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

            {load.invoice_id ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Invoiced (Invoice #{load.invoice_id})</span>
              </div>
            ) : load.status === 'COMPLETED' ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700 font-medium">Uninvoiced &mdash; Ready for billing</span>
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
                      <Label className="text-xs">Rate Type</Label>
                      <Input value={editData.rate_type} disabled className="h-8 bg-muted" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Special Instructions</Label>
                      <Textarea
                        value={editData.special_instructions}
                        onChange={(e) => setEditData({ ...editData, special_instructions: e.target.value })}
                        rows={2}
                      />
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
                    {load.special_instructions && (
                      <div className="col-span-2 flex items-start gap-2">
                        <span className="text-muted-foreground text-xs w-20 flex-shrink-0">Instructions</span>
                        <span className="font-medium">{load.special_instructions}</span>
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
    </>
  );
}
