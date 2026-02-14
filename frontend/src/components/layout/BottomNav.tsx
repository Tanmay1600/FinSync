// ==========================================
// Bottom Navigation
// Mobile navigation bar
// ==========================================

import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  BarChart3,
  Menu,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface NavItem {
  id: 'dashboard' | 'leads' | 'followups' | 'analytics' | 'menu';
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'leads', label: 'Leads', icon: <Users className="w-5 h-5" />, badge: 47 },
  { id: 'followups', label: 'Follow-ups', icon: <CalendarClock className="w-5 h-5" />, badge: 8 },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'menu', label: 'More', icon: <Menu className="w-5 h-5" /> },
];

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const { mode, setSidebarOpen, view, setView } = useApp();

  const handleNavigate = (id: string) => {
    if (id === 'menu') {
      setSidebarOpen(true);
    } else {
      setView(id as any);
    }
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'glass-elevated border-t border-border/50',
        'pb-[env(safe-area-inset-bottom)]',
        'lg:hidden',
        className
      )}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
              isActive={view === item.id}
            onClick={() => handleNavigate(item.id)}
            mode={mode}
          />
        ))}
      </div>
    </nav>
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
        'relative flex flex-col items-center justify-center gap-1 px-4 py-2',
        'min-w-[64px]',
        isActive
          ? mode === 'stall' ? 'text-stall' : 'text-field'
          : 'text-muted'
      )}
      whileTap={{ scale: 0.9 }}
    >
      <div className="relative">
        {item.icon}
        
        {item.badge && item.badge > 0 && (
          <span className={cn(
            'absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1',
            'flex items-center justify-center',
            'text-[10px] font-bold rounded-full',
            mode === 'stall' ? 'bg-stall text-stall-foreground' : 'bg-field text-field-foreground'
          )}>
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>
      
      <span className="text-[10px] font-medium">{item.label}</span>
      
      {isActive && (
        <motion.div
          layoutId="bottom-nav-indicator"
          className={cn(
            'absolute -top-0 left-1/2 -translate-x-1/2',
            'w-8 h-1 rounded-full',
            mode === 'stall' ? 'bg-stall' : 'bg-field'
          )}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        />
      )}
    </motion.button>
  );
}
