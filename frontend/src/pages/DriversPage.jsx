import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDrivers, createDriver, updateDriver, deleteDriver, getDriverById } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, User, Search, Pencil, Trash2, Loader2, Phone, CreditCard, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import DriverDeductionsEditor from '../components/DriverDeductionsEditor';
import { DRIVER_STATUS_COLORS as STATUS_COLORS, PAY_MODEL_LABELS as PAY_LABELS, US_STATES } from '@/lib/constants';

const EMPTY_FORM = { full_name: '', phone: '', email: '', license_number: '', license_state: '', pay_model: 'CPM', pay_rate: '', minimum_per_mile: '', driver_type: '', tax_type: '', route_type: '', hire_date: '' };

export default function DriversPage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => getDrivers(),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['driver', selectedId],
    queryFn: () => getDriverById(selectedId),
    enabled: !!selectedId,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return drivers;
    const q = search.toLowerCase();
    return drivers.filter(d =>
      d.full_name?.toLowerCase().includes(q) ||
      d.phone?.toLowerCase().includes(q) ||
      d.license_number?.toLowerCase().includes(q) ||
      d.license_state?.toLowerCase().includes(q)
    );
  }, [drivers, search]);

  const createMutation = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      toast.success('Driver created');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      closeForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateDriver(id, data),
    onSuccess: () => {
      toast.success('Driver updated');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver', editingDriver?.id] });
      closeForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => {
      toast.success('Driver deactivated');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setSelectedId(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to deactivate'),
  });

  const openCreate = () => {
    setEditingDriver(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      full_name: driver.full_name || '',
      phone: driver.phone || '',
      email: driver.email || '',
      license_number: driver.license_number || '',
      license_state: driver.license_state || '',
      pay_model: driver.pay_model || 'CPM',
      pay_rate: driver.pay_rate || '',
      minimum_per_mile: driver.minimum_per_mile || '',
      driver_type: driver.driver_type || '',
      tax_type: driver.tax_type || '',
      route_type: driver.route_type || '',
      hire_date: driver.hire_date || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingDriver(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = () => {
    if (!formData.full_name.trim()) return toast.error('Full name is required');
    if (!formData.pay_rate) return toast.error('Pay rate is required');
    const payload = {
      ...formData,
      pay_rate: parseFloat(formData.pay_rate),
      minimum_per_mile: formData.minimum_per_mile ? parseFloat(formData.minimum_per_mile) : null,
    };
    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const fmtRate = (d) => {
    if (d.pay_model === 'CPM') return `$${Number(d.pay_rate).toFixed(2)}/mi`;
    if (d.pay_model === 'PERCENTAGE') return `${Number(d.pay_rate).toFixed(1)}%`;
    return `$${Number(d.pay_rate).toLocaleString()}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <User className="w-6 h-6" />
            Drivers
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{drivers.length} drivers</p>
        </div>
        <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4" /> Add Driver
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers..." className="pl-9 h-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>CDL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pay Model</TableHead>
              <TableHead className="text-center">Active Loads</TableHead>
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
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <User className="w-10 h-10 text-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">{search ? 'No matching drivers' : 'No drivers yet'}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(d => (
                <TableRow key={d.id} className="cursor-pointer group" onClick={() => setSelectedId(d.id)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-bold bg-amber-100 text-amber-700">
                          {d.full_name?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold group-hover:text-amber-600 transition-colors">{d.full_name}</div>
                        {d.driver_type && <div className="text-xs text-muted-foreground">{d.driver_type.replaceAll('_', ' ')}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{d.phone || '\u2014'}</TableCell>
                  <TableCell className="text-muted-foreground">{d.license_number || '\u2014'} {d.license_state ? `(${d.license_state})` : ''}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[d.status] || 'bg-slate-100'}>{d.status.replaceAll('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{PAY_LABELS[d.pay_model]} &middot; {fmtRate(d)}</span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{d.stats?.active_loads ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); openEdit(d); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="xs" className="text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setConfirmDelete(d); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add Driver'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="e.g., John Miller" />
              </div>
              <div className="space-y-1.5">
                <Label>Driver Type</Label>
                <Select value={formData.driver_type || 'NONE'} onValueChange={(v) => setFormData({ ...formData, driver_type: v === 'NONE' ? '' : v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Not specified</SelectItem>
                    <SelectItem value="COMPANY_DRIVER">Company Driver</SelectItem>
                    <SelectItem value="OWNER_OPERATOR">Owner Operator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="555-0101" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="driver@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CDL Number</Label>
                <Input value={formData.license_number} onChange={(e) => setFormData({ ...formData, license_number: e.target.value })} placeholder="CDL123456" />
              </div>
              <div className="space-y-1.5">
                <Label>License State</Label>
                <Select value={formData.license_state || undefined} onValueChange={(v) => setFormData({ ...formData, license_state: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Tax Type</Label>
                <Select value={formData.tax_type || 'NONE'} onValueChange={(v) => setFormData({ ...formData, tax_type: v === 'NONE' ? '' : v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Not specified</SelectItem>
                    <SelectItem value="W2">W-2</SelectItem>
                    <SelectItem value="1099">1099</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Route Type</Label>
                <Select value={formData.route_type || 'NONE'} onValueChange={(v) => setFormData({ ...formData, route_type: v === 'NONE' ? '' : v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Not specified</SelectItem>
                    <SelectItem value="LOCAL">Local</SelectItem>
                    <SelectItem value="REGIONAL">Regional</SelectItem>
                    <SelectItem value="OTR">OTR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hire Date</Label>
                <Input type="date" value={formData.hire_date} onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Pay Model *</Label>
                <Select value={formData.pay_model} onValueChange={(v) => setFormData({ ...formData, pay_model: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPM">Per Mile (CPM)</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FLAT">Flat Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pay Rate *</Label>
                <Input type="number" value={formData.pay_rate} onChange={(e) => setFormData({ ...formData, pay_rate: e.target.value })} step="0.01" placeholder={formData.pay_model === 'CPM' ? '0.55' : formData.pay_model === 'PERCENTAGE' ? '25' : '1200'} />
              </div>
              <div className="space-y-1.5">
                <Label>Min $/mile</Label>
                <Input type="number" value={formData.minimum_per_mile} onChange={(e) => setFormData({ ...formData, minimum_per_mile: e.target.value })} step="0.01" placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} className="bg-amber-500 hover:bg-amber-600">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingDriver ? 'Save Changes' : 'Create Driver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      {selectedId && (
        <Sheet open={true} onOpenChange={(open) => !open && setSelectedId(null)}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
            {detailLoading || !detail ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ) : (
              <>
                <div className="bg-navy-900 text-white p-6">
                  <SheetHeader className="p-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-amber-500 text-white font-bold text-lg">
                          {detail.full_name?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <SheetTitle className="text-2xl font-display font-bold text-white">{detail.full_name}</SheetTitle>
                        <SheetDescription className="text-slate-400 flex items-center gap-3 flex-wrap">
                          <Badge className={STATUS_COLORS[detail.status]}>{detail.status.replaceAll('_', ' ')}</Badge>
                          {detail.driver_type && <Badge className="bg-white/10 text-slate-300">{detail.driver_type.replaceAll('_', ' ')}</Badge>}
                          {detail.route_type && <Badge className="bg-white/10 text-slate-300">{detail.route_type}</Badge>}
                          {detail.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {detail.phone}</span>}
                        </SheetDescription>
                      </div>
                    </div>
                  </SheetHeader>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="py-4">
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Pay Model</div>
                        <div className="text-lg font-bold">{PAY_LABELS[detail.pay_model]}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {fmtRate(detail)}
                          {detail.minimum_per_mile ? ` (min $${detail.minimum_per_mile}/mi)` : ''}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="py-4">
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> CDL</div>
                        <div className="text-lg font-bold">{detail.license_number || '\u2014'}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">{detail.license_state || '\u2014'}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {(detail.email || detail.tax_type || detail.hire_date) && (
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {detail.email && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">Email</span>
                          <span className="font-medium truncate">{detail.email}</span>
                        </div>
                      )}
                      {detail.tax_type && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">Tax</span>
                          <Badge variant="secondary">{detail.tax_type}</Badge>
                        </div>
                      )}
                      {detail.hire_date && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">Hired</span>
                          <span className="font-medium">{new Date(detail.hire_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <Card className="py-4">
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-1">Total Loads</div>
                        <div className="text-2xl font-bold">{(detail.stats?.completed_loads || 0) + (detail.stats?.active_loads || 0)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{detail.stats?.active_loads || 0} active</div>
                      </CardContent>
                    </Card>
                    <Card className="py-4">
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-1">Total Miles</div>
                        <div className="text-2xl font-bold">{Number(detail.stats?.total_miles || 0).toLocaleString()}</div>
                      </CardContent>
                    </Card>
                    <Card className="py-4 bg-green-50">
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-1">Total Earnings</div>
                        <div className="text-2xl font-bold text-green-700">${Number(detail.stats?.total_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-muted-foreground mt-1">{detail.stats?.total_settlements || 0} settlements</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />
                  <DriverDeductionsEditor driverId={selectedId} />

                  {detail.recent_loads?.length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-muted px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Recent Loads
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Load #</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.recent_loads.map(l => (
                            <TableRow key={l.id}>
                              <TableCell className="font-medium">#{l.id}</TableCell>
                              <TableCell className="text-muted-foreground">{l.reference_number || '\u2014'}</TableCell>
                              <TableCell><Badge variant="secondary">{l.status}</Badge></TableCell>
                              <TableCell className="text-right font-semibold">${Number(l.rate_amount || 0).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {detail.recent_settlements?.length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-muted px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Recent Settlements
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Settlement #</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Net Pay</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.recent_settlements.map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.settlement_number}</TableCell>
                              <TableCell className="text-muted-foreground">{s.period_start} &mdash; {s.period_end}</TableCell>
                              <TableCell><Badge variant="secondary">{s.status}</Badge></TableCell>
                              <TableCell className="text-right font-semibold text-green-700">${Number(s.net_pay).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Driver</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate {confirmDelete?.full_name}? They will no longer appear in assignment dropdowns. This can be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null); }}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
