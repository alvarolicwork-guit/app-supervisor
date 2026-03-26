'use client';

import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export type InlineAlertData = {
  type: 'success' | 'error' | 'info';
  message: string;
};

export function InlineAlert({ notice, onClose }: { notice: InlineAlertData; onClose?: () => void }) {
  const styles = {
    success: {
      box: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    error: {
      box: 'bg-red-50 border-red-200 text-red-800',
      icon: <TriangleAlert className="w-4 h-4" />,
    },
    info: {
      box: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: <Info className="w-4 h-4" />,
    },
  }[notice.type];

  return (
    <div className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${styles.box}`}>
      <div className="flex items-center gap-2">
        {styles.icon}
        <span>{notice.message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="rounded p-1 hover:bg-black/5" aria-label="Cerrar mensaje">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
