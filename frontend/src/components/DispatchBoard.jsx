import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLoads } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Package, Search } from 'lucide-react';
import LoadCard from './LoadCard';
import LoadDetail from './LoadDetail';
import DraftReviewModal from './DraftReviewModal';
import LoadCreateModal from './LoadCreateModal';

const STATUSES = [
  { key: 'DRAFT', label: 'Draft', bgColor: 'bg-yellow-50', headerBg: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-400' },
  { key: 'CREATED', label: 'Created', bgColor: 'bg-indigo-50', headerBg: 'bg-indigo-100 text-indigo-800', dotColor: 'bg-indigo-400' },
  { key: 'ASSIGNED', label: 'Assigned', bgColor: 'bg-purple-50', headerBg: 'bg-purple-100 text-purple-800', dotColor: 'bg-purple-400' },
  { key: 'DISPATCHED', label: 'Dispatched', bgColor: 'bg-blue-50', headerBg: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-400' },
  { key: 'PICKED_UP', label: 'Picked Up', bgColor: 'bg-sky-50', headerBg: 'bg-sky-100 text-sky-800', dotColor: 'bg-sky-400' },
  { key: 'IN_TRANSIT', label: 'In Transit', bgColor: 'bg-green-50', headerBg: 'bg-green-100 text-green-800', dotColor: 'bg-green-400' },
  { key: 'DELIVERED', label: 'Delivered', bgColor: 'bg-emerald-50', headerBg: 'bg-emerald-100 text-emerald-800', dotColor: 'bg-emerald-400' },
];

export default function DispatchBoard() {
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [draftReview, setDraftReview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: getLoads,
    refetchInterval: 3000,
  });

  const filteredLoads = useMemo(() => {
    if (!search.trim()) return loads;
    const q = search.toLowerCase();
    return loads.filter(l =>
      String(l.id).includes(q) ||
      l.reference_number?.toLowerCase().includes(q) ||
      l.customer_name?.toLowerCase().includes(q) ||
      l.driver_name?.toLowerCase().includes(q) ||
      l.origin_city?.toLowerCase().includes(q) ||
      l.destination_city?.toLowerCase().includes(q)
    );
  }, [loads, search]);

  const groupedLoads = STATUSES.reduce((acc, status) => {
    acc[status.key] = filteredLoads.filter(load => load.status === status.key);
    return acc;
  }, {});

  const handleCardClick = (load) => {
    if (load.status === 'DRAFT' && load.email_import_id) {
      setDraftReview({ id: load.email_import_id });
    } else {
      setSelectedLoad(load);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-12 rounded-t-lg" />
              <div className="space-y-2 p-2">
                <Skeleton className="h-28 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Dispatch Board</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{filteredLoads.length} load{filteredLoads.length !== 1 ? 's' : ''} across {STATUSES.length} stages</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search loads..."
              className="pl-9 w-60 h-9"
            />
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="w-4 h-4" />
            New Load
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {STATUSES.map(status => {
          const count = groupedLoads[status.key]?.length || 0;
          return (
            <div key={status.key} className="flex flex-col">
              <div className={`${status.headerBg} px-3.5 py-2.5 rounded-t-xl flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider">{status.label}</h3>
                </div>
                <Badge variant="secondary" className="text-[11px] font-bold rounded-full">
                  {count}
                </Badge>
              </div>
              <div className={`${status.bgColor} rounded-b-xl p-2 min-h-[460px] space-y-2 border border-t-0 border-slate-200 ${
                status.key === 'DRAFT' ? 'border-dashed border-yellow-300' : ''
              }`}>
                {groupedLoads[status.key]?.map(load => (
                  <LoadCard
                    key={load.id}
                    load={load}
                    onClick={() => handleCardClick(load)}
                  />
                ))}
                {count === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Package className="w-8 h-8 mb-2 opacity-30" />
                    <span className="text-xs">No loads</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedLoad && (
        <LoadDetail
          load={selectedLoad}
          onClose={() => setSelectedLoad(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['loads'] });
            setSelectedLoad(null);
          }}
        />
      )}

      {draftReview && (
        <DraftReviewModal
          emailImport={draftReview}
          onClose={() => {
            setDraftReview(null);
            queryClient.invalidateQueries({ queryKey: ['loads'] });
          }}
        />
      )}

      {showCreateModal && (
        <LoadCreateModal
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}
