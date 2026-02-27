import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCarriers, getCarrierById, createCarrier, updateCarrier, deleteCarrier, addCarrierInsurance, removeCarrierInsurance } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Plus, Search, Shield, AlertTriangle, Trash2, User, Truck, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { CARRIER_STATUSES, INSURANCE_TYPES, CARRIER_STATUS_COLORS as statusColors, INSURANCE_TYPE_LABELS as insuranceTypeLabels } from '@/lib/constants';

const emptyForm = {
  company_name: '', mc_number: '', dot_number: '', scac_code: '',
  contact_name: '', contact_email: '', contact_phone: '',
  address: '', city: '', state: '', zip: '',
  status: 'PROSPECT', notes: '',
};

const emptyInsuranceForm = {
  policy_type: '', provider: '', policy_number: '', coverage_amount: '', expiration_date: '',
};

export default function CarriersPage() {
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editCarrier, setEditCarrier] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddInsurance, setShowAddInsurance] = useState(false);
  const [insuranceForm, setInsuranceForm] = useState(emptyInsuranceForm);
  const queryClient = useQueryClient();

  const { data: carriers = [], isLoading } = useQuery({
    queryKey: ['carriers', tab === 'INACTIVE'],
    queryFn: () => getCarriers(tab === 'INACTIVE' ? { include_inactive: true, status: 'INACTIVE' } : { include_inactive: false }),
  });

  const { data: detail } = useQuery({
    queryKey: ['carrier', selectedId],
    queryFn: () => getCarrierById(selectedId),
    enabled: !!selectedId,
  });

  const filtered = useMemo(() => {
    let list = carriers;
    if (tab !== 'ALL' && tab !== 'INACTIVE') {
      list = list.filter(c => c.status === tab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.company_name?.toLowerCase().includes(q) ||
        c.mc_number?.toLowerCase().includes(q) ||
        c.dot_number?.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q) ||
        c.contact_email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [carriers, tab, search]);

  const createMutation = useMutation({
    mutationFn: createCarrier,
    onSuccess: () => {
      toast.success('Carrier created');
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      setShowCreate(false);
      setForm(emptyForm);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create carrier'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCarrier(id, data),
    onSuccess: () => {
      toast.success('Carrier updated');
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      queryClient.invalidateQueries({ queryKey: ['carrier', editCarrier?.id] });
      setEditCarrier(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update carrier'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCarrier,
    onSuccess: () => {
      toast.success('Carrier deactivated');
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      setDeleteTarget(null);
      if (selectedId === deleteTarget?.id) setSelectedId(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to deactivate carrier'),
  });

  const addInsuranceMutation = useMutation({
    mutationFn: ({ carrierId, data }) => addCarrierInsurance(carrierId, data),
    onSuccess: () => {
      toast.success('Insurance policy added');
      queryClient.invalidateQueries({ queryKey: ['carrier', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      setShowAddInsurance(false);
      setInsuranceForm(emptyInsuranceForm);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add insurance'),
  });

  const removeInsuranceMutation = useMutation({
    mutationFn: ({ carrierId, insuranceId }) => removeCarrierInsurance(carrierId, insuranceId),
    onSuccess: () => {
      toast.success('Insurance policy removed');
      queryClient.invalidateQueries({ queryKey: ['carrier', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove insurance'),
  });

  const handleCreate = () => {
    if (!form.company_name) return toast.error('Company name is required');
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!editCarrier) return;
    updateMutation.mutate({ id: editCarrier.id, data: form });
  };

  const openEdit = (c) => {
    setForm({
      company_name: c.company_name || '', mc_number: c.mc_number || '',
      dot_number: c.dot_number || '', scac_code: c.scac_code || '',
      contact_name: c.contact_name || '', contact_email: c.contact_email || '',
      contact_phone: c.contact_phone || '',
      address: c.address || '', city: c.city || '', state: c.state || '', zip: c.zip || '',
      status: c.status || 'PROSPECT', notes: c.notes || '',
    });
    setEditCarrier(c);
  };

  const handleAddInsurance = () => {
    if (!insuranceForm.policy_type) return toast.error('Policy type is required');
    if (!insuranceForm.provider) return toast.error('Provider is required');
    addInsuranceMutation.mutate({
      carrierId: selectedId,
      data: {
        ...insuranceForm,
        coverage_amount: insuranceForm.coverage_amount ? parseFloat(insuranceForm.coverage_amount) : 0,
      },
    });
  };

  const activeCount = carriers.filter(c => c.status === 'ACTIVE').length;
  const prospectCount = carriers.filter(c => c.status === 'PROSPECT').length;
  const suspendedCount = carriers.filter(c => c.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Building className="w-6 h-6" />
          Carriers
        </h2>
        <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }} className="theme-brand-bg text-white">
          <Plus className="w-4 h-4" /> Add Carrier
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold">{carriers.length}</div>
            <div className="text-sm text-muted-foreground">Total Carriers</div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold">{prospectCount}</div>
            <div className="text-sm text-muted-foreground">Prospects</div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold">{suspendedCount}</div>
            <div className="text-sm text-muted-foreground">Suspended</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="PROSPECT">Prospects</TabsTrigger>
            <TabsTrigger value="SUSPENDED">Suspended</TabsTrigger>
            <TabsTrigger value="INACTIVE">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, MC#, DOT#..." className="pl-9" />
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
                <TableHead>Company Name</TableHead>
                <TableHead>MC #</TableHead>
                <TableHead>DOT #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Loads</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No carriers found</TableCell>
                </TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(c.id)}>
                  <TableCell className="font-semibold">{c.company_name}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{c.mc_number || '\u2014'}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{c.dot_number || '\u2014'}</TableCell>
                  <TableCell className="text-sm">
                    {c.contact_name || c.contact_email || '\u2014'}
                  </TableCell>
                  <TableCell className="text-sm">{c.load_count || 0}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[c.status] || ''}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Add Carrier</DialogTitle>
            <DialogDescription>Add a new carrier for brokered loads</DialogDescription>
          </DialogHeader>
          <CarrierForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="theme-brand-bg text-white">
              {createMutation.isPending ? 'Creating...' : 'Create Carrier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCarrier} onOpenChange={() => setEditCarrier(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Carrier</DialogTitle>
          </DialogHeader>
          <CarrierForm form={form} setForm={setForm} showStatus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCarrier(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="theme-brand-bg text-white">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto p-0">
          {detail ? (
            <>
              <div className="theme-sidebar text-white p-6">
                <SheetHeader className="p-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="theme-brand-dot text-white font-bold text-lg">
                        <Building className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-2xl font-display font-bold text-white">{detail.company_name}</SheetTitle>
                      <SheetDescription className="theme-sidebar-text flex items-center gap-3 flex-wrap">
                        <Badge className={statusColors[detail.status] || ''}>{detail.status}</Badge>
                        {detail.mc_number && <Badge className="bg-white/10 text-slate-300">MC# {detail.mc_number}</Badge>}
                        {detail.dot_number && <Badge className="bg-white/10 text-slate-300">DOT# {detail.dot_number}</Badge>}
                        {detail.contact_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {detail.contact_phone}</span>}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
              </div>
              <div className="p-6 space-y-5">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="py-4">
                    <CardContent>
                      <div className="text-xs text-muted-foreground mb-1">SCAC</div>
                      <div className="text-lg font-bold font-mono">{detail.scac_code || '\u2014'}</div>
                    </CardContent>
                  </Card>
                  <Card className="py-4">
                    <CardContent>
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Drivers</div>
                      <div className="text-lg font-bold">{detail.drivers?.length || 0}</div>
                    </CardContent>
                  </Card>
                  <Card className="py-4">
                    <CardContent>
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Truck className="w-3 h-3" /> Trucks</div>
                      <div className="text-lg font-bold">{detail.trucks?.length || 0}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact details */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {detail.contact_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">Contact</span>
                      <span className="font-medium">{detail.contact_name}</span>
                    </div>
                  )}
                  {detail.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium truncate">{detail.contact_email}</span>
                    </div>
                  )}
                  {(detail.address || detail.city) && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">Address</span>
                      <span className="font-medium truncate">{[detail.city, detail.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Insurance */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-muted px-4 py-3 flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Insurance Policies ({detail.insurance?.length || 0})
                    </div>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => { setInsuranceForm(emptyInsuranceForm); setShowAddInsurance(true); }}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  {detail.insurance?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Coverage</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.insurance.map(ins => {
                          const isExpired = ins.expiration_date && new Date(ins.expiration_date) < new Date();
                          return (
                            <TableRow key={ins.id}>
                              <TableCell className="text-sm">{insuranceTypeLabels[ins.policy_type] || ins.policy_type}</TableCell>
                              <TableCell className="text-sm">{ins.provider}</TableCell>
                              <TableCell className="text-sm font-medium">${Number(ins.coverage_amount).toLocaleString()}</TableCell>
                              <TableCell className="text-sm">
                                {ins.expiration_date ? (
                                  <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                                    {isExpired && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                                    {new Date(ins.expiration_date).toLocaleDateString()}
                                  </span>
                                ) : '\u2014'}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost" size="sm"
                                  className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                                  onClick={() => removeInsuranceMutation.mutate({ carrierId: detail.id, insuranceId: ins.id })}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground py-4 text-center">No insurance policies on file</div>
                  )}
                </div>

                {/* Carrier's Drivers */}
                {detail.drivers?.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="bg-muted px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Drivers ({detail.drivers.length})
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pay Model</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.drivers.map(d => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium text-sm">{d.full_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{d.phone || '\u2014'}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{d.status}</Badge></TableCell>
                            <TableCell className="text-sm">{d.pay_model}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Carrier's Trucks */}
                {detail.trucks?.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="bg-muted px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Trucks ({detail.trucks.length})
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Unit #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Year / Make / Model</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.trucks.map(v => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium text-sm">{v.unit_number}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{v.type}</Badge></TableCell>
                            <TableCell className="text-sm">{[v.year, v.make, v.model].filter(Boolean).join(' ') || '\u2014'}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{v.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Recent Loads */}
                {detail.recent_loads?.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="bg-muted px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Brokered Loads
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Load</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Customer Rate</TableHead>
                          <TableHead className="text-right">Carrier Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.recent_loads.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="font-mono text-sm">{l.reference_number || `#${l.id}`}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{l.status}</Badge></TableCell>
                            <TableCell className="text-right font-medium">${parseFloat(l.rate_amount || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">${parseFloat(l.carrier_rate || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Notes */}
                {detail.notes && (
                  <Card className="py-4">
                    <CardContent>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</div>
                      <p className="text-sm whitespace-pre-wrap">{detail.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <Separator />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { openEdit(detail); setSelectedId(null); }}>Edit Carrier</Button>
                  {detail.status !== 'INACTIVE' && (
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => { setDeleteTarget(detail); setSelectedId(null); }}>
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Insurance Dialog */}
      <Dialog open={showAddInsurance} onOpenChange={setShowAddInsurance}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Insurance Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Policy Type *</Label>
              <Select value={insuranceForm.policy_type} onValueChange={(v) => setInsuranceForm(prev => ({ ...prev, policy_type: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_TYPES.map(t => <SelectItem key={t} value={t}>{insuranceTypeLabels[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Provider *</Label>
              <Input value={insuranceForm.provider} onChange={(e) => setInsuranceForm(prev => ({ ...prev, provider: e.target.value }))} placeholder="Insurance company name" />
            </div>
            <div className="space-y-1.5">
              <Label>Policy Number</Label>
              <Input value={insuranceForm.policy_number} onChange={(e) => setInsuranceForm(prev => ({ ...prev, policy_number: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Coverage Amount</Label>
                <Input value={insuranceForm.coverage_amount} onChange={(e) => setInsuranceForm(prev => ({ ...prev, coverage_amount: e.target.value }))} type="number" placeholder="1000000" />
              </div>
              <div className="space-y-1.5">
                <Label>Expiration Date</Label>
                <Input value={insuranceForm.expiration_date} onChange={(e) => setInsuranceForm(prev => ({ ...prev, expiration_date: e.target.value }))} type="date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddInsurance(false)}>Cancel</Button>
            <Button onClick={handleAddInsurance} disabled={addInsuranceMutation.isPending} className="theme-brand-bg text-white">
              {addInsuranceMutation.isPending ? 'Adding...' : 'Add Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Carrier</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate {deleteTarget?.company_name}? This will prevent assigning new loads to this carrier.
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

function CarrierForm({ form, setForm, showStatus }) {
  const setInput = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const set = (field) => (v) => setForm(prev => ({ ...prev, [field]: v }));

  return (
    <div className="space-y-4">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Company Details</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Company Name *</Label>
          <Input value={form.company_name} onChange={setInput('company_name')} placeholder="Carrier company name" />
        </div>
        <div className="space-y-1.5">
          <Label>MC Number</Label>
          <Input value={form.mc_number} onChange={setInput('mc_number')} placeholder="e.g., MC-123456" />
        </div>
        <div className="space-y-1.5">
          <Label>DOT Number</Label>
          <Input value={form.dot_number} onChange={setInput('dot_number')} placeholder="e.g., 1234567" />
        </div>
        <div className="space-y-1.5">
          <Label>SCAC Code</Label>
          <Input value={form.scac_code} onChange={setInput('scac_code')} placeholder="2-4 letter code" maxLength={4} />
        </div>
        {showStatus && (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={set('status')}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARRIER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Separator />
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Contact Name</Label>
          <Input value={form.contact_name} onChange={setInput('contact_name')} placeholder="Primary contact" />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.contact_phone} onChange={setInput('contact_phone')} placeholder="(555) 123-4567" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Email</Label>
          <Input value={form.contact_email} onChange={setInput('contact_email')} placeholder="dispatch@carrier.com" type="email" />
        </div>
      </div>

      <Separator />
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Address</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Street Address</Label>
          <Input value={form.address} onChange={setInput('address')} placeholder="123 Main St" />
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Input value={form.city} onChange={setInput('city')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>State</Label>
            <Input value={form.state} onChange={setInput('state')} maxLength={2} placeholder="TX" />
          </div>
          <div className="space-y-1.5">
            <Label>ZIP</Label>
            <Input value={form.zip} onChange={setInput('zip')} placeholder="75001" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={setInput('notes')} rows={2} placeholder="Any additional notes..." />
      </div>
    </div>
  );
}
