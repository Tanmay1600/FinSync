// ==========================================
// Sidebar Navigation
// Desktop/Tablet navigation
// ==========================================

import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ConnectivityIndicator } from './ConnectivityIndicator';
import { ModeSwitcher } from './ModeSwitcher';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'leads', label: 'Leads', icon: <Users className="w-5 h-5" />, badge: 47 },
  { id: 'followups', label: 'Follow-ups', icon: <CalendarClock className="w-5 h-5" />, badge: 8 },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
];

const bottomNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  { id: 'help', label: 'Help', icon: <HelpCircle className="w-5 h-5" /> },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { mode, isSidebarOpen, setSidebarOpen, view, setView } = useApp();

  return (
    <>
      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isSidebarOpen ? 0 : '-100%',
        }}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50',
          'w-72 bg-surface border-r border-border',
          'flex flex-col',
          'lg:relative lg:translate-x-0',
          className
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                'gradient-primary shadow-md'
              )}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">FinSync</h1>
                <p className="text-xs text-muted">Lead Capture</p>
              </div>
            </div>
            
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-elevated"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          
          {/* Mode Switcher */}
          <ModeSwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={view === item.id}
              onClick={() => setView(item.id as any)}
              mode={mode}
            />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-border space-y-2">
          {/* Connectivity */}
          <ConnectivityIndicator />
          
          {/* Bottom Nav Items */}
          <div className="space-y-1">
            {bottomNavItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={view === item.id}
                onClick={() => setView(item.id as any)}
                mode={mode}
              />
            ))}
          </div>
          
          {/* User */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm">
              VS
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">Vikram Singh</div>
              <div className="text-xs text-muted truncate">Senior RM</div>
            </div>
            <button className="p-2 rounded-lg hover:bg-surface-overlay text-muted hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
  mode: 'stall' | 'field';
}

function NavButton({ item, isActive, onClick, mode }: NavButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
        'text-left transition-colors',
        isActive
          ? mode === 'stall'
            ? 'bg-stall/20 text-stall'
            : 'bg-field/20 text-field'
          : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
      )}
      whileTap={{ scale: 0.98 }}
    >
      {item.icon}
      <span className="font-medium text-sm">{item.label}</span>
      
      {item.badge && (
        <span className={cn(
          'ml-auto px-2 py-0.5 rounded-full text-xs font-semibold',
          isActive
            ? mode === 'stall' ? 'bg-stall text-stall-foreground' : 'bg-field text-field-foreground'
            : 'bg-surface-overlay text-muted-foreground'
        )}>
          {item.badge}
        </span>
      )}
      
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full',
            mode === 'stall' ? 'bg-stall' : 'bg-field'
          )}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        />
      )}
    </motion.button>
  );
}
