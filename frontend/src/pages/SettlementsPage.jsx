import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSettlements } from '../services/api';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Wallet, Search } from 'lucide-react';
import SettlementBatchModal from '../components/SettlementBatchModal';
import SettlementDetail from '../components/SettlementDetail';

const STATUS_TABS = ['ALL', 'DRAFT', 'APPROVED', 'PAID'];

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
};

export default function SettlementsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['settlements', activeTab],
    queryFn: () => getSettlements(activeTab !== 'ALL' ? { status: activeTab } : {}),
    refetchInterval: 5000,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return settlements;
    const q = search.toLowerCase();
    return settlements.filter(s =>
      s.settlement_number?.toLowerCase().includes(q) ||
      s.driver_name?.toLowerCase().includes(q)
    );
  }, [settlements, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold">Driver Settlements</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Generate and manage driver pay statements</p>
        </div>
        <Button onClick={() => setShowGenerate(true)} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4" />
          Generate Settlements
        </Button>
      </div>

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
            placeholder="Search settlements..."
            className="pl-9 w-56 h-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Settlement #</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Loads</TableHead>
              <TableHead className="text-center">Miles</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net Pay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Wallet className="w-10 h-10 text-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">{search ? 'No matching settlements' : 'No settlements found'}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(s => (
                <TableRow key={s.id} onClick={() => setSelectedSettlement(s)} className="cursor-pointer group">
                  <TableCell className="font-semibold group-hover:text-amber-600 transition-colors">{s.settlement_number}</TableCell>
                  <TableCell className="text-muted-foreground">{s.driver_name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.period_start} &mdash; {s.period_end}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[s.status]}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{s.total_loads}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{Number(s.total_miles).toLocaleString()}</TableCell>
                  <TableCell className="text-right">${Number(s.gross_pay).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-600">-${Number(s.total_deductions).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-green-700">${Number(s.net_pay).toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showGenerate && (
        <SettlementBatchModal
          onClose={() => {
            setShowGenerate(false);
            queryClient.invalidateQueries({ queryKey: ['settlements'] });
          }}
        />
      )}

      {selectedSettlement && (
        <SettlementDetail
          settlementId={selectedSettlement.id}
          onClose={() => setSelectedSettlement(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['settlements'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            setSelectedSettlement(null);
          }}
        />
      )}
    </div>
  );
}
