import { useQuery } from '@tanstack/react-query';
import { getStats } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, User, Mail, FileEdit, Package, BarChart3 } from 'lucide-react';

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

export default function StatsBar() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 5000,
  });

  if (isLoading) {
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

  const statCards = [
    { label: 'Active Loads', value: stats?.active_loads || 0, icon: 'truck', color: 'blue' },
    { label: 'Available Drivers', value: stats?.available_drivers || 0, icon: 'driver', color: 'green' },
    { label: 'Pending Imports', value: stats?.pending_imports || 0, icon: 'email', color: 'orange' },
    { label: 'Open Loads', value: stats?.draft_loads || 0, icon: 'draft', color: 'yellow' },
    { label: "Today's Completed", value: stats?.today_deliveries || 0, icon: 'delivery', color: 'amber' },
    { label: 'Total Loads', value: stats?.total_loads || 0, icon: 'chart', color: 'purple' },
  ];

  return (
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
  );
}
