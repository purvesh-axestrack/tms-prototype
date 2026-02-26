import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutGrid, Mail, FileText, Wallet, Settings, LogOut, Map, Building2, User, Truck, Building, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import DispatchBoard from './components/DispatchBoard';
import StatsBar from './components/StatsBar';
import EmailImportsPage from './pages/EmailImportsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import InvoicesPage from './pages/InvoicesPage';
import SettlementsPage from './pages/SettlementsPage';
import CustomersPage from './pages/CustomersPage';
import DriversPage from './pages/DriversPage';
import FleetPage from './pages/FleetPage';
import CarriersPage from './pages/CarriersPage';
import './index.css';

const queryClient = new QueryClient();

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
}

const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { to: '/', label: 'Dispatch Board', end: true, icon: LayoutGrid },
      { to: '/imports', label: 'Email Imports', icon: Mail },
    ],
  },
  {
    label: 'Directory',
    items: [
      { to: '/customers', label: 'Customers', icon: Building2 },
      { to: '/drivers', label: 'Drivers', icon: User },
      { to: '/fleet', label: 'Fleet', icon: Truck },
      { to: '/carriers', label: 'Carriers', icon: Building },
    ],
  },
  {
    label: 'Accounting',
    items: [
      { to: '/invoices', label: 'Invoices', icon: FileText },
      { to: '/settlements', label: 'Settlements', icon: Wallet },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function AppLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '??';

  const sidebarWidth = collapsed ? 'w-[60px]' : 'w-56';
  const mainMargin = collapsed ? 'ml-[60px]' : 'ml-56';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarWidth} bg-navy-900 text-white flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-200`}>
        {/* Logo + collapse toggle */}
        <div className={`h-16 flex items-center flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          <div className={`flex items-center ${collapsed ? '' : 'gap-2.5'}`}>
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <Map className="w-5 h-5 text-white" />
            </div>
            {!collapsed && <span className="font-display text-lg font-bold tracking-tight">TMS</span>}
          </div>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="text-slate-500 hover:text-white hover:bg-white/10 h-7 w-7"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="flex justify-center py-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="text-slate-500 hover:text-white hover:bg-white/10 h-7 w-7"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Nav sections */}
        <nav className={`flex-1 overflow-y-auto py-2 space-y-5 ${collapsed ? 'px-1.5' : 'px-3'}`}>
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <div className="px-2 mb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  {section.label}
                </div>
              )}
              {collapsed && <Separator className="bg-white/5 mb-2" />}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5'} py-2 rounded-lg text-[13px] font-medium transition-all ${
                          isActive
                            ? 'bg-slate-700/80 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  }
                  return link;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className={`border-t border-white/5 flex-shrink-0 ${collapsed ? 'p-1.5' : 'p-3'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-default">
                    <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>{user?.full_name}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="text-slate-500 hover:text-white hover:bg-white/10 h-8 w-8"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Sign out</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate leading-tight">{user?.full_name}</div>
                <div className="text-[11px] text-slate-500 capitalize">{user?.role?.toLowerCase()}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="text-slate-500 hover:text-white hover:bg-white/10 h-8 w-8 flex-shrink-0"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 ${mainMargin} transition-all duration-200`}>
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <Routes>
            <Route path="/" element={
              <>
                <StatsBar />
                <div className="mt-6">
                  <DispatchBoard />
                </div>
              </>
            } />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/carriers" element={<CarriersPage />} />
            <Route path="/imports" element={<EmailImportsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/settlements" element={<SettlementsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
          <TooltipProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              } />
            </Routes>
            <Toaster richColors position="top-right" />
          </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
