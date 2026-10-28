import React, { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import type { DomainGroup } from '../types/provider.ts';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (permanent: boolean) => Promise<void>;
  selectedDomains: Array<{ domain: string; group: DomainGroup }>;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedDomains,
}) => {
  const [permanent, setPermanent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalEmails = selectedDomains.reduce((acc, curr) => acc + curr.group.count, 0);
  const hasSafeSenders = selectedDomains.some((d) => d.group.isSafeSender || d.group.category === 'finance' || d.group.category === 'receipts');

  const handleProceed = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(permanent);
      onClose();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'An error occurred while deleting emails.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Confirm Bulk Email Purge
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              User confirmation required before executing delete operations
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Affected summary banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Target Domains:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{selectedDomains.length} domain{selectedDomains.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Total Emails to Delete:</span>
              <span className="text-base font-bold text-rose-600 dark:text-rose-400">{totalEmails.toLocaleString()} emails</span>
            </div>
          </div>

          {/* Caution if financial or safe senders are included */}
          {hasSafeSenders && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="font-semibold">Sensitive / Financial Senders Selected!</strong>
                <p className="mt-0.5">
                  Your selection contains domains categorized as Financial, Receipts, or Important. Ensure you do not need receipts or transaction records before proceeding.
                </p>
              </div>
            </div>
          )}

          {/* Domain list preview */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Affected Domains ({selectedDomains.length})
            </span>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {selectedDomains.map((item) => (
                <div key={item.domain} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="font-medium text-slate-800 dark:text-slate-200 font-mono truncate max-w-[280px]">
                    {item.domain}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                    {item.group.count} emails
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trashing Options */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Purge Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPermanent(false)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  !permanent
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">Move to Trash</span>
                  {!permanent && <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Safely recoverable for 30 days. Recommended.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPermanent(true)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  permanent
                    ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/40 dark:border-rose-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Permanent Purge</span>
                  {permanent && <CheckCircle className="w-3.5 h-3.5 text-rose-600" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Cannot be undone. Skips trash folder.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleProceed}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm transition flex items-center gap-2 ${
              permanent
                ? 'bg-rose-600 hover:bg-rose-500 disabled:opacity-50'
                : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Purging {totalEmails} emails...</span>
              </>
            ) : (
              <>
                <span>Confirm {permanent ? 'Permanent Purge' : 'Move to Trash'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
