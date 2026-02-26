import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LOAD_STATUS_COLORS as statusColors } from '@/lib/constants';

export default function LoadListView({ loads, onLoadClick }) {
  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-16">#</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Origin</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead className="text-right">Miles</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead>Equipment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loads.map(load => (
            <TableRow
              key={load.id}
              onClick={() => onLoadClick(load)}
              className="cursor-pointer hover:bg-slate-50"
            >
              <TableCell className="font-bold">{load.id}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{load.reference_number || '\u2014'}</TableCell>
              <TableCell>
                <Badge className={`text-[10px] font-bold whitespace-nowrap ${statusColors[load.status]}`}>
                  {load.status.replaceAll('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-sm">{load.customer_name || '\u2014'}</TableCell>
              <TableCell className="text-sm">
                {load.pickup_city}, {load.pickup_state}
              </TableCell>
              <TableCell className="text-sm">
                {load.delivery_city}, {load.delivery_state}
              </TableCell>
              <TableCell>
                {load.driver_name ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] font-bold bg-amber-100 text-amber-700">
                        {load.driver_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{load.driver_name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs italic">Unassigned</span>
                )}
              </TableCell>
              <TableCell className="text-right text-sm">{load.loaded_miles}</TableCell>
              <TableCell className="text-right font-semibold text-sm text-green-700">
                ${Number(load.rate_amount || 0).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{load.equipment_type || '\u2014'}</TableCell>
            </TableRow>
          ))}
          {loads.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                No loads match your filters
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
