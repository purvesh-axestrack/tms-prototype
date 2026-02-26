import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInvoices } from '../services/api';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BarChart3, FileText, Search } from 'lucide-react';
import InvoiceCreateModal from '../components/InvoiceCreateModal';
import InvoiceDetail from '../components/InvoiceDetail';
import AgingReport from '../components/AgingReport';
import { INVOICE_STATUS_COLORS as STATUS_COLORS } from '@/lib/constants';

const STATUS_TABS = ['ALL', 'DRAFT', 'SENT', 'OVERDUE', 'PAID', 'VOID'];

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showAging, setShowAging] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', activeTab],
    queryFn: () => getInvoices(activeTab !== 'ALL' ? { status: activeTab } : {}),
    refetchInterval: 5000,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(inv =>
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.customer_name?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const handleInvoiceUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    setSelectedInvoice(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold">Invoices</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage customer billing and payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant={showAging ? 'default' : 'outline'} onClick={() => setShowAging(!showAging)}>
            <BarChart3 className="w-4 h-4" />
            Aging Report
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="w-4 h-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {showAging && (
        <div className="mb-6">
          <AgingReport />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {STATUS_TABS.map(tab => (
              <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="pl-9 w-56 h-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
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
                    <FileText className="w-10 h-10 text-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">{search ? 'No matching invoices' : 'No invoices found'}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(inv => (
                <TableRow key={inv.id} onClick={() => setSelectedInvoice(inv)} className="cursor-pointer group">
                  <TableCell className="font-semibold group-hover:text-amber-600 transition-colors">{inv.invoice_number}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.customer_name}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[inv.status]}>{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{inv.issue_date}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.due_date}</TableCell>
                  <TableCell className="text-right font-semibold">${Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {parseFloat(inv.balance_due) > 0 ? (
                      <span className="text-red-600">${Number(inv.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    ) : (
                      <span className="text-green-600">$0.00</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showCreate && (
        <InvoiceCreateModal
          onClose={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          }}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetail
          invoiceId={selectedInvoice.id}
          onClose={() => setSelectedInvoice(null)}
          onUpdate={handleInvoiceUpdated}
        />
      )}
    </div>
  );
}
