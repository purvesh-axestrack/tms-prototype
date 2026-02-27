import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings2, MessageSquare } from 'lucide-react';
import { LOAD_STATUS_COLORS as statusColors } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

// ── Column definitions ──
const ALL_COLUMNS = [
  { key: 'id', label: '#', width: 'w-16', alwaysOn: true },
  { key: 'reference', label: 'Reference' },
  { key: 'status', label: 'Status' },
  { key: 'customer', label: 'Customer' },
  { key: 'origin', label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  { key: 'driver', label: 'Driver' },
  { key: 'miles', label: 'Miles', align: 'right' },
  { key: 'rate', label: 'Rate', align: 'right' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'notes', label: 'Notes', align: 'center' },
  { key: 'pickup_date', label: 'Pickup Date' },
  { key: 'delivery_date', label: 'Delivery Date' },
  { key: 'tractor', label: 'Truck' },
  { key: 'trailer', label: 'Trailer' },
  { key: 'total', label: 'Total Rev', align: 'right' },
];

const DEFAULT_VISIBLE = ['id', 'reference', 'status', 'customer', 'origin', 'destination', 'driver', 'miles', 'rate', 'equipment'];
const STORAGE_KEY = 'tms:listview:columns';

function loadSavedColumns() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_VISIBLE;
}

// ── Cell renderers ──
function renderCell(key, load) {
  switch (key) {
    case 'id':
      return <span className="font-bold">{load.id}</span>;
    case 'reference':
      return <span className="text-muted-foreground text-xs">{load.reference_number || '\u2014'}</span>;
    case 'status':
      return (
        <Badge className={`text-[10px] font-bold whitespace-nowrap ${statusColors[load.status]}`}>
          {load.status.replaceAll('_', ' ')}
        </Badge>
      );
    case 'customer':
      return <span className="font-medium text-sm">{load.customer_name || '\u2014'}</span>;
    case 'origin':
      return <span className="text-sm">{load.pickup_city}, {load.pickup_state}</span>;
    case 'destination':
      return <span className="text-sm">{load.delivery_city}, {load.delivery_state}</span>;
    case 'driver':
      return load.driver_name ? (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] font-bold theme-brand-badge">
              {load.driver_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{load.driver_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs italic">Unassigned</span>
      );
    case 'miles':
      return <span className="text-sm">{load.loaded_miles}</span>;
    case 'rate':
      return <span className="font-semibold text-sm text-green-700">${Number(load.rate_amount || 0).toLocaleString()}</span>;
    case 'total':
      return <span className="font-semibold text-sm text-green-700">${Number(load.total_amount || load.rate_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>;
    case 'equipment':
      return <span className="text-xs text-muted-foreground">{load.equipment_type?.replaceAll('_', ' ') || '\u2014'}</span>;
    case 'notes':
      if (!load.notes_count) return <span className="text-muted-foreground text-xs">\u2014</span>;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{load.notes_count}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs">
            <p className="font-semibold">{load.latest_note?.user_name}</p>
            <p className="line-clamp-2 text-muted-foreground">{load.latest_note?.note}</p>
            {load.latest_note?.created_at && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(load.latest_note.created_at), { addSuffix: true })}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      );
    case 'pickup_date':
      return <span className="text-xs text-muted-foreground">{load.pickup_date ? new Date(load.pickup_date).toLocaleDateString() : '\u2014'}</span>;
    case 'delivery_date':
      return <span className="text-xs text-muted-foreground">{load.delivery_date ? new Date(load.delivery_date).toLocaleDateString() : '\u2014'}</span>;
    case 'tractor':
      return <span className="text-xs text-muted-foreground">{load.truck_unit || '\u2014'}</span>;
    case 'trailer':
      return <span className="text-xs text-muted-foreground">{load.trailer_unit || '\u2014'}</span>;
    default:
      return '\u2014';
  }
}

export default function LoadListView({ loads, onLoadClick }) {
  const [visibleKeys, setVisibleKeys] = useState(loadSavedColumns);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleKeys));
  }, [visibleKeys]);

  const toggleColumn = (key) => {
    setVisibleKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const visibleColumns = ALL_COLUMNS.filter(c => visibleKeys.includes(c.key));

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-end px-3 py-1.5 bg-slate-50 border-b">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              Columns ({visibleKeys.length})
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Toggle Columns
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {ALL_COLUMNS.map(col => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={visibleKeys.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    disabled={col.alwaysOn}
                  />
                  {col.label}
                </label>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                className="w-full h-7 text-xs"
                onClick={() => setVisibleKeys(DEFAULT_VISIBLE)}
              >
                Reset to default
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            {visibleColumns.map(col => (
              <TableHead
                key={col.key}
                className={`${col.width || ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loads.map(load => (
            <TableRow
              key={load.id}
              onClick={() => onLoadClick(load)}
              className="cursor-pointer hover:bg-slate-50"
            >
              {visibleColumns.map(col => (
                <TableCell
                  key={col.key}
                  className={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                >
                  {renderCell(col.key, load)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {loads.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="text-center py-12 text-muted-foreground">
                No loads match your filters
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
