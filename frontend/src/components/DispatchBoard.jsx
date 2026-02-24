import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLoads } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Package, Search, LayoutGrid, List, GanttChart } from 'lucide-react';
import LoadCard from './LoadCard';
import LoadDetail from './LoadDetail';
import DraftReviewModal from './DraftReviewModal';
import LoadCreateModal from './LoadCreateModal';
import LoadListView from './LoadListView';
import LoadTimelineView from './LoadTimelineView';

const STATUSES = [
  { key: 'OPEN', label: 'Open', bgColor: 'bg-blue-50', headerBg: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-400' },
  { key: 'SCHEDULED', label: 'Scheduled', bgColor: 'bg-indigo-50', headerBg: 'bg-indigo-100 text-indigo-800', dotColor: 'bg-indigo-400' },
  { key: 'IN_PICKUP_YARD', label: 'Pickup Yard', bgColor: 'bg-purple-50', headerBg: 'bg-purple-100 text-purple-800', dotColor: 'bg-purple-400' },
  { key: 'IN_TRANSIT', label: 'In Transit', bgColor: 'bg-sky-50', headerBg: 'bg-sky-100 text-sky-800', dotColor: 'bg-sky-400' },
  { key: 'COMPLETED', label: 'Completed', bgColor: 'bg-green-50', headerBg: 'bg-green-100 text-green-800', dotColor: 'bg-green-400' },
  { key: 'TONU', label: 'TONU', bgColor: 'bg-red-50', headerBg: 'bg-red-100 text-red-800', dotColor: 'bg-red-400' },
  { key: 'CANCELLED', label: 'Cancelled', bgColor: 'bg-slate-50', headerBg: 'bg-slate-100 text-slate-800', dotColor: 'bg-slate-400' },
  { key: 'INVOICED', label: 'Invoiced', bgColor: 'bg-emerald-50', headerBg: 'bg-emerald-100 text-emerald-800', dotColor: 'bg-emerald-400' },
  { key: 'BROKERED', label: 'Brokered', bgColor: 'bg-amber-50', headerBg: 'bg-amber-100 text-amber-800', dotColor: 'bg-amber-400' },
];

const DEFAULT_VISIBLE = ['OPEN', 'SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT', 'COMPLETED'];

const VIEWS = [
  { key: 'board', label: 'Board', icon: LayoutGrid },
  { key: 'list', label: 'List', icon: List },
  { key: 'timeline', label: 'Timeline', icon: GanttChart },
];

export default function DispatchBoard() {
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [draftReview, setDraftReview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [visibleStatuses, setVisibleStatuses] = useState(DEFAULT_VISIBLE);
  const [view, setView] = useState('board');
  const queryClient = useQueryClient();

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: getLoads,
    refetchInterval: 3000,
  });

  const filteredLoads = useMemo(() => {
    let result = loads;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        String(l.id).includes(q) ||
        l.reference_number?.toLowerCase().includes(q) ||
        l.customer_name?.toLowerCase().includes(q) ||
        l.driver_name?.toLowerCase().includes(q) ||
        l.origin_city?.toLowerCase().includes(q) ||
        l.destination_city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [loads, search]);

  const statusFilteredLoads = useMemo(() => {
    return filteredLoads.filter(l => visibleStatuses.includes(l.status));
  }, [filteredLoads, visibleStatuses]);

  const groupedLoads = STATUSES.reduce((acc, status) => {
    acc[status.key] = filteredLoads.filter(load => load.status === status.key);
    return acc;
  }, {});

  const toggleStatus = (key) => {
    setVisibleStatuses(prev =>
      prev.includes(key)
        ? prev.filter(s => s !== key)
        : [...prev, key]
    );
  };

  const activeStatuses = STATUSES.filter(s => visibleStatuses.includes(s.key));
  const colCount = activeStatuses.length;

  const handleCardClick = (load) => {
    if (load.status === 'OPEN' && load.email_import_id) {
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
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Dispatch Board</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{statusFilteredLoads.length} load{statusFilteredLoads.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {VIEWS.map(v => {
              const Icon = v.icon;
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    view === v.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v.label}
                </button>
              );
            })}
          </div>

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

      {/* Status filter pills */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {STATUSES.map(status => {
          const active = visibleStatuses.includes(status.key);
          const count = groupedLoads[status.key]?.length || 0;
          return (
            <button
              key={status.key}
              onClick={() => toggleStatus(status.key)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                active
                  ? `${status.headerBg} border-transparent`
                  : 'bg-white text-muted-foreground border-slate-200 opacity-60 hover:opacity-100'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${active ? status.dotColor : 'bg-slate-300'}`} />
              {status.label}
              <span className={`ml-0.5 text-[10px] ${active ? 'opacity-80' : 'opacity-50'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {activeStatuses.map(status => {
            const count = groupedLoads[status.key]?.length || 0;
            return (
              <div key={status.key} className="flex flex-col min-w-0">
                <div className={`${status.headerBg} px-3 py-2 rounded-t-xl flex items-center justify-between gap-1`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dotColor}`} />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider truncate">{status.label}</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold rounded-full flex-shrink-0 px-1.5">
                    {count}
                  </Badge>
                </div>
                <div className={`${status.bgColor} rounded-b-xl p-2 min-h-[460px] space-y-2 border border-t-0 border-slate-200 ${
                  status.key === 'OPEN' ? 'border-dashed border-blue-300' : ''
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
      )}

      {/* List view */}
      {view === 'list' && (
        <LoadListView loads={statusFilteredLoads} onLoadClick={handleCardClick} />
      )}

      {/* Timeline view */}
      {view === 'timeline' && (
        <LoadTimelineView loads={statusFilteredLoads} onLoadClick={handleCardClick} />
      )}

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
