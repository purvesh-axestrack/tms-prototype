import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle, assignVehicleDriver, getDrivers } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Plus, Search, MapPin, Gauge } from 'lucide-react';
import { toast } from 'sonner';

const VEHICLE_TYPES = ['TRACTOR', 'TRAILER'];
const VEHICLE_STATUSES = ['ACTIVE', 'IN_SHOP', 'OUT_OF_SERVICE', 'INACTIVE'];

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-700',
  IN_SHOP: 'bg-amber-100 text-amber-700',
  OUT_OF_SERVICE: 'bg-red-100 text-red-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

const emptyForm = {
  unit_number: '', type: 'TRACTOR', vin: '', year: '', make: '', model: '',
  license_plate: '', license_state: '', notes: '',
};

export default function FleetPage() {
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState('');
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', tab === 'INACTIVE'],
    queryFn: () => getVehicles(tab === 'INACTIVE' ? { include_inactive: true, status: 'INACTIVE' } : { include_inactive: false }),
  });

  const { data: detail } = useQuery({
    queryKey: ['vehicle', selectedId],
    queryFn: () => getVehicleById(selectedId),
    enabled: !!selectedId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
  });

  const filtered = useMemo(() => {
    let list = vehicles;
    if (tab !== 'ALL' && tab !== 'INACTIVE') {
      list = list.filter(v => v.type === tab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.unit_number?.toLowerCase().includes(q) ||
        v.vin?.toLowerCase().includes(q) ||
        v.make?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q) ||
        v.driver_name?.toLowerCase().includes(q) ||
        v.license_plate?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [vehicles, tab, search]);

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      toast.success('Vehicle created');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowCreate(false);
      setForm(emptyForm);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateVehicle(id, data),
    onSuccess: () => {
      toast.success('Vehicle updated');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', editVehicle?.id] });
      setEditVehicle(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      toast.success('Vehicle deactivated');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteTarget(null);
      if (selectedId === deleteTarget?.id) setSelectedId(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to deactivate'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ vehicleId, driverId }) => assignVehicleDriver(vehicleId, driverId),
    onSuccess: () => {
      toast.success('Driver assigned');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', selectedId] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to assign'),
  });

  const handleCreate = () => {
    if (!form.unit_number) return toast.error('Unit number is required');
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!editVehicle) return;
    updateMutation.mutate({ id: editVehicle.id, data: form });
  };

  const openEdit = (v) => {
    setForm({
      unit_number: v.unit_number || '', type: v.type || 'TRACTOR', vin: v.vin || '',
      year: v.year || '', make: v.make || '', model: v.model || '',
      license_plate: v.license_plate || '', license_state: v.license_state || '',
      status: v.status || 'ACTIVE', notes: v.notes || '',
    });
    setEditVehicle(v);
  };

  const tractorCount = vehicles.filter(v => v.type === 'TRACTOR').length;
  const trailerCount = vehicles.filter(v => v.type === 'TRAILER').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Truck className="w-6 h-6" />
          Fleet
        </h2>
        <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4" /> Add Vehicle
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
            <div className="text-sm text-muted-foreground">Total Vehicles</div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold">{tractorCount}</div>
            <div className="text-sm text-muted-foreground">Tractors</div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold">{trailerCount}</div>
            <div className="text-sm text-muted-foreground">Trailers</div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.filter(v => v.status === 'IN_SHOP').length}</div>
            <div className="text-sm text-muted-foreground">In Shop</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="TRACTOR">Tractors</TabsTrigger>
            <TabsTrigger value="TRAILER">Trailers</TabsTrigger>
            <TabsTrigger value="INACTIVE">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search unit #, VIN, driver..." className="pl-9" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Year / Make / Model</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No vehicles found</TableCell>
                </TableRow>
              ) : filtered.map(v => (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(v.id)}>
                  <TableCell className="font-semibold">{v.unit_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{v.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {[v.year, v.make, v.model].filter(Boolean).join(' ') || '\u2014'}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{v.vin || '\u2014'}</TableCell>
                  <TableCell className="text-sm">
                    {v.license_plate ? `${v.license_plate}${v.license_state ? ` (${v.license_state})` : ''}` : '\u2014'}
                  </TableCell>
                  <TableCell className="text-sm">{v.driver_name || '\u2014'}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[v.status] || ''}>{v.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(v); }}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Add Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-amber-500 hover:bg-amber-600">
              {createMutation.isPending ? 'Creating...' : 'Create Vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editVehicle} onOpenChange={() => setEditVehicle(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm form={form} setForm={setForm} showStatus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVehicle(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="bg-amber-500 hover:bg-amber-600">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-display flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Unit {detail.unit_number}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{detail.type}</Badge>
                  <Badge className={statusColors[detail.status] || ''}>{detail.status}</Badge>
                </div>

                {/* Vehicle Info */}
                <Card className="py-4">
                  <CardContent>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vehicle Information</div>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <div><span className="text-muted-foreground">Year:</span> <span className="font-medium">{detail.year || '\u2014'}</span></div>
                      <div><span className="text-muted-foreground">Make:</span> <span className="font-medium">{detail.make || '\u2014'}</span></div>
                      <div><span className="text-muted-foreground">Model:</span> <span className="font-medium">{detail.model || '\u2014'}</span></div>
                      <div><span className="text-muted-foreground">VIN:</span> <span className="font-medium font-mono text-xs">{detail.vin || '\u2014'}</span></div>
                      <div><span className="text-muted-foreground">License:</span> <span className="font-medium">{detail.license_plate || '\u2014'} {detail.license_state ? `(${detail.license_state})` : ''}</span></div>
                      <div><span className="text-muted-foreground">Odometer:</span> <span className="font-medium">{detail.odometer ? `${Number(detail.odometer).toLocaleString()} mi` : '\u2014'}</span></div>
                    </div>
                  </CardContent>
                </Card>

                {/* GPS */}
                {(detail.last_latitude || detail.samsara_id) && (
                  <Card className="py-4">
                    <CardContent>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Location
                      </div>
                      {detail.last_latitude && detail.last_longitude ? (
                        <div className="text-sm">
                          <span className="font-mono">{detail.last_latitude}, {detail.last_longitude}</span>
                          {detail.last_location_at && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              Updated {new Date(detail.last_location_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No location data</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Driver Assignment */}
                <Card className="py-4">
                  <CardContent>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assigned Driver</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          value={assignDriverId || (detail.current_driver_id ? String(detail.current_driver_id) : undefined)}
                          onValueChange={(v) => setAssignDriverId(v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="No driver assigned" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          assignMutation.mutate({ vehicleId: detail.id, driverId: assignDriverId || null });
                          setAssignDriverId('');
                        }}
                        disabled={assignMutation.isPending}
                        className="bg-amber-500 hover:bg-amber-600"
                      >
                        {assignMutation.isPending ? 'Saving...' : 'Assign'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Loads */}
                {detail.recent_loads?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Loads</div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Load</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.recent_loads.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="font-mono text-sm">{l.reference_number || `#${l.id}`}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{l.status}</Badge></TableCell>
                            <TableCell className="text-right font-medium">${parseFloat(l.total_amount || l.rate_amount || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Actions */}
                <Separator />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { openEdit(detail); setSelectedId(null); }}>Edit Vehicle</Button>
                  {detail.status !== 'INACTIVE' && (
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => { setDeleteTarget(detail); setSelectedId(null); }}>
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 mt-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate unit {deleteTarget?.unit_number}? This will unassign its driver and mark it as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(deleteTarget.id)}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VehicleForm({ form, setForm, showStatus }) {
  const set = (field) => (v) => setForm(prev => ({ ...prev, [field]: v }));
  const setInput = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>Unit Number *</Label>
        <Input value={form.unit_number} onChange={setInput('unit_number')} placeholder="e.g., T-101" />
      </div>
      <div className="space-y-1.5">
        <Label>Type *</Label>
        <Select value={form.type} onValueChange={set('type')}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>VIN</Label>
        <Input value={form.vin} onChange={setInput('vin')} placeholder="Vehicle Identification Number" />
      </div>
      <div className="space-y-1.5">
        <Label>Year</Label>
        <Input value={form.year} onChange={setInput('year')} placeholder="2024" type="number" />
      </div>
      <div className="space-y-1.5">
        <Label>Make</Label>
        <Input value={form.make} onChange={setInput('make')} placeholder="e.g., Freightliner" />
      </div>
      <div className="space-y-1.5">
        <Label>Model</Label>
        <Input value={form.model} onChange={setInput('model')} placeholder="e.g., Cascadia" />
      </div>
      <div className="space-y-1.5">
        <Label>License Plate</Label>
        <Input value={form.license_plate} onChange={setInput('license_plate')} />
      </div>
      <div className="space-y-1.5">
        <Label>License State</Label>
        <Input value={form.license_state} onChange={setInput('license_state')} placeholder="e.g., TX" maxLength={2} />
      </div>
      {showStatus && (
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={set('status')}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="col-span-2 space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={setInput('notes')} rows={2} placeholder="Any additional notes..." />
      </div>
    </div>
  );
}
