import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const statusColors = {
  OPEN: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  IN_PICKUP_YARD: 'bg-purple-100 text-purple-700',
  IN_TRANSIT: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-green-100 text-green-700',
  TONU: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  INVOICED: 'bg-emerald-100 text-emerald-700',
  BROKERED: 'bg-amber-100 text-amber-700',
};

function ConfidenceDot({ score }) {
  if (score === null || score === undefined) return null;
  const numScore = parseFloat(score);
  let color;
  if (numScore >= 0.8) color = 'bg-green-500';
  else if (numScore >= 0.5) color = 'bg-yellow-500';
  else color = 'bg-red-500';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`w-2 h-2 rounded-full ${color} inline-block`} />
      </TooltipTrigger>
      <TooltipContent>Confidence: {(numScore * 100).toFixed(0)}%</TooltipContent>
    </Tooltip>
  );
}

export default function LoadCard({ load, onClick }) {
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer hover:shadow-md transition-shadow py-3 ${
        load.status === 'OPEN' ? 'ring-1 ring-blue-300 ring-inset' : ''
      }`}
    >
      <CardContent className="p-3 space-y-0">
        <div className="flex items-start justify-between gap-1.5 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm">#{load.id}</span>
              <ConfidenceDot score={load.confidence_score} />
            </div>
            {load.reference_number && (
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">{load.reference_number}</div>
            )}
          </div>
          <Badge className={`text-[9px] px-1.5 py-0.5 font-bold uppercase leading-tight whitespace-nowrap flex-shrink-0 ${statusColors[load.status]}`}>
            {load.status.replaceAll('_', ' ')}
          </Badge>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="font-semibold truncate">{load.customer_name || 'Unknown Customer'}</div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            </div>
            <span className="truncate">{load.pickup_city}, {load.pickup_state}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className="w-3.5 h-3.5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            </div>
            <span className="truncate">{load.delivery_city}, {load.delivery_state}</span>
          </div>
        </div>

        {load.driver_name && (
          <div className="mt-2.5 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] font-bold bg-amber-100 text-amber-700">
                  {load.driver_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-muted-foreground truncate">{load.driver_name}</span>
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t">
          <span className="text-muted-foreground font-medium">{load.loaded_miles} mi</span>
          <span className="font-bold text-green-700">${Number(load.rate_amount || 0).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
