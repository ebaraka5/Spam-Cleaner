import React from 'react';
import { X, Globe, Mail, Calendar, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';
import type { DomainGroup } from '../types/provider.ts';

interface DomainDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  group: DomainGroup | null;
  onDeleteDomain: (domain: string, group: DomainGroup) => void;
  onToggleProtect?: (domain: string) => void;
  isProtected?: boolean;
}

export const DomainDetailsModal: React.FC<DomainDetailsModalProps> = ({
  isOpen,
  onClose,
  domain,
  group,
  onDeleteDomain,
  onToggleProtect,
  isProtected,
}) => {
  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-200 dark:border-indigo-800">
              {domain.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white font-mono">
                  {domain}
                </h3>
                {isProtected && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Protected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Category: <span className="capitalize font-medium text-slate-700 dark:text-slate-300">{group.category || 'other'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-center">
              <span className="block text-xs text-slate-500 dark:text-slate-400">Emails</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{group.count.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-center">
              <span className="block text-xs text-slate-500 dark:text-slate-400">Est. Storage</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {group.estimatedSizeKb ? `${Math.round(group.estimatedSizeKb / 1024 * 10) / 10} MB` : 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-center">
              <span className="block text-xs text-slate-500 dark:text-slate-400">Safety Flag</span>
              <span className={`text-xs font-semibold mt-1 inline-block ${group.isSafeSender ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'}`}>
                {group.isSafeSender ? 'Important' : 'Bulk Sender'}
              </span>
            </div>
          </div>

          {/* Sample Senders */}
          {group.sampleSenders && group.sampleSenders.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Detected Sender Addresses
              </label>
              <div className="space-y-1">
                {group.sampleSenders.map((s, idx) => (
                  <div key={idx} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Subjects */}
          {group.sampleSubjects && group.sampleSubjects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Sample Email Subjects ({group.sampleSubjects.length})
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {group.sampleSubjects.map((subject, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs text-slate-800 dark:text-slate-200">
                    "{subject}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Received Date */}
          {group.lastDate && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Last received: {new Date(group.lastDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {onToggleProtect && (
            <button
              type="button"
              onClick={() => onToggleProtect(domain)}
              className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {isProtected ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                  <span>Unprotect Domain</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Whitelist / Shield</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isProtected}
              onClick={() => {
                onDeleteDomain(domain, group);
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge {group.count} Emails</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
