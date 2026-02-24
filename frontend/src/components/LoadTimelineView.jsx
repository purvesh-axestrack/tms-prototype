import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const statusColors = {
  OPEN: { bg: 'bg-blue-400', text: 'text-blue-700', light: 'bg-blue-50' },
  SCHEDULED: { bg: 'bg-indigo-400', text: 'text-indigo-700', light: 'bg-indigo-50' },
  IN_PICKUP_YARD: { bg: 'bg-purple-400', text: 'text-purple-700', light: 'bg-purple-50' },
  IN_TRANSIT: { bg: 'bg-sky-400', text: 'text-sky-700', light: 'bg-sky-50' },
  COMPLETED: { bg: 'bg-green-400', text: 'text-green-700', light: 'bg-green-50' },
  TONU: { bg: 'bg-red-400', text: 'text-red-700', light: 'bg-red-50' },
  CANCELLED: { bg: 'bg-slate-400', text: 'text-slate-700', light: 'bg-slate-50' },
  INVOICED: { bg: 'bg-emerald-400', text: 'text-emerald-700', light: 'bg-emerald-50' },
  BROKERED: { bg: 'bg-amber-400', text: 'text-amber-700', light: 'bg-amber-50' },
};

function getDayRange(loads) {
  const now = new Date();
  let min = new Date(now);
  let max = new Date(now);
  min.setDate(min.getDate() - 3);
  max.setDate(max.getDate() + 14);

  loads.forEach(load => {
    if (load.pickup_date) {
      const d = new Date(load.pickup_date);
      if (d < min) min = new Date(d);
    }
    if (load.delivery_date) {
      const d = new Date(load.delivery_date);
      if (d > max) max = new Date(d);
    }
  });

  min.setDate(min.getDate() - 1);
  max.setDate(max.getDate() + 1);

  const days = [];
  const cur = new Date(min);
  while (cur <= max) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return { days, min, max };
}

function formatDay(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekday(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function isToday(d) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function LoadTimelineView({ loads, onLoadClick }) {
  const sortedLoads = useMemo(() => {
    return [...loads]
      .filter(l => l.pickup_date || l.delivery_date)
      .sort((a, b) => new Date(a.pickup_date || a.created_at) - new Date(b.pickup_date || b.created_at));
  }, [loads]);

  const noDateLoads = useMemo(() => loads.filter(l => !l.pickup_date && !l.delivery_date), [loads]);

  const { days, min, max } = useMemo(() => getDayRange(sortedLoads), [sortedLoads]);

  const totalDays = days.length;
  const dayWidth = 100 / totalDays;

  const getPosition = (dateStr) => {
    const d = new Date(dateStr);
    const diff = (d - min) / (max - min);
    return Math.max(0, Math.min(100, diff * 100));
  };

  return (
    <Card className="p-4 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Day headers */}
        <div className="flex border-b pb-1 mb-2">
          <div className="w-48 flex-shrink-0 text-xs font-semibold text-muted-foreground pr-3">Load</div>
          <div className="flex-1 relative flex">
            {days.map((day, i) => (
              <div
                key={i}
                className={`text-center ${isToday(day) ? 'bg-amber-50 rounded' : ''}`}
                style={{ width: `${dayWidth}%` }}
              >
                <div className="text-[10px] text-muted-foreground">{formatWeekday(day)}</div>
                <div className={`text-[11px] font-semibold ${isToday(day) ? 'text-amber-600' : 'text-slate-600'}`}>{formatDay(day)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Load rows */}
        <div className="space-y-1">
          {sortedLoads.map(load => {
            const colors = statusColors[load.status] || statusColors.OPEN;
            const pickupPos = load.pickup_date ? getPosition(load.pickup_date) : null;
            const deliveryPos = load.delivery_date ? getPosition(load.delivery_date) : null;

            const barLeft = pickupPos ?? deliveryPos ?? 0;
            const barRight = deliveryPos ?? pickupPos ?? 0;
            const barWidth = Math.max(barRight - barLeft, 1.5);

            return (
              <div
                key={load.id}
                className="flex items-center hover:bg-slate-50 rounded cursor-pointer py-1"
                onClick={() => onLoadClick(load)}
              >
                <div className="w-48 flex-shrink-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">#{load.id}</span>
                    <Badge className={`text-[9px] px-1 py-0 font-bold whitespace-nowrap ${colors.light} ${colors.text}`}>
                      {load.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{load.customer_name || 'No customer'}</div>
                </div>
                <div className="flex-1 relative h-7">
                  {/* Today marker */}
                  {days.some(d => isToday(d)) && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-amber-400 z-10"
                      style={{ left: `${getPosition(new Date().toISOString())}%` }}
                    />
                  )}
                  {/* Bar */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute top-1 bottom-1 rounded-md ${colors.bg} opacity-80 hover:opacity-100 transition-opacity`}
                        style={{ left: `${barLeft}%`, width: `${barWidth}%`, minWidth: '12px' }}
                      >
                        <div className="px-1.5 text-[10px] font-semibold text-white truncate leading-5">
                          {load.driver_name || ''}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <div className="font-bold">Load #{load.id}</div>
                        <div>{load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}</div>
                        {load.driver_name && <div>Driver: {load.driver_name}</div>}
                        <div>${Number(load.rate_amount || 0).toLocaleString()} &middot; {load.loaded_miles} mi</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>

        {/* No-date loads */}
        {noDateLoads.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <div className="text-xs font-semibold text-muted-foreground mb-2">No dates assigned ({noDateLoads.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {noDateLoads.map(load => {
                const colors = statusColors[load.status] || statusColors.OPEN;
                return (
                  <button
                    key={load.id}
                    onClick={() => onLoadClick(load)}
                    className={`text-[11px] font-semibold px-2 py-1 rounded ${colors.light} ${colors.text} hover:opacity-80`}
                  >
                    #{load.id} {load.customer_name || ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
