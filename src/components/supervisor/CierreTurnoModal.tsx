'use client';

import { useMemo, useState } from 'react';
import { X, Save, LogOut } from 'lucide-react';
import { InlineAlert, type InlineAlertData } from '@/components/ui/InlineAlert';
import { normalizarNombre } from '@/utils/text';
import type { DatosUnidadRegistrada } from './ResumenTurno';

interface CierreTurnoModalProps {
    registros?: DatosUnidadRegistrada[];
    onClose: () => void;
    onContinuar: (data: {
        entregaServicio: string;
        casosRutinarios: number;
        casosRelevantes: number;
        ajusteTotales?: boolean;
        justificacionAjuste?: string;
    }) => void;
}

export function CierreTurnoModal({ registros = [], onClose, onContinuar }: CierreTurnoModalProps) {
    const totalesRegistrados = useMemo(() => {
        return registros.reduce(
            (acc, registro) => {
                acc.rutina += Number(registro.servicio?.rutina || 0);
                acc.relevantes += registro.servicio?.relevantes?.length || 0;
                return acc;
            },
            { rutina: 0, relevantes: 0 }
        );
    }, [registros]);

    const [entregaServicio, setEntregaServicio] = useState('');
    const [casosRutinarios, setCasosRutinarios] = useState(String(totalesRegistrados.rutina));
    const [casosRelevantes, setCasosRelevantes] = useState(String(totalesRegistrados.relevantes));
    const [justificacionAjuste, setJustificacionAjuste] = useState('');
    const [notice, setNotice] = useState<InlineAlertData | null>(null);

    const rutinaNum = parseInt(casosRutinarios) || 0;
    const relevantesNum = parseInt(casosRelevantes) || 0;
    const hayAjuste =
        rutinaNum !== totalesRegistrados.rutina || relevantesNum !== totalesRegistrados.relevantes;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (rutinaNum < 0 || relevantesNum < 0) {
            setNotice({ type: 'error', message: 'Los totales no pueden ser negativos.' });
            return;
        }

        if (hayAjuste && !justificacionAjuste.trim()) {
            setNotice({
                type: 'error',
                message: 'Los totales no coinciden con los registros. Escribe una justificación del ajuste.',
            });
            return;
        }

        onContinuar({
            entregaServicio: normalizarNombre(entregaServicio),
            casosRutinarios: rutinaNum,
            casosRelevantes: relevantesNum,
            ajusteTotales: hayAjuste,
            justificacionAjuste: hayAjuste ? justificacionAjuste.trim() : undefined,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 max-h-[96vh] flex flex-col">
                <div className="app-modal-header px-5 py-4">
                    <h2 className="flex items-center gap-2 pr-2 text-base font-bold">
                        <LogOut className="h-5 w-5" />
                        Finalizar turno
                    </h2>
                    <button onClick={onClose} className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label="Cerrar">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
                    {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

                    <div className="space-y-4">
                        <div>
                            <label className="app-label">
                                Entrega de servicio a
                            </label>
                            <input
                                type="text"
                                required
                                value={entregaServicio}
                                onChange={(e) => setEntregaServicio(e.target.value)}
                                onBlur={() => setEntregaServicio((valor) => normalizarNombre(valor))}
                                placeholder="Grado y nombre completo"
                                className="app-input mt-1.5"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="app-label">
                                    Casos rutinarios
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={casosRutinarios}
                                    onChange={(e) => setCasosRutinarios(e.target.value)}
                                    placeholder="0"
                                    className="app-input mt-1.5"
                                />
                            </div>
                            <div>
                                <label className="app-label">
                                    Casos relevantes
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={casosRelevantes}
                                    onChange={(e) => setCasosRelevantes(e.target.value)}
                                    placeholder="0"
                                    className="app-input mt-1.5"
                                />
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                            <p className="font-semibold">
                                Totales según los {registros.length} registro(s) de unidades:
                            </p>
                            <p className="mt-1">
                                {totalesRegistrados.rutina} caso(s) rutinario(s) y{' '}
                                {totalesRegistrados.relevantes} caso(s) relevante(s).
                            </p>
                            {hayAjuste && (
                                <p className="mt-2 font-semibold text-amber-700">
                                    Los valores ingresados no coinciden con los registros. El ajuste quedará
                                    registrado en el informe.
                                </p>
                            )}
                        </div>

                        {hayAjuste && (
                            <div>
                                <label className="app-label">
                                    Justificación del ajuste
                                </label>
                                <textarea
                                    required
                                    value={justificacionAjuste}
                                    onChange={(e) => setJustificacionAjuste(e.target.value.slice(0, 300))}
                                    placeholder="Explica por qué los totales difieren de los registros..."
                                    rows={2}
                                    maxLength={300}
                                    className="app-input mt-1.5 border-amber-300 bg-amber-50"
                                />
                                <p className="text-right text-[10px] text-gray-400 mt-1">
                                    {justificacionAjuste.length}/300
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs text-slate-600">
                                Al finalizar, se generará un reporte completo y el servicio quedará en modo
                                &quot;solo lectura&quot;.
                            </p>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="app-btn-secondary flex-1"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="app-btn-primary flex-1"
                            >
                                <Save className="w-5 h-5" />
                                Finalizar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
