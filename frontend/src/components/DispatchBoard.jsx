import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLoads, getDrivers, getCustomers } from '../services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Plus, Package, Search, LayoutGrid, List, GanttChart, SlidersHorizontal, CalendarIcon, X, Check, ChevronsUpDown, User, Building2 } from 'lucide-react';
import LoadCard from './LoadCard';
import LoadDetail from './LoadDetail';
import DraftReviewModal from './DraftReviewModal';
import LoadCreateModal from './LoadCreateModal';
import LoadListView from './LoadListView';
import LoadTimelineView from './LoadTimelineView';

const STATUSES = [
  { key: 'OPEN', label: 'Open', bgColor: 'bg-blue-50', headerBg: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-400', dot: '#60a5fa' },
  { key: 'SCHEDULED', label: 'Scheduled', bgColor: 'bg-indigo-50', headerBg: 'bg-indigo-100 text-indigo-800', dotColor: 'bg-indigo-400', dot: '#818cf8' },
  { key: 'IN_PICKUP_YARD', label: 'Pickup Yard', bgColor: 'bg-purple-50', headerBg: 'bg-purple-100 text-purple-800', dotColor: 'bg-purple-400', dot: '#c084fc' },
  { key: 'IN_TRANSIT', label: 'In Transit', bgColor: 'bg-sky-50', headerBg: 'bg-sky-100 text-sky-800', dotColor: 'bg-sky-400', dot: '#38bdf8' },
  { key: 'COMPLETED', label: 'Completed', bgColor: 'bg-green-50', headerBg: 'bg-green-100 text-green-800', dotColor: 'bg-green-400', dot: '#4ade80' },
  { key: 'TONU', label: 'TONU', bgColor: 'bg-red-50', headerBg: 'bg-red-100 text-red-800', dotColor: 'bg-red-400', dot: '#f87171' },
  { key: 'CANCELLED', label: 'Cancelled', bgColor: 'bg-slate-50', headerBg: 'bg-slate-100 text-slate-800', dotColor: 'bg-slate-400', dot: '#94a3b8' },
  { key: 'INVOICED', label: 'Invoiced', bgColor: 'bg-emerald-50', headerBg: 'bg-emerald-100 text-emerald-800', dotColor: 'bg-emerald-400', dot: '#34d399' },
  { key: 'BROKERED', label: 'Brokered', bgColor: 'bg-amber-50', headerBg: 'bg-amber-100 text-amber-800', dotColor: 'bg-amber-400', dot: '#fbbf24' },
];

const ALL_STATUS_KEYS = STATUSES.map(s => s.key);
const DEFAULT_VISIBLE = ['OPEN', 'SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT', 'COMPLETED'];

const EQUIPMENT_TYPES = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Power Only', 'Box Truck'];

const VIEWS = [
  { key: 'board', label: 'Board', icon: LayoutGrid },
  { key: 'list', label: 'List', icon: List },
  { key: 'timeline', label: 'Timeline', icon: GanttChart },
];

// ──────────────── Multi-select dropdown ────────────────
function MultiSelectFilter({ label, icon: Icon, options, selected, onChange, renderOption }) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;

  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  const statusLabel = noneSelected
    ? `${label}: None`
    : allSelected
    ? `${label}: All`
    : `${label}: ${selected.length}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed text-xs gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {statusLabel}
          <ChevronsUpDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {/* Select All / None */}
              <CommandItem
                onSelect={() => onChange(allSelected ? [] : options.map(o => o.value))}
                className="text-xs font-semibold"
              >
                <div className="flex items-center gap-2 w-full">
                  <Checkbox checked={allSelected} className="h-3.5 w-3.5" />
                  <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
                </div>
              </CommandItem>
              <Separator className="my-1" />
              {options.map(opt => {
                const isSelected = selected.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => toggle(opt.value)}
                    className="text-xs"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox checked={isSelected} className="h-3.5 w-3.5" />
                      {renderOption ? renderOption(opt) : <span>{opt.label}</span>}
                      {opt.count !== undefined && (
                        <span className="ml-auto text-[10px] text-muted-foreground">{opt.count}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ──────────────── Date range picker ────────────────
function DateRangeFilter({ dateRange, onChange }) {
  const [open, setOpen] = useState(false);
  const hasRange = dateRange.from || dateRange.to;

  const label = hasRange
    ? `${dateRange.from ? dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...'} – ${dateRange.to ? dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...'}`
    : 'Date Range';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`h-8 border-dashed text-xs gap-1.5 ${hasRange ? 'border-amber-300 bg-amber-50' : ''}`}>
          <CalendarIcon className="w-3.5 h-3.5" />
          {label}
          {hasRange && (
            <span
              role="button"
              className="ml-1 rounded-full hover:bg-slate-200 p-0.5"
              onClick={(e) => { e.stopPropagation(); onChange({ from: null, to: null }); }}
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={hasRange ? { from: dateRange.from, to: dateRange.to } : undefined}
          onSelect={(range) => onChange({ from: range?.from || null, to: range?.to || null })}
          numberOfMonths={2}
        />
        <div className="flex items-center justify-between px-3 py-2 border-t">
          <div className="flex gap-1">
            {[
              { label: 'Today', fn: () => { const d = new Date(); onChange({ from: d, to: d }); } },
              { label: 'This Week', fn: () => { const d = new Date(); const s = new Date(d); s.setDate(d.getDate() - d.getDay()); const e = new Date(s); e.setDate(s.getDate() + 6); onChange({ from: s, to: e }); } },
              { label: 'This Month', fn: () => { const d = new Date(); onChange({ from: new Date(d.getFullYear(), d.getMonth(), 1), to: new Date(d.getFullYear(), d.getMonth() + 1, 0) }); } },
            ].map(q => (
              <Button key={q.label} variant="ghost" size="sm" className="h-7 text-xs" onClick={q.fn}>
                {q.label}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange({ from: null, to: null })}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ──────────────── Main component ────────────────
export default function DispatchBoard() {
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [draftReview, setDraftReview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [visibleStatuses, setVisibleStatuses] = useState(DEFAULT_VISIBLE);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [view, setView] = useState('board');
  const queryClient = useQueryClient();

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: getLoads,
    refetchInterval: 3000,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  // Apply all filters
  const filteredLoads = useMemo(() => {
    let result = loads;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
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
    result = result.filter(l => visibleStatuses.includes(l.status));

    // Driver
    if (selectedDrivers.length > 0) {
      result = result.filter(l => {
        if (selectedDrivers.includes('_unassigned')) return !l.driver_id;
        return selectedDrivers.includes(String(l.driver_id));
      });
    }

    // Customer
    if (selectedCustomers.length > 0) {
      result = result.filter(l => selectedCustomers.includes(String(l.customer_id)));
    }

    // Equipment
    if (selectedEquipment.length > 0) {
      result = result.filter(l => selectedEquipment.includes(l.equipment_type));
    }

    // Date range (checks pickup stop appointment)
    if (dateRange.from || dateRange.to) {
      result = result.filter(l => {
        const pickupStop = l.stops?.[0];
        const deliveryStop = l.stops?.[l.stops.length - 1];
        const pickupDate = pickupStop?.appointment_start ? new Date(pickupStop.appointment_start) : null;
        const deliveryDate = deliveryStop?.appointment_start ? new Date(deliveryStop.appointment_start) : null;
        const loadDate = pickupDate || deliveryDate;
        if (!loadDate) return false;

        if (dateRange.from && dateRange.to) {
          const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
          const to = new Date(dateRange.to); to.setHours(23, 59, 59, 999);
          return loadDate >= from && loadDate <= to;
        }
        if (dateRange.from) {
          const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
          return loadDate >= from;
        }
        if (dateRange.to) {
          const to = new Date(dateRange.to); to.setHours(23, 59, 59, 999);
          return loadDate <= to;
        }
        return true;
      });
    }

    return result;
  }, [loads, search, visibleStatuses, selectedDrivers, selectedCustomers, selectedEquipment, dateRange]);

  // Counts per status (from all loads, pre-status-filter)
  const statusCounts = useMemo(() => {
    const counts = {};
    loads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return counts;
  }, [loads]);

  // Grouped for board view
  const groupedLoads = useMemo(() => {
    return STATUSES.reduce((acc, status) => {
      acc[status.key] = filteredLoads.filter(load => load.status === status.key);
      return acc;
    }, {});
  }, [filteredLoads]);

  const activeStatuses = STATUSES.filter(s => visibleStatuses.includes(s.key));
  const colCount = activeStatuses.length;

  // Derive filter options
  const driverOptions = useMemo(() => {
    const opts = [{ value: '_unassigned', label: 'Unassigned' }];
    drivers.forEach(d => opts.push({ value: String(d.id), label: d.full_name }));
    return opts;
  }, [drivers]);

  const customerOptions = useMemo(() => {
    return customers.map(c => ({ value: String(c.id), label: c.company_name }));
  }, [customers]);

  const equipmentOptions = EQUIPMENT_TYPES.map(e => ({ value: e, label: e }));

  const statusOptions = STATUSES.map(s => ({
    value: s.key,
    label: s.label,
    count: statusCounts[s.key] || 0,
    dot: s.dot,
  }));

  const activeFilterCount = [
    selectedDrivers.length > 0,
    selectedCustomers.length > 0,
    selectedEquipment.length > 0,
    dateRange.from || dateRange.to,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setVisibleStatuses(DEFAULT_VISIBLE);
    setSelectedDrivers([]);
    setSelectedCustomers([]);
    setSelectedEquipment([]);
    setDateRange({ from: null, to: null });
    setSearch('');
  };

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
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Dispatch Board</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{filteredLoads.length} load{filteredLoads.length !== 1 ? 's' : ''} {filteredLoads.length !== loads.length ? `of ${loads.length}` : ''}</p>
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
              className="pl-9 w-56 h-8 text-xs"
            />
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="bg-amber-500 hover:bg-amber-600 h-8">
            <Plus className="w-4 h-4" />
            New Load
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />

        <MultiSelectFilter
          label="Status"
          options={statusOptions}
          selected={visibleStatuses}
          onChange={setVisibleStatuses}
          renderOption={(opt) => (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.dot }} />
              <span>{opt.label}</span>
            </div>
          )}
        />

        <MultiSelectFilter
          label="Driver"
          icon={User}
          options={driverOptions}
          selected={selectedDrivers}
          onChange={setSelectedDrivers}
        />

        <MultiSelectFilter
          label="Customer"
          icon={Building2}
          options={customerOptions}
          selected={selectedCustomers}
          onChange={setSelectedCustomers}
        />

        <MultiSelectFilter
          label="Equipment"
          options={equipmentOptions}
          selected={selectedEquipment}
          onChange={setSelectedEquipment}
        />

        <DateRangeFilter dateRange={dateRange} onChange={setDateRange} />

        {(activeFilterCount > 0 || search || visibleStatuses.length !== DEFAULT_VISIBLE.length) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearAllFilters}>
            <X className="w-3 h-3" />
            Clear all
          </Button>
        )}
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
        <LoadListView loads={filteredLoads} onLoadClick={handleCardClick} />
      )}

      {/* Timeline view */}
      {view === 'timeline' && (
        <LoadTimelineView loads={filteredLoads} onLoadClick={handleCardClick} />
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
