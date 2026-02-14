// ==========================================
// App Shell
// Main layout wrapper
// ==========================================

import { motion, AnimatePresence } from 'framer-motion';
import { useApp, useIsMobile } from '@/context/AppContext';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showNav?: boolean;
  fullScreen?: boolean;
  className?: string;
}

export function AppShell({
  children,
  title,
  subtitle,
  showHeader = true,
  showNav = true,
  fullScreen = false,
  className,
}: AppShellProps) {
  const { mode, isKioskMode } = useApp();
  const isMobile = useIsMobile();

  // Kiosk mode - full screen, no navigation
  if (isKioskMode || (mode === 'stall' && fullScreen)) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex">
      {/* Sidebar - Desktop/Tablet */}
      {showNav && (
        <div className="hidden lg:block">
          <Sidebar />
        </div>
      )}

      {/* Mobile Sidebar (Overlay) */}
      {showNav && (
        <div className="lg:hidden">
          <Sidebar />
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        'flex-1 flex flex-col min-h-screen min-h-[100dvh]',
        'lg:ml-0', // Sidebar handles its own spacing
        showNav && !isMobile && 'lg:border-l lg:border-border',
        className
      )}>
        {/* Header */}
        {showHeader && (
          <Header title={title} subtitle={subtitle} />
        )}

        {/* Content */}
        <div className={cn(
          'flex-1 overflow-y-auto',
          showNav && 'pb-20 lg:pb-0' // Space for bottom nav on mobile
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      {showNav && (
        <BottomNav />
      )}
    </div>
  );
}

// Page Container - consistent padding
export function PageContainer({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn('p-4 md:p-6 lg:p-8', className)}>
      {children}
    </div>
  );
}

// Section Container
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
