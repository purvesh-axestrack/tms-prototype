import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  SlidersHorizontal, CalendarIcon, X, ChevronsUpDown, ChevronDown, ChevronRight,
  Search, User, Building2, Truck, MapPin,
} from 'lucide-react';

// ──── US States ────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

// ──── Status config ────
const STATUSES = [
  { key: 'OPEN', label: 'Open', dot: '#3b82f6' },
  { key: 'SCHEDULED', label: 'Scheduled', dot: '#6366f1' },
  { key: 'IN_PICKUP_YARD', label: 'Pickup Yard', dot: '#a855f7' },
  { key: 'IN_TRANSIT', label: 'In Transit', dot: '#0ea5e9' },
  { key: 'COMPLETED', label: 'Completed', dot: '#22c55e' },
  { key: 'TONU', label: 'TONU', dot: '#ef4444' },
  { key: 'CANCELLED', label: 'Cancelled', dot: '#94a3b8' },
  { key: 'INVOICED', label: 'Invoiced', dot: '#10b981' },
  { key: 'BROKERED', label: 'Brokered', dot: '#f59e0b' },
];

const EQUIPMENT_TYPES = ['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'POWER_ONLY', 'STRAIGHT_TRUCK'];
const ALL_STATUS_KEYS = STATUSES.map(s => s.key);

// ──── Reusable multi-select ────
function MultiSelect({ label, icon: Icon, options, selected, onChange, renderOption, className = '' }) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;

  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  const displayLabel = noneSelected
    ? 'All'
    : allSelected
    ? 'All'
    : selected.length <= 2
    ? selected.map(v => options.find(o => o.value === v)?.label || v).join(', ')
    : `${selected.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`h-8 text-xs gap-1 justify-between min-w-[120px] ${className}`}>
          <span className="flex items-center gap-1.5 truncate">
            {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium truncate">{displayLabel}</span>
          </span>
          <ChevronsUpDown className="w-3 h-3 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search...`} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => onChange(allSelected ? [] : options.map(o => o.value))}
                className="text-xs font-medium"
              >
                <Checkbox checked={allSelected} className="h-3.5 w-3.5 mr-2" />
                {allSelected ? 'Deselect All' : 'Select All'}
              </CommandItem>
              <Separator className="my-1" />
              {options.map(opt => (
                <CommandItem key={opt.value} onSelect={() => toggle(opt.value)} className="text-xs">
                  <Checkbox checked={selected.includes(opt.value)} className="h-3.5 w-3.5 mr-2" />
                  {renderOption ? renderOption(opt) : <span>{opt.label}</span>}
                  {opt.count !== undefined && (
                    <span className="ml-auto text-[10px] text-muted-foreground">{opt.count}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ──── Date range picker ────
function DateRangePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const hasRange = value.from || value.to;

  const display = hasRange
    ? `${value.from ? value.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...'} – ${value.to ? value.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...'}`
    : 'Any';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`h-8 text-xs gap-1 justify-between min-w-[140px] ${hasRange ? 'border-amber-300 bg-amber-50' : ''}`}>
          <span className="flex items-center gap-1.5 truncate">
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium">{display}</span>
          </span>
          {hasRange && (
            <span role="button" className="rounded-full hover:bg-slate-200 p-0.5" onClick={(e) => { e.stopPropagation(); onChange({ from: null, to: null }); }}>
              <X className="w-3 h-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={hasRange ? { from: value.from, to: value.to } : undefined}
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
              <Button key={q.label} variant="ghost" size="sm" className="h-7 text-xs" onClick={q.fn}>{q.label}</Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange({ from: null, to: null })}>Clear</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ──── Text search filter ────
function TextFilter({ label, value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Search...`}
        className="h-7 text-xs w-32"
      />
    </div>
  );
}

// ──── Collapsible section ────
function FilterSection({ label, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-slate-700 py-1">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
      </button>
      {open && <div className="flex flex-wrap gap-2 mt-1 mb-2">{children}</div>}
    </div>
  );
}

// ──── Toggle filter ────
function ToggleFilter({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={value} onCheckedChange={onChange} size="sm" />
      <Label className="text-xs font-medium cursor-pointer" onClick={() => onChange(!value)}>{label}</Label>
    </div>
  );
}

// ──── Main filters export ────
export const DEFAULT_FILTERS = {
  search: '',
  statuses: ['OPEN', 'SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT', 'COMPLETED'],
  drivers: [],
  customers: [],
  equipment: [],
  vehicles: [],
  pickupState: [],
  deliveryState: [],
  pickupCity: '',
  deliveryCity: '',
  pickupDate: { from: null, to: null },
  deliveryDate: { from: null, to: null },
  referenceNumber: '',
  notInvoiced: false,
  settled: false,
};

export { STATUSES, ALL_STATUS_KEYS };

export default function LoadFilters({
  filters,
  onChange,
  loads = [],
  drivers = [],
  customers = [],
  vehicles = [],
}) {
  const [expanded, setExpanded] = useState(false);

  const update = (key, val) => onChange({ ...filters, [key]: val });

  // Status counts from raw loads
  const statusCounts = useMemo(() => {
    const counts = {};
    loads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return counts;
  }, [loads]);

  const statusOptions = STATUSES.map(s => ({
    value: s.key,
    label: s.label,
    count: statusCounts[s.key] || 0,
    dot: s.dot,
  }));

  const driverOptions = useMemo(() => {
    const opts = [{ value: '_unassigned', label: 'Unassigned' }];
    drivers.forEach(d => opts.push({ value: String(d.id), label: d.full_name }));
    return opts;
  }, [drivers]);

  const customerOptions = useMemo(() =>
    customers.map(c => ({ value: String(c.id), label: c.company_name })), [customers]);

  const equipmentOptions = EQUIPMENT_TYPES.map(e => ({ value: e, label: e }));

  const vehicleOptions = useMemo(() =>
    vehicles.map(v => ({ value: String(v.id), label: `${v.unit_number} (${v.type})` })), [vehicles]);

  const stateOptions = US_STATES.map(s => ({ value: s, label: s }));

  const activeCount = [
    filters.statuses.length !== 5, // non-default
    filters.drivers.length > 0,
    filters.customers.length > 0,
    filters.equipment.length > 0,
    filters.vehicles.length > 0,
    filters.pickupState.length > 0,
    filters.deliveryState.length > 0,
    filters.pickupCity,
    filters.deliveryCity,
    filters.pickupDate.from || filters.pickupDate.to,
    filters.deliveryDate.from || filters.deliveryDate.to,
    filters.referenceNumber,
    filters.notInvoiced,
    filters.settled,
    filters.search,
  ].filter(Boolean).length;

  return (
    <div className="mb-3 space-y-2">
      {/* Primary row */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />

        <MultiSelect
          label="Status"
          options={statusOptions}
          selected={filters.statuses}
          onChange={(v) => update('statuses', v)}
          renderOption={(opt) => (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.dot }} />
              {opt.label}
            </span>
          )}
        />

        <MultiSelect label="Driver" icon={User} options={driverOptions} selected={filters.drivers} onChange={(v) => update('drivers', v)} />
        <MultiSelect label="Customer" icon={Building2} options={customerOptions} selected={filters.customers} onChange={(v) => update('customers', v)} />
        <MultiSelect label="Equipment" options={equipmentOptions} selected={filters.equipment} onChange={(v) => update('equipment', v)} />

        <DateRangePicker label="Pickup" value={filters.pickupDate} onChange={(v) => update('pickupDate', v)} />
        <DateRangePicker label="Delivery" value={filters.deliveryDate} onChange={(v) => update('deliveryDate', v)} />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Less' : 'More'}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {activeCount > 0 && (
            <Badge className="ml-1 h-4 px-1 text-[10px] bg-amber-100 text-amber-700">{activeCount}</Badge>
          )}
        </Button>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => onChange(DEFAULT_FILTERS)}>
            <X className="w-3 h-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="bg-slate-50 rounded-lg border p-3 space-y-1">
          <FilterSection label="Location" defaultOpen>
            <MultiSelect label="Pickup State" icon={MapPin} options={stateOptions} selected={filters.pickupState} onChange={(v) => update('pickupState', v)} className="min-w-[140px]" />
            <MultiSelect label="Delivery State" icon={MapPin} options={stateOptions} selected={filters.deliveryState} onChange={(v) => update('deliveryState', v)} className="min-w-[140px]" />
            <TextFilter label="Pickup City" value={filters.pickupCity} onChange={(v) => update('pickupCity', v)} />
            <TextFilter label="Delivery City" value={filters.deliveryCity} onChange={(v) => update('deliveryCity', v)} />
          </FilterSection>

          <Separator />

          <FilterSection label="IDs & Reference">
            <TextFilter label="Ref / Conf #" value={filters.referenceNumber} onChange={(v) => update('referenceNumber', v)} placeholder="Reference #" />
          </FilterSection>

          <Separator />

          <FilterSection label="Vehicles">
            <MultiSelect label="Truck / Trailer" icon={Truck} options={vehicleOptions} selected={filters.vehicles} onChange={(v) => update('vehicles', v)} />
          </FilterSection>

          <Separator />

          <FilterSection label="Toggles">
            <ToggleFilter label="Not Invoiced" value={filters.notInvoiced} onChange={(v) => update('notInvoiced', v)} />
            <ToggleFilter label="Settled" value={filters.settled} onChange={(v) => update('settled', v)} />
          </FilterSection>
        </div>
      )}
    </div>
  );
}
