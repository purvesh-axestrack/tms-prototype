import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStats } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, User, Mail, FileEdit, Package, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';

const ICONS = {
  truck: Truck,
  driver: User,
  email: Mail,
  draft: FileEdit,
  delivery: Package,
  chart: BarChart3,
};

const ICON_COLORS = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  amber: 'theme-brand-today theme-brand-icon',
  purple: 'bg-purple-50 text-purple-600',
};

const STORAGE_KEY = 'tms:statsbar:collapsed';

export default function StatsBar() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 5000,
  });

  const statCards = [
    { label: 'Active Loads', value: stats?.active_loads || 0, icon: 'truck', color: 'blue' },
    { label: 'Available Drivers', value: stats?.available_drivers || 0, icon: 'driver', color: 'green' },
    { label: 'Pending Imports', value: stats?.pending_imports || 0, icon: 'email', color: 'orange' },
    { label: 'Open Loads', value: stats?.draft_loads || 0, icon: 'draft', color: 'yellow' },
    { label: "Today's Completed", value: stats?.today_deliveries || 0, icon: 'delivery', color: 'amber' },
    { label: 'Total Loads', value: stats?.total_loads || 0, icon: 'chart', color: 'purple' },
  ];

  if (isLoading && !collapsed) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="py-4">
            <CardContent className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-10" />
              </div>
              <Skeleton className="w-10 h-10 rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="flex items-center gap-3 py-1">
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1" onClick={toggle}>
          <ChevronRight className="w-3.5 h-3.5" />
          Stats
        </Button>
        {!isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {statCards.map((stat, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] font-medium gap-1 px-2 py-0.5">
                {stat.label.split(' ').pop()}: <span className="font-bold text-foreground">{stat.value}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-1">
        <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground gap-1" onClick={toggle}>
          <ChevronDown className="w-3.5 h-3.5" />
          Collapse
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => {
          const Icon = ICONS[stat.icon];
          return (
            <Card key={index} className="py-4 hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">{stat.label}</p>
                  <p className="text-2xl font-display font-bold">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${ICON_COLORS[stat.color]} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
