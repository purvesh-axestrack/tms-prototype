import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerById } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Search, Pencil, Trash2, Loader2, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM = { company_name: '', customer_type: '', mc_number: '', dot_number: '', billing_email: '', payment_terms: 30, phone: '', contact_name: '', address: '', city: '', state: '', zip: '', credit_limit: '' };

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getCustomers(),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['customer', selectedId],
    queryFn: () => getCustomerById(selectedId),
    enabled: !!selectedId,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.company_name?.toLowerCase().includes(q) ||
      c.mc_number?.toLowerCase().includes(q) ||
      c.billing_email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      toast.success('Customer created');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      closeForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCustomer(id, data),
    onSuccess: () => {
      toast.success('Customer updated');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', editingCustomer?.id] });
      closeForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      toast.success('Customer deactivated');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedId(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to deactivate'),
  });

  const openCreate = () => {
    setEditingCustomer(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      company_name: customer.company_name || '',
      customer_type: customer.customer_type || '',
      mc_number: customer.mc_number || '',
      dot_number: customer.dot_number || '',
      billing_email: customer.billing_email || '',
      payment_terms: customer.payment_terms || 30,
      phone: customer.phone || '',
      contact_name: customer.contact_name || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
      credit_limit: customer.credit_limit || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = () => {
    if (!formData.company_name.trim()) return toast.error('Company name is required');
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Customers
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{customers.length} active customers</p>
        </div>
        <Button onClick={openCreate} className="theme-brand-bg text-white">
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9 h-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>MC Number</TableHead>
              <TableHead className="text-center">Terms</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="w-10 h-10 text-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">{search ? 'No matching customers' : 'No customers yet'}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer group" onClick={() => setSelectedId(c.id)}>
                  <TableCell>
                    <div className="font-semibold theme-brand-group-hover transition-colors">{c.company_name}</div>
                    {c.city && c.state && <div className="text-xs text-muted-foreground">{c.city}, {c.state}</div>}
                  </TableCell>
                  <TableCell>
                    {c.customer_type ? <Badge variant="secondary">{c.customer_type}</Badge> : <span className="text-muted-foreground">&mdash;</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.contact_name && <div>{c.contact_name}</div>}
                    {c.phone && <div className="text-xs">{c.phone}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.mc_number || '\u2014'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">Net {c.payment_terms}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="xs" className="text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}>
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
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Company Name *</Label>
                <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="e.g., CH Robinson" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={formData.customer_type || 'NONE'} onValueChange={(v) => setFormData({ ...formData, customer_type: v === 'NONE' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Not specified</SelectItem>
                    <SelectItem value="BROKER">Broker</SelectItem>
                    <SelectItem value="SHIPPER">Shipper</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(555) 123-4567" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Billing Email</Label>
              <Input type="email" value={formData.billing_email} onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })} placeholder="ap@company.com" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>MC Number</Label>
                <Input value={formData.mc_number} onChange={(e) => setFormData({ ...formData, mc_number: e.target.value })} placeholder="MC123456" />
              </div>
              <div className="space-y-1.5">
                <Label>DOT Number</Label>
                <Input value={formData.dot_number} onChange={(e) => setFormData({ ...formData, dot_number: e.target.value })} placeholder="DOT123456" />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Terms</Label>
                <Input type="number" value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 30 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Chicago" />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="IL" maxLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label>ZIP</Label>
                <Input value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} placeholder="60601" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Credit Limit ($)</Label>
              <Input type="number" step="0.01" value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })} placeholder="50000.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} className="theme-brand-bg text-white">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingCustomer ? 'Save Changes' : 'Create Customer'}
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
                <div className="theme-sidebar text-white p-6">
                  <SheetHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="text-2xl font-display font-bold text-white">{detail.company_name}</SheetTitle>
                      {detail.customer_type && <Badge className="theme-brand-chip">{detail.customer_type}</Badge>}
                    </div>
                    <SheetDescription className="theme-sidebar-text">
                      {detail.mc_number || 'No MC#'} &middot; Net {detail.payment_terms} days
                      {detail.credit_limit && <> &middot; Credit: ${Number(detail.credit_limit).toLocaleString()}</>}
                    </SheetDescription>
                  </SheetHeader>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="py-4">
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-1">Total Loads</div>
                        <div className="text-2xl font-bold">{detail.stats?.total_loads || 0}</div>
                        <div className="text-xs text-muted-foreground mt-1">{detail.stats?.active_loads || 0} active</div>
                      </CardContent>
                    </Card>
                    <Card className="py-4">
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
                        <div className="text-2xl font-bold text-green-700">${Number(detail.stats?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </CardContent>
                    </Card>
                    <Card className="py-4">
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-1">Outstanding Balance</div>
                        <div className="text-2xl font-bold text-red-600">${Number(detail.stats?.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </CardContent>
                    </Card>
                    <Card className="py-4">
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-1">Invoices</div>
                        <div className="text-2xl font-bold">{detail.stats?.total_invoices || 0}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="py-4">
                    <CardContent>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact & Address</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {detail.contact_name && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-16 flex-shrink-0">Contact</span>
                            <span className="font-medium">{detail.contact_name}</span>
                          </div>
                        )}
                        {detail.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">{detail.phone}</span>
                          </div>
                        )}
                        {detail.billing_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">{detail.billing_email}</span>
                          </div>
                        )}
                        {detail.dot_number && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-16 flex-shrink-0">DOT#</span>
                            <span className="font-medium">{detail.dot_number}</span>
                          </div>
                        )}
                        {(detail.address || detail.city) && (
                          <div className="col-span-2 flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <span className="font-medium">
                              {[detail.address, detail.city, detail.state].filter(Boolean).join(', ')} {detail.zip}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {detail.recent_loads?.length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-muted px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Recent Loads ({detail.recent_loads.length})
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

                  {detail.recent_invoices?.length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-muted px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Recent Invoices ({detail.recent_invoices.length})
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.recent_invoices.map(inv => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                              <TableCell><Badge variant="secondary">{inv.status}</Badge></TableCell>
                              <TableCell className="text-right">${Number(inv.total_amount).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-semibold">${Number(inv.balance_due).toFixed(2)}</TableCell>
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
            <AlertDialogTitle>Deactivate Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate {confirmDelete?.company_name}? They will no longer appear in dropdowns. This can be reversed.
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
