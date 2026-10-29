import React, { useState } from 'react';
import {
  Layers,
  Play,
  RotateCw,
  CheckCircle,
  Database,
  Trash2,
  PieChart,
  Loader2,
  Square,
  Sparkles,
  Inbox,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
  Clock
} from 'lucide-react';
import type { ProviderType, MessagePreview } from '../types/provider.ts';

interface ScanProgressHeaderProps {
  provider: ProviderType;
  accountEmail?: string;
  accountName?: string;
  totalScanned: number;
  totalDomainsCount: number;
  totalCleanedCount: number;
  reclaimedStorageMb: number;
  currentCursor: string | null;
  batchNumber: number;
  isScanning: boolean;
  isAutoScanning: boolean;
  onScanNextBatch: () => void;
  onToggleAutoScan: () => void;
  onResetScan: () => void;
  hasMoreBatches: boolean;
  selectedDomainsCount: number;
  selectedEmailsCount: number;
  onTriggerBulkDelete: () => void;
  queryFilter: string;
  onQueryFilterChange: (filter: string) => void;
  recentPreviews: MessagePreview[];
}

export const ScanProgressHeader: React.FC<ScanProgressHeaderProps> = ({
  provider,
  accountEmail,
  accountName,
  totalScanned,
  totalDomainsCount,
  totalCleanedCount,
  reclaimedStorageMb,
  currentCursor,
  batchNumber,
  isScanning,
  isAutoScanning,
  onScanNextBatch,
  onToggleAutoScan,
  onResetScan,
  hasMoreBatches,
  selectedDomainsCount,
  selectedEmailsCount,
  onTriggerBulkDelete,
  queryFilter,
  onQueryFilterChange,
  recentPreviews,
}) => {
  const [showPreviews, setShowPreviews] = useState(false);

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Scanned */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Scanned</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalScanned.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">emails</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>
              {batchNumber > 0 ? `Batch #${batchNumber} (500 increments)` : 'Ready to analyze'}
            </span>
          </div>
        </div>

        {/* Metric 2: Sender Domains */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Identified Domains</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalDomainsCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">sources</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Grouped by sender domain</span>
          </div>
        </div>

        {/* Metric 3: Cleaned */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Purged Emails</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalCleanedCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">cleaned</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Moved to trash or purged</span>
          </div>
        </div>

        {/* Metric 4: Storage Reclaimed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Storage Reclaimed</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {reclaimedStorageMb.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">MB</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>Estimated quota freed</span>
          </div>
        </div>
      </div>

      {/* Control Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white shadow-md flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Incremental 500-Email Batch Analyzer
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${provider === 'demo' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                <span>
                  {provider === 'google'
                    ? `Gmail: ${accountEmail || 'Connected'}`
                    : provider === 'microsoft'
                    ? `Outlook: ${accountEmail || 'Connected'}`
                    : provider === 'yahoo'
                    ? `Yahoo: ${accountEmail || 'Connected'}`
                    : 'Sample Demo Inbox (Sandbox)'}
                </span>
              </span>
              {hasMoreBatches && totalScanned > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-400/30">
                  More Batches Available
                </span>
              )}
              {!hasMoreBatches && totalScanned > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[11px]">
                  Inbox End Reached
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold">
              {totalScanned === 0
                ? (batchNumber > 0 ? 'No emails found in this scope' : 'Ready to analyze your inbox')
                : `Scanned ${totalScanned.toLocaleString()} emails (${totalDomainsCount} sender domains aggregated)`}
            </h2>
            <p className="text-xs text-slate-300">
              {totalScanned === 0 && batchNumber > 0
                ? 'Your selected inbox folder or search tab has 0 messages.'
                : hasMoreBatches
                ? 'Click "Scan Next 500 Emails" or enable Auto-Scan to fetch additional messages.'
                : 'All available inbox messages in this folder scope have been analyzed.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0 w-full md:w-auto">
            {/* Bulk Delete CTA if domains are selected */}
            {selectedDomainsCount > 0 && (
              <button
                type="button"
                onClick={onTriggerBulkDelete}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-2 animate-pulse cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Purge Selected ({selectedEmailsCount.toLocaleString()} emails)</span>
              </button>
            )}

            {/* Scan Next Batch */}
            <button
              type="button"
              disabled={isScanning || !hasMoreBatches}
              onClick={onScanNextBatch}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isScanning && !isAutoScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Scanning 500 emails...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-indigo-600" />
                  <span>{totalScanned === 0 ? 'Scan First 500 Emails' : 'Scan Next 500 Emails'}</span>
                </>
              )}
            </button>

            {/* Auto Scan Toggle */}
            <button
              type="button"
              disabled={isScanning && !isAutoScanning}
              onClick={onToggleAutoScan}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-xs transition border flex items-center justify-center gap-2 cursor-pointer ${
                isAutoScanning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                  : 'bg-indigo-600/60 hover:bg-indigo-600 text-white border-indigo-500/50'
              }`}
            >
              {isAutoScanning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Auto-Scan</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-Scan All</span>
                </>
              )}
            </button>

            {/* Reset / Rescan */}
            {totalScanned > 0 && (
              <button
                type="button"
                disabled={isScanning}
                onClick={onResetScan}
                title="Reset analysis"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Gmail Folder / Scope Selector & Live Preview Toggle */}
        <div className="pt-3 border-t border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              Scan Scope:
            </span>
            <select
              value={queryFilter}
              onChange={(e) => onQueryFilterChange(e.target.value)}
              disabled={isScanning}
              aria-label="Gmail Scan Scope"
              className="bg-slate-800/90 hover:bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer text-xs"
            >
              <option value="in:inbox">All Inbox Tabs (Primary + Promo + Social + Updates)</option>
              <option value="in:inbox category:primary">Primary Inbox Only (Personal & Direct)</option>
              <option value="in:inbox category:promotions">Promotions Tab Only (Deals & Marketing)</option>
              <option value="in:inbox category:social">Social Tab Only (LinkedIn, Twitter, etc.)</option>
              <option value="in:inbox category:updates">Updates Tab Only (Receipts & Notifications)</option>
              <option value="-in:chats -in:trash -in:spam">All Mail (Including Archived)</option>
            </select>
          </div>

          {recentPreviews && recentPreviews.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPreviews(!showPreviews)}
              className="text-indigo-300 hover:text-white flex items-center gap-1.5 font-medium transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreviews ? 'Hide Scanned Samples' : `View ${recentPreviews.length} Scanned Email Samples`}</span>
              {showPreviews ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Live Scanned Message Previews Card */}
        {showPreviews && recentPreviews && recentPreviews.length > 0 && (
          <div className="mt-2 p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Actual Raw Messages Found in Last Batch ({recentPreviews.length}):
              </span>
              <span className="text-[11px] text-slate-400">Sorted newest first</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {recentPreviews.map((preview) => (
                <div
                  key={preview.id}
                  className="p-2 rounded-lg bg-slate-800/60 border border-slate-750 text-xs flex flex-col gap-0.5 hover:bg-slate-800 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white truncate max-w-[320px]">
                      {preview.sender}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(preview.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300 truncate font-medium text-[11px]">
                    {preview.subject}
                  </p>
                  {preview.snippet && (
                    <p className="text-slate-400 text-[10px] truncate">
                      {preview.snippet}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
