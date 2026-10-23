'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface AlertaCierreAutomaticoProps {
    fechaInicio: Date | string | null | undefined;
    estado?: string;
    onFinalizar?: () => void;
}

const HORA_MS = 60 * 60 * 1000;
const ALERTA_MS = 25 * HORA_MS;
const CIERRE_MS = 26 * HORA_MS;

function formatearHora(fecha: Date): string {
    return new Intl.DateTimeFormat('es-BO', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(fecha);
}

export function AlertaCierreAutomatico({
    fechaInicio,
    estado,
    onFinalizar,
}: AlertaCierreAutomaticoProps) {
    const [ahora, setAhora] = useState(() => Date.now());

    useEffect(() => {
        const interval = window.setInterval(() => setAhora(Date.now()), 30_000);
        return () => window.clearInterval(interval);
    }, []);

    const inicio = useMemo(() => {
        if (!fechaInicio) return null;
        const fecha = fechaInicio instanceof Date ? fechaInicio : new Date(fechaInicio);
        return Number.isNaN(fecha.getTime()) ? null : fecha;
    }, [fechaInicio]);

    if (!inicio || estado !== 'abierto') return null;

    const alertaEn = inicio.getTime() + ALERTA_MS;
    const cierreEn = inicio.getTime() + CIERRE_MS;

    if (ahora < alertaEn) return null;

    const cerradoPorTiempo = ahora >= cierreEn;
    const minutosRestantes = Math.max(0, Math.ceil((cierreEn - ahora) / 60_000));

    return (
        <div
            role="alert"
            className={`mb-6 flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
                cerradoPorTiempo
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-amber-200 bg-amber-50'
            }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`mt-0.5 rounded-full p-2 ${
                        cerradoPorTiempo
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                    }`}
                >
                    {cerradoPorTiempo ? (
                        <AlertTriangle className="h-5 w-5" />
                    ) : (
                        <Clock className="h-5 w-5" />
                    )}
                </div>
                <div>
                    <p className={`font-bold ${cerradoPorTiempo ? 'text-rose-900' : 'text-amber-900'}`}>
                        {cerradoPorTiempo
                            ? 'Cierre automático en proceso'
                            : 'Aviso de cierre automático'}
                    </p>
                    <p className={`mt-1 text-sm ${cerradoPorTiempo ? 'text-rose-700' : 'text-amber-700'}`}>
                        {cerradoPorTiempo
                            ? 'El servicio cumplió las 26 horas. Se cerrará automáticamente sin necesidad de revisar este aviso.'
                            : `Este servicio se cerrará automáticamente a las ${formatearHora(
                                  new Date(cierreEn)
                              )}. Te quedan ${minutosRestantes} minuto(s) para finalizar el turno.`}
                    </p>
                </div>
            </div>

            <div className="flex shrink-0 gap-2">
                {!cerradoPorTiempo && onFinalizar && (
                    <button type="button" onClick={onFinalizar} className="app-btn-danger">
                        Finalizar turno
                    </button>
                )}
                {cerradoPorTiempo && (
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="app-btn-secondary"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Actualizar estado
                    </button>
                )}
            </div>
        </div>
    );
}
