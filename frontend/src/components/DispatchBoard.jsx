import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getLoads, getDrivers, getCustomers, getVehicles, extractRateCon } from '../services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, Package, Search, LayoutGrid, List, GanttChart, ChevronUp, ChevronDown, RefreshCw, Upload, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import LoadCard from './LoadCard';
import LoadDetail from './LoadDetail';
import DraftReviewModal from './DraftReviewModal';
import LoadCreateModal from './LoadCreateModal';
import LoadListView from './LoadListView';
import LoadTimelineView from './LoadTimelineView';
import LoadFilters, { DEFAULT_FILTERS, STATUSES } from './LoadFilters';

const VIEWS = [
  { key: 'board', label: 'Board', icon: LayoutGrid },
  { key: 'list', label: 'List', icon: List },
  { key: 'timeline', label: 'Timeline', icon: GanttChart },
];

// ──── Apply all filters ────
function applyFilters(loads, filters) {
  let result = loads;

  // Text search
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(l =>
      String(l.id).includes(q) ||
      l.reference_number?.toLowerCase().includes(q) ||
      l.customer_name?.toLowerCase().includes(q) ||
      l.driver_name?.toLowerCase().includes(q) ||
      l.pickup_city?.toLowerCase().includes(q) ||
      l.delivery_city?.toLowerCase().includes(q)
    );
  }

  // Status
  if (filters.statuses.length > 0) {
    result = result.filter(l => filters.statuses.includes(l.status));
  }

  // Driver
  if (filters.drivers.length > 0) {
    result = result.filter(l => {
      if (filters.drivers.includes('_unassigned')) return !l.driver_id;
      return filters.drivers.includes(String(l.driver_id));
    });
  }

  // Customer
  if (filters.customers.length > 0) {
    result = result.filter(l => filters.customers.includes(String(l.customer_id)));
  }

  // Equipment
  if (filters.equipment.length > 0) {
    result = result.filter(l => filters.equipment.includes(l.equipment_type));
  }

  // Vehicles (truck_id or trailer_id)
  if (filters.vehicles.length > 0) {
    result = result.filter(l =>
      filters.vehicles.includes(String(l.truck_id)) ||
      filters.vehicles.includes(String(l.trailer_id))
    );
  }

  // Pickup state
  if (filters.pickupState.length > 0) {
    result = result.filter(l => filters.pickupState.includes(l.pickup_state));
  }

  // Delivery state
  if (filters.deliveryState.length > 0) {
    result = result.filter(l => filters.deliveryState.includes(l.delivery_state));
  }

  // Pickup city
  if (filters.pickupCity) {
    const q = filters.pickupCity.toLowerCase();
    result = result.filter(l => l.pickup_city?.toLowerCase().includes(q));
  }

  // Delivery city
  if (filters.deliveryCity) {
    const q = filters.deliveryCity.toLowerCase();
    result = result.filter(l => l.delivery_city?.toLowerCase().includes(q));
  }

  // Reference number
  if (filters.referenceNumber) {
    const q = filters.referenceNumber.toLowerCase();
    result = result.filter(l => l.reference_number?.toLowerCase().includes(q));
  }

  // Pickup date range
  if (filters.pickupDate.from || filters.pickupDate.to) {
    result = result.filter(l => {
      const stop = l.stops?.[0];
      const d = stop?.appointment_start ? new Date(stop.appointment_start) : null;
      if (!d) return false;
      if (filters.pickupDate.from) {
        const from = new Date(filters.pickupDate.from); from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (filters.pickupDate.to) {
        const to = new Date(filters.pickupDate.to); to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }

  // Delivery date range
  if (filters.deliveryDate.from || filters.deliveryDate.to) {
    result = result.filter(l => {
      const stop = l.stops?.[l.stops.length - 1];
      const d = stop?.appointment_start ? new Date(stop.appointment_start) : null;
      if (!d) return false;
      if (filters.deliveryDate.from) {
        const from = new Date(filters.deliveryDate.from); from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (filters.deliveryDate.to) {
        const to = new Date(filters.deliveryDate.to); to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }

  // Not invoiced
  if (filters.notInvoiced) {
    result = result.filter(l => !l.invoice_id);
  }

  // Settled
  if (filters.settled) {
    result = result.filter(l => !!l.settlement_id);
  }

  return result;
}

// ──── Board column config (matches STATUSES) ────
const BOARD_COLUMNS = [
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

export default function DispatchBoard() {
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [draftReview, setDraftReview] = useState(null);
  const [createPrefill, setCreatePrefill] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [view, setView] = useState('board');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const queryClient = useQueryClient();

  // ── Drag-and-drop rate con upload ──
  const extractMutation = useMutation({
    mutationFn: extractRateCon,
    onSuccess: (data) => {
      setCreatePrefill(data);
      setShowCreateModal(true);
      toast.success('Rate con extracted — review and confirm');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to extract rate con');
    },
  });

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported');
      return;
    }

    extractMutation.mutate(file);
  }, [extractMutation]);

  const { data: loads = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['loads'],
    queryFn: getLoads,
  });

  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: getDrivers, staleTime: 5 * 60 * 1000 });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers, staleTime: 5 * 60 * 1000 });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles, staleTime: 5 * 60 * 1000 });

  const filteredLoads = useMemo(() => applyFilters(loads, filters), [loads, filters]);

  const groupedLoads = useMemo(() => {
    return BOARD_COLUMNS.reduce((acc, col) => {
      acc[col.key] = filteredLoads.filter(load => load.status === col.key);
      return acc;
    }, {});
  }, [filteredLoads]);

  const activeColumns = BOARD_COLUMNS.filter(c => filters.statuses.includes(c.key));
  const colCount = activeColumns.length;

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
        <Skeleton className="h-9 w-full rounded-lg" />
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
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {/* Drop overlay */}
      {(isDragging || extractMutation.isPending) && (
        <div className="absolute inset-0 z-50 bg-blue-50/90 border-2 border-dashed border-blue-400 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm">
          {extractMutation.isPending ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-blue-800">Extracting rate con...</p>
              <p className="text-xs text-blue-600 mt-1">i is reading the PDF</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-blue-500 mb-3" />
              <p className="text-sm font-semibold text-blue-800">Drop rate con PDF here</p>
              <p className="text-xs text-blue-600 mt-1">Creates a new load from the extracted data</p>
            </>
          )}
        </div>
      )}

      {headerCollapsed ? (
        /* ── Collapsed header: compact single-line bar ── */
        <div className="mb-3 flex items-center justify-between gap-3 py-1">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-display font-bold whitespace-nowrap">Dispatch Board</h2>
            <Badge variant="secondary" className="text-xs shrink-0">
              {filteredLoads.length} load{filteredLoads.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)} variant="outline" size="sm">
              {VIEWS.map(v => {
                const Icon = v.icon;
                return (
                  <ToggleGroupItem key={v.key} value={v.key} className="text-xs gap-1.5 px-2.5 h-8">
                    <Icon className="w-3.5 h-3.5" />
                    {v.label}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Search loads..."
                className="pl-9 w-44 h-8 text-xs"
              />
            </div>

            <Button onClick={() => refetch()} size="sm" variant="outline" className="h-8" disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>

            <Button onClick={() => setShowCreateModal(true)} size="sm" className="theme-brand-bg text-white h-8">
              <Plus className="w-4 h-4" />
              New Load
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => setHeaderCollapsed(false)}
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Show Filters
            </Button>
          </div>
        </div>
      ) : (
        /* ── Expanded header: full header + filters ── */
        <>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold">Dispatch Board</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filteredLoads.length} load{filteredLoads.length !== 1 ? 's' : ''}
                {filteredLoads.length !== loads.length ? ` of ${loads.length}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)} variant="outline" size="sm">
                {VIEWS.map(v => {
                  const Icon = v.icon;
                  return (
                    <ToggleGroupItem key={v.key} value={v.key} className="text-xs gap-1.5 px-2.5 h-8">
                      <Icon className="w-3.5 h-3.5" />
                      {v.label}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder="Search loads..."
                  className="pl-9 w-52 h-8 text-xs"
                />
              </div>

              <Button onClick={() => refetch()} size="sm" variant="outline" className="h-8" disabled={isFetching}>
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>

              <Button onClick={() => setShowCreateModal(true)} size="sm" className="theme-brand-bg text-white h-8">
                <Plus className="w-4 h-4" />
                New Load
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => setHeaderCollapsed(true)}
              >
                <ChevronUp className="w-3.5 h-3.5" />
                Collapse
              </Button>
            </div>
          </div>

          {/* Filter bar */}
          <LoadFilters
            filters={filters}
            onChange={setFilters}
            loads={loads}
            drivers={drivers}
            customers={customers}
            vehicles={vehicles}
          />
        </>
      )}

      {/* Board view */}
      {view === 'board' && colCount > 0 && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {activeColumns.map(col => {
            const count = groupedLoads[col.key]?.length || 0;
            return (
              <div key={col.key} className="flex flex-col min-w-0">
                <div className={`${col.headerBg} px-3 py-2 rounded-t-xl flex items-center justify-between gap-1`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dotColor}`} />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider truncate">{col.label}</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold rounded-full flex-shrink-0 px-1.5">
                    {count}
                  </Badge>
                </div>
                <div className={`${col.bgColor} rounded-b-xl p-2 min-h-[460px] space-y-2 border border-t-0 border-slate-200 ${
                  col.key === 'OPEN' ? 'border-dashed border-blue-300' : ''
                }`}>
                  {groupedLoads[col.key]?.map(load => (
                    <LoadCard key={load.id} load={load} onClick={() => handleCardClick(load)} />
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

      {view === 'board' && colCount === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">No statuses selected. Use the Status filter to show columns.</p>
        </div>
      )}

      {/* List view */}
      {view === 'list' && <LoadListView loads={filteredLoads} onLoadClick={handleCardClick} />}

      {/* Timeline view */}
      {view === 'timeline' && <LoadTimelineView loads={filteredLoads} onLoadClick={handleCardClick} />}

      {selectedLoad && (
        <LoadDetail
          loadId={selectedLoad.id}
          initialData={selectedLoad}
          onClose={() => setSelectedLoad(null)}
        />
      )}

      {draftReview && (
        <DraftReviewModal
          emailImport={draftReview}
          onClose={() => { setDraftReview(null); queryClient.invalidateQueries({ queryKey: ['loads'] }); }}
        />
      )}

      {showCreateModal && (
        <LoadCreateModal
          prefill={createPrefill}
          onClose={() => { setShowCreateModal(false); setCreatePrefill(null); }}
        />
      )}
    </div>
  );
}
