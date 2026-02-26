import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { LOAD_STATUS_RGB as STATUS_COLORS } from '@/lib/constants';

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export default function LoadTimelineView({ loads, onLoadClick }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [mode, setMode] = useState('week'); // 'week' or 'twoweek'

  const today = new Date();
  const dayCount = mode === 'week' ? 7 : 14;

  const days = useMemo(() => {
    return Array.from({ length: dayCount }, (_, i) => addDays(weekStart, i));
  }, [weekStart, dayCount]);

  const prevPeriod = () => setWeekStart(addDays(weekStart, -dayCount));
  const nextPeriod = () => setWeekStart(addDays(weekStart, dayCount));
  const goToday = () => setWeekStart(startOfWeek(new Date()));

  // Bucket loads into days they span
  const loadsByDay = useMemo(() => {
    const map = {};
    days.forEach(d => { map[dateKey(d)] = []; });

    loads.forEach(load => {
      const pickup = parseDate(load.pickup_date);
      const delivery = parseDate(load.delivery_date);
      if (!pickup && !delivery) return;

      const start = pickup || delivery;
      const end = delivery || pickup;

      days.forEach(day => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const loadStart = new Date(start);
        loadStart.setHours(0, 0, 0, 0);
        const loadEnd = new Date(end);
        loadEnd.setHours(23, 59, 59, 999);

        if (loadStart <= dayEnd && loadEnd >= dayStart) {
          const dk = dateKey(day);
          if (map[dk]) map[dk].push(load);
        }
      });
    });

    return map;
  }, [loads, days]);

  // Multi-day events: compute spans for rendering
  const multiDayLoads = useMemo(() => {
    const result = [];
    const seen = new Set();

    loads.forEach(load => {
      if (seen.has(load.id)) return;
      const pickup = parseDate(load.pickup_date);
      const delivery = parseDate(load.delivery_date);
      if (!pickup && !delivery) return;

      const start = pickup || delivery;
      const end = delivery || pickup;

      const startIdx = days.findIndex(d => isSameDay(d, start) || d > start);
      const endIdx = days.findIndex(d => isSameDay(d, end) || d > end);

      if (startIdx === -1 && endIdx === -1) return;

      const actualStart = Math.max(startIdx === -1 ? 0 : startIdx, 0);
      const actualEnd = Math.min(endIdx === -1 ? days.length - 1 : endIdx, days.length - 1);
      const span = actualEnd - actualStart + 1;

      if (span >= 1) {
        seen.add(load.id);
        result.push({ load, startIdx: actualStart, span });
      }
    });

    return result;
  }, [loads, days]);

  // Assign rows to multi-day loads to avoid overlaps
  const rows = useMemo(() => {
    const sorted = [...multiDayLoads].sort((a, b) => a.startIdx - b.startIdx || b.span - a.span);
    const rowEnds = []; // tracks where each row's last event ends

    return sorted.map(item => {
      let row = 0;
      while (row < rowEnds.length) {
        if (rowEnds[row] <= item.startIdx) break;
        row++;
      }
      rowEnds[row] = item.startIdx + item.span;
      return { ...item, row };
    });
  }, [multiDayLoads]);

  const maxRow = rows.length > 0 ? Math.max(...rows.map(r => r.row)) + 1 : 0;

  // Single-day loads that don't appear in multi-day
  const singleDayLoads = useMemo(() => {
    const multiDayIds = new Set(rows.map(r => r.load.id));
    const map = {};
    days.forEach(d => { map[dateKey(d)] = []; });

    loads.forEach(load => {
      if (multiDayIds.has(load.id)) return;
      const pickup = parseDate(load.pickup_date);
      const delivery = parseDate(load.delivery_date);
      if (!pickup && !delivery) return;

      const target = pickup || delivery;
      days.forEach(day => {
        if (isSameDay(day, target)) {
          map[dateKey(day)].push(load);
        }
      });
    });

    return map;
  }, [loads, days, rows]);

  const noDateLoads = useMemo(() => loads.filter(l => !l.pickup_date && !l.delivery_date), [loads]);

  const periodLabel = mode === 'week'
    ? `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2013 ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2013 ${days[13].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <Card className="overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday} className="text-xs">
            Today
          </Button>
          <div className="flex">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevPeriod}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextPeriod}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h3 className="text-sm font-semibold text-slate-700">{periodLabel}</h3>
        </div>
        <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v)} variant="outline" size="sm">
          <ToggleGroupItem value="week" className="text-xs px-3 h-8">Week</ToggleGroupItem>
          <ToggleGroupItem value="twoweek" className="text-xs px-3 h-8">2 Weeks</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Day headers */}
      <div className="grid border-b" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}>
        {days.map((day, i) => {
          const isT = isSameDay(day, today);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <div
              key={i}
              className={`text-center py-2 border-r last:border-r-0 ${
                isT ? 'theme-brand-today' : isWeekend ? 'bg-slate-50' : ''
              }`}
            >
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-sm font-semibold mt-0.5 ${
                isT
                  ? 'w-7 h-7 rounded-full theme-brand-dot text-white inline-flex items-center justify-center'
                  : 'text-slate-700'
              }`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-day event rows */}
      {maxRow > 0 && (
        <div className="relative border-b" style={{ height: `${maxRow * 28 + 8}px` }}>
          {/* Grid lines */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}>
            {days.map((day, i) => {
              const isT = isSameDay(day, today);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div key={i} className={`border-r last:border-r-0 ${isT ? 'theme-brand-today opacity-50' : isWeekend ? 'bg-slate-50/50' : ''}`} />
              );
            })}
          </div>
          {/* Event bars */}
          {rows.map(({ load, startIdx, span, row }) => {
            const colors = STATUS_COLORS[load.status] || STATUS_COLORS.OPEN;
            const left = `${(startIdx / dayCount) * 100}%`;
            const width = `${(span / dayCount) * 100}%`;
            return (
              <Tooltip key={load.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onLoadClick(load)}
                    className="absolute rounded-md px-2 text-left hover:brightness-110 transition-all cursor-pointer overflow-hidden"
                    style={{
                      left,
                      width,
                      top: `${row * 28 + 4}px`,
                      height: '24px',
                      backgroundColor: colors.bg,
                      borderLeft: `3px solid ${colors.border}`,
                    }}
                  >
                    <span className="text-[11px] font-semibold text-white truncate block leading-6">
                      #{load.id} {load.customer_name || ''} {load.driver_name ? `\u2022 ${load.driver_name}` : ''}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-xs space-y-1">
                    <div className="font-bold">Load #{load.id} &middot; {load.status.replaceAll('_', ' ')}</div>
                    <div>{load.pickup_city}, {load.pickup_state} &rarr; {load.delivery_city}, {load.delivery_state}</div>
                    {load.driver_name && <div>Driver: {load.driver_name}</div>}
                    <div>${Number(load.rate_amount || 0).toLocaleString()} &middot; {load.loaded_miles} mi</div>
                    {load.pickup_date && <div>Pickup: {new Date(load.pickup_date).toLocaleDateString()}</div>}
                    {load.delivery_date && <div>Delivery: {new Date(load.delivery_date).toLocaleDateString()}</div>}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}

      {/* Day cells with single-day loads */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}>
        {days.map((day, i) => {
          const dk = dateKey(day);
          const dayLoads = singleDayLoads[dk] || [];
          const isT = isSameDay(day, today);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={i}
              className={`border-r last:border-r-0 min-h-[120px] p-1 ${
                isT ? 'theme-brand-today opacity-30' : isWeekend ? 'bg-slate-50/50' : ''
              }`}
            >
              {dayLoads.map(load => {
                const colors = STATUS_COLORS[load.status] || STATUS_COLORS.OPEN;
                return (
                  <Tooltip key={load.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onLoadClick(load)}
                        className="w-full text-left rounded-md px-1.5 py-1 mb-1 hover:brightness-110 transition-all cursor-pointer"
                        style={{
                          backgroundColor: colors.bg + '20',
                          borderLeft: `3px solid ${colors.bg}`,
                        }}
                      >
                        <div className="text-[11px] font-semibold truncate" style={{ color: colors.border }}>
                          #{load.id}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {load.customer_name || ''}
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <div className="text-xs space-y-1">
                        <div className="font-bold">Load #{load.id} &middot; {load.status.replaceAll('_', ' ')}</div>
                        <div>{load.pickup_city}, {load.pickup_state} &rarr; {load.delivery_city}, {load.delivery_state}</div>
                        {load.driver_name && <div>Driver: {load.driver_name}</div>}
                        <div>${Number(load.rate_amount || 0).toLocaleString()}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* No-date loads */}
      {noDateLoads.length > 0 && (
        <div className="px-4 py-3 border-t bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">No dates assigned ({noDateLoads.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {noDateLoads.map(load => {
              const colors = STATUS_COLORS[load.status] || STATUS_COLORS.OPEN;
              return (
                <button
                  key={load.id}
                  onClick={() => onLoadClick(load)}
                  className="text-[11px] font-semibold px-2 py-1 rounded hover:brightness-110 transition-all"
                  style={{
                    backgroundColor: colors.bg + '20',
                    color: colors.border,
                    borderLeft: `2px solid ${colors.bg}`,
                  }}
                >
                  #{load.id} {load.customer_name || ''}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
