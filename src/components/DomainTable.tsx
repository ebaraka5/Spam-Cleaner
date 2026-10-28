import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  Inbox,
  AlertCircle
} from 'lucide-react';
import type { DomainGroup } from '../types/provider.ts';

interface DomainTableProps {
  domains: Record<string, DomainGroup>;
  totalScanned: number;
  selectedDomainNames: Set<string>;
  onToggleSelect: (domain: string) => void;
  onSelectAll: (domains: string[]) => void;
  onClearSelection: () => void;
  onDeleteSingleDomain: (domain: string, group: DomainGroup) => void;
  onOpenDetails: (domain: string, group: DomainGroup) => void;
  protectedDomains: Set<string>;
  onToggleProtect: (domain: string) => void;
}

export const DomainTable: React.FC<DomainTableProps> = ({
  domains,
  totalScanned,
  selectedDomainNames,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onDeleteSingleDomain,
  onOpenDetails,
  protectedDomains,
  onToggleProtect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'count-desc' | 'count-asc' | 'alpha-asc' | 'alpha-desc'>('count-desc');

  // Convert dictionary to array
  const domainEntries = useMemo(() => {
    return Object.entries(domains).map(([domain, group]) => ({
      domain,
      group,
      isProtected: protectedDomains.has(domain),
    }));
  }, [domains, protectedDomains]);

  // Filtered and Sorted list
  const filteredDomains = useMemo(() => {
    return domainEntries
      .filter((item) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesDomain = item.domain.toLowerCase().includes(q);
          const matchesSender = item.group.sampleSenders?.some((s) => s.toLowerCase().includes(q));
          const matchesSubject = item.group.sampleSubjects?.some((s) => s.toLowerCase().includes(q));
          if (!matchesDomain && !matchesSender && !matchesSubject) return false;
        }

        // Category filter
        if (activeCategory === 'protected') {
          return item.isProtected;
        }
        if (activeCategory !== 'all') {
          return item.group.category === activeCategory;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'count-desc') return b.group.count - a.group.count;
        if (sortBy === 'count-asc') return a.group.count - b.group.count;
        if (sortBy === 'alpha-asc') return a.domain.localeCompare(b.domain);
        if (sortBy === 'alpha-desc') return b.domain.localeCompare(a.domain);
        return 0;
      });
  }, [domainEntries, searchQuery, activeCategory, sortBy]);

  const allVisibleSelected =
    filteredDomains.length > 0 &&
    filteredDomains.every((item) => selectedDomainNames.has(item.domain));

  const handleSelectBulkRecommended = () => {
    const promoAndNews = domainEntries
      .filter(
        (item) =>
          !item.isProtected &&
          (item.group.category === 'promotions' ||
            item.group.category === 'newsletters' ||
            item.group.category === 'social')
      )
      .map((item) => item.domain);
    onSelectAll(promoAndNews);
  };

  const handleToggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      onClearSelection();
    } else {
      const targetDomains = filteredDomains
        .filter((item) => !item.isProtected)
        .map((item) => item.domain);
      onSelectAll(targetDomains);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by sender domain (e.g. substack.com) or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Quick Select Actions & Sorting */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSelectBulkRecommended}
              className="px-3 py-1.5 text-xs font-medium rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Select Marketing & Social</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort domains by"
                className="bg-transparent text-slate-700 dark:text-slate-300 font-medium py-1 pr-2 pl-1 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="count-desc">Most Emails</option>
                <option value="count-asc">Fewest Emails</option>
                <option value="alpha-asc">Domain A → Z</option>
                <option value="alpha-desc">Domain Z → A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'all', label: `All (${domainEntries.length})` },
            { id: 'promotions', label: 'Promotions' },
            { id: 'newsletters', label: 'Newsletters' },
            { id: 'social', label: 'Social' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'receipts', label: 'Receipts / Safe' },
            { id: 'protected', label: `Protected (${protectedDomains.size})` },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action selection bar */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSelectAllVisible}
            className="flex items-center gap-1.5 font-medium hover:text-slate-900 dark:hover:text-white"
          >
            {allVisibleSelected ? (
              <CheckSquare className="w-4 h-4 text-indigo-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Select Visible ({filteredDomains.length})</span>
          </button>
          {selectedDomainNames.size > 0 && (
            <span className="ml-3 px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold">
              {selectedDomainNames.size} domain{selectedDomainNames.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        {selectedDomainNames.size > 0 && (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
          >
            Deselect All
          </button>
        )}
      </div>

      {/* Table Body */}
      {filteredDomains.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">No Domains Found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {searchQuery ? 'Try clearing your search query or filter.' : 'Scan a batch of emails to see sender domains.'}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Clear Search Query
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredDomains.map(({ domain, group, isProtected }) => {
            const isSelected = selectedDomainNames.has(domain);
            const percentage = totalScanned > 0 ? Math.round((group.count / totalScanned) * 100) : 0;

            return (
              <div
                key={domain}
                className={`flex items-center justify-between px-4 py-3 text-xs transition group hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                  isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                }`}
              >
                {/* Left: Checkbox + Domain Info */}
                <div className="flex items-center gap-3 min-w-[240px] flex-1">
                  <button
                    type="button"
                    disabled={isProtected}
                    onClick={() => onToggleSelect(domain)}
                    className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    {domain.slice(0, 1).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white font-mono truncate">
                        {domain}
                      </span>
                      {isProtected && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck className="w-3 h-3" /> Protected
                        </span>
                      )}
                      {group.isSafeSender && !isProtected && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">
                          <ShieldAlert className="w-3 h-3" /> Important
                        </span>
                      )}
                    </div>
                    {group.sampleSenders && group.sampleSenders[0] && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {group.sampleSenders[0]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Middle: Category & Storage */}
                <div className="hidden md:flex items-center gap-6 px-4 shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] capitalize font-medium">
                    {group.category || 'other'}
                  </span>
                  <div className="w-24 text-right">
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {group.estimatedSizeKb ? `~${Math.round(group.estimatedSizeKb / 1024 * 10) / 10} MB` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Count & % of batch */}
                <div className="flex items-center gap-3 shrink-0 px-2 min-w-[130px] justify-end">
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {group.count.toLocaleString()}
                    </span>
                    <span className="text-slate-400 ml-1 text-[11px]">emails</span>
                    <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 ml-auto overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <button
                    type="button"
                    title="View sample emails"
                    onClick={() => onOpenDetails(domain, group)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    title={isProtected ? 'Unprotect domain' : 'Shield domain from deletion'}
                    onClick={() => onToggleProtect(domain)}
                    className={`p-1.5 rounded-lg transition ${
                      isProtected
                        ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isProtected}
                    title={isProtected ? 'Domain is protected' : `Purge all ${group.count} emails from ${domain}`}
                    onClick={() => onDeleteSingleDomain(domain, group)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
