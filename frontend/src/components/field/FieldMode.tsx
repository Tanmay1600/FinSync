// ==========================================
// Field Mode View
// Feed-based interface for on-floor capture
// ==========================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  Users,
  LayoutGrid,
  List,
} from 'lucide-react';
import { LeadCard, LeadList } from './LeadCard';
import { SuperFAB } from './SuperFAB';
import { PageContainer, Section } from '@/components/layout';
import { Card, Button, Input } from '@/components/ui';
import { 
  mockLeads, 
  getPipelineStats, 
  getSyncStats,
} from '@/data/mockData';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'today' | 'hot' | 'pending';
type ViewType = 'feed' | 'grid';

export function FieldMode() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [view, setView] = useState<ViewType>('feed');
  const [searchQuery, setSearchQuery] = useState('');

  const pipelineStats = useMemo(() => getPipelineStats(mockLeads), []);
  const syncStats = useMemo(() => getSyncStats(mockLeads), []);

  // Filter leads
  const filteredLeads = useMemo(() => {
    let leads = [...mockLeads];

    // Apply filter
    switch (filter) {
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        leads = leads.filter((l) => l.capturedAt >= today);
        break;
      case 'hot':
        leads = leads.filter((l) => l.intent === 'hot');
        break;
      case 'pending':
        leads = leads.filter((l) => l.syncStatus === 'pending');
        break;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.company.toLowerCase().includes(query) ||
          l.email.toLowerCase().includes(query)
      );
    }

    // Sort by recency
    leads.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());

    return leads;
  }, [filter, searchQuery]);

  return (
    <>
      <PageContainer>
        {/* Compact pipeline summary */}
        <div className="mb-6">
          <Card padding="md" className="flex items-center justify-between gap-4 bg-surface-elevated border-border">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted mb-1">Today at a glance</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{pipelineStats.total}</span>
                <span className="text-xs text-muted">total leads</span>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-muted">
              <div className="flex flex-col text-right">
                <span className="font-medium text-foreground">{mockLeads.filter((l) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return l.capturedAt >= today;
                }).length}</span>
                <span>Today</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="font-medium text-foreground">{syncStats.pending}</span>
                <span>Pending sync</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-5 h-5" />}
              size="lg"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="flex bg-surface-elevated rounded-xl p-1">
              <ViewButton
                active={view === 'feed'}
                onClick={() => setView('feed')}
                icon={<List className="w-4 h-4" />}
              />
              <ViewButton
                active={view === 'grid'}
                onClick={() => setView('grid')}
                icon={<LayoutGrid className="w-4 h-4" />}
              />
            </div>
            
            <Button variant="secondary" size="lg">
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
          <FilterTab
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="All"
            count={mockLeads.length}
          />
          <FilterTab
            active={filter === 'today'}
            onClick={() => setFilter('today')}
            label="Today"
            count={mockLeads.filter((l) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return l.capturedAt >= today;
            }).length}
          />
          <FilterTab
            active={filter === 'hot'}
            onClick={() => setFilter('hot')}
            label="Hot 🔥"
            count={mockLeads.filter((l) => l.intent === 'hot').length}
          />
          <FilterTab
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
            label="Pending Sync"
            count={syncStats.pending}
          />
        </div>

        {/* Leads List */}
        <Section
          title="Recent Leads"
          description={`${filteredLeads.length} leads found`}
        >
          <AnimatePresence mode="wait">
            {filteredLeads.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Users className="w-12 h-12 mx-auto mb-4 text-muted" />
                <h3 className="text-lg font-medium mb-2">No leads found</h3>
                <p className="text-muted">Try adjusting your filters or search query</p>
              </motion.div>
            ) : view === 'feed' ? (
              <LeadList leads={filteredLeads} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            )}
          </AnimatePresence>
        </Section>
      </PageContainer>

      {/* Super FAB */}
      <SuperFAB
        onVoiceNote={() => console.log('Voice note')}
        onScanCard={() => console.log('Scan card')}
        onQuickTag={() => console.log('Quick tag')}
        onScanQR={() => console.log('Scan QR')}
        onManualEntry={() => console.log('Manual entry')}
      />
    </>
  );
}

// Filter Tab Component
function FilterTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap',
        'font-medium text-sm transition-all',
        active
          ? 'bg-field text-field-foreground'
          : 'bg-surface-elevated text-muted-foreground hover:text-foreground'
      )}
      whileTap={{ scale: 0.95 }}
    >
      {label}
      <span className={cn(
        'px-2 py-0.5 rounded-full text-xs',
        active ? 'bg-white/20' : 'bg-surface-overlay'
      )}>
        {count}
      </span>
    </motion.button>
  );
}

// View Button Component
function ViewButton({
  active,
  onClick,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-2.5 rounded-lg transition-all',
        active
          ? 'bg-surface-overlay text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
    </button>
  );
}

// Export Dashboard variant
export { FieldMode as Dashboard };
