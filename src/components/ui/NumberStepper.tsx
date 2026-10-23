'use client';

import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    hint?: string;
    disabled?: boolean;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function NumberStepper({
    label,
    value,
    onChange,
    min = 0,
    max = 9999,
    hint,
    disabled = false,
}: NumberStepperProps) {
    const update = (next: number) => {
        if (disabled) return;
        onChange(clamp(next, min, max));
    };

    return (
        <div className="min-w-0">
            <label className="app-label">{label}</label>
            <div className="mt-1.5 flex items-stretch overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                <button
                    type="button"
                    onClick={() => update(value - 1)}
                    disabled={disabled || value <= min}
                    className="flex w-11 shrink-0 items-center justify-center bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Disminuir ${label}`}
                >
                    <Minus className="h-4 w-4" />
                </button>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={value}
                    disabled={disabled}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => {
                        const digits = event.target.value.replace(/[^0-9]/g, '');
                        update(digits ? Number(digits) : min);
                    }}
                    onBlur={(event) => update(Number(event.target.value) || min)}
                    className="min-w-0 flex-1 border-x border-slate-200 bg-white px-2 py-2.5 text-center text-lg font-bold text-slate-900 outline-none disabled:bg-slate-50"
                    aria-label={label}
                />
                <button
                    type="button"
                    onClick={() => update(value + 1)}
                    disabled={disabled || value >= max}
                    className="flex w-11 shrink-0 items-center justify-center bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Aumentar ${label}`}
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
            {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
        </div>
    );
}
