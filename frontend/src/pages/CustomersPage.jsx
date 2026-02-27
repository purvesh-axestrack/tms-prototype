import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, deleteCustomer, getCustomerById } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Building2, Search, Pencil, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import CustomerFormDialog from '../components/CustomerFormDialog';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
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
    setShowForm(true);
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

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
      {showForm && (
        <CustomerFormDialog
          open={showForm}
          onOpenChange={(open) => !open && closeForm()}
          editingCustomer={editingCustomer}
          onSuccess={() => closeForm()}
        />
      )}

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
