'use client';

import { useState } from 'react';
import { Plus, UserMinus, UserX, ShieldAlert, Clock, X } from 'lucide-react';
import { normalizarNombre } from '@/utils/text';

export interface NovedadesPersonal {
    faltantes: string[];
    abandono: string[];
    arrestados: string[];
    permisos: string[];
}

type TipoNovedad = keyof NovedadesPersonal;

const TIPOS: Array<{
    key: TipoNovedad;
    label: string;
    singular: string;
    icon: typeof UserMinus;
    dot: string;
}> = [
    { key: 'faltantes', label: 'Faltantes', singular: 'faltante', icon: UserMinus, dot: 'bg-rose-500' },
    { key: 'abandono', label: 'Abandonos', singular: 'abandono', icon: UserX, dot: 'bg-amber-500' },
    { key: 'arrestados', label: 'Arrestados', singular: 'arrestado', icon: ShieldAlert, dot: 'bg-slate-700' },
    { key: 'permisos', label: 'Permisos', singular: 'permiso', icon: Clock, dot: 'bg-sky-500' },
];

interface PersonasNovedadProps {
    value: NovedadesPersonal;
    onChange: (value: NovedadesPersonal) => void;
    disabled?: boolean;
}

export function PersonasNovedad({ value, onChange, disabled = false }: PersonasNovedadProps) {
    const [tipo, setTipo] = useState<TipoNovedad>('faltantes');
    const [texto, setTexto] = useState('');

    const tipoActual = TIPOS.find((item) => item.key === tipo) ?? TIPOS[0];
    const total = Object.values(value).reduce((acc, lista) => acc + lista.length, 0);

    const agregar = () => {
        const nombres = texto
            .split(/[,;\n]/)
            .map((nombre) => normalizarNombre(nombre))
            .filter(Boolean);

        if (nombres.length === 0) return;

        const existentes = new Set(value[tipo].map((nombre) => nombre.toLowerCase()));
        const nuevos = nombres.filter((nombre) => !existentes.has(nombre.toLowerCase()));

        if (nuevos.length > 0) {
            onChange({ ...value, [tipo]: [...value[tipo], ...nuevos] });
        }
        setTexto('');
    };

    const eliminar = (key: TipoNovedad, indice: number) => {
        onChange({ ...value, [key]: value[key].filter((_, i) => i !== indice) });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TIPOS.map((item) => {
                    const Icon = item.icon;
                    const activo = tipo === item.key;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => setTipo(item.key)}
                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${
                                activo
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </span>
                            <span
                                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${
                                    activo ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {value[item.key].length}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex-1">
                    <label className="app-label">Agregar {tipoActual.singular}</label>
                    <input
                        value={texto}
                        disabled={disabled}
                        onChange={(event) => setTexto(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                agregar();
                            }
                        }}
                        placeholder="Grado y nombre. Puedes pegar varios separados por coma."
                        className="app-input mt-1.5"
                    />
                </div>
                <button
                    type="button"
                    onClick={agregar}
                    disabled={disabled || !texto.trim()}
                    className="app-btn-primary mt-0 self-end sm:mt-5"
                >
                    <Plus className="h-4 w-4" />
                    Agregar
                </button>
            </div>

            {total === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-500">
                    Sin novedades de personal registradas.
                </p>
            ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                    {TIPOS.map((item) => {
                        if (value[item.key].length === 0) return null;
                        return (
                            <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                    <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                                    {item.label} ({value[item.key].length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {value[item.key].map((nombre, indice) => (
                                        <span
                                            key={`${item.key}-${nombre}-${indice}`}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                                        >
                                            {nombre}
                                            {!disabled && (
                                                <button
                                                    type="button"
                                                    onClick={() => eliminar(item.key, indice)}
                                                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                                                    aria-label={`Quitar ${nombre}`}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
