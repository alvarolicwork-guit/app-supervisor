'use client';

import { useMemo, useState } from 'react';
import { X, Save, LogOut } from 'lucide-react';
import { InlineAlert, type InlineAlertData } from '@/components/ui/InlineAlert';
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
            entregaServicio,
            casosRutinarios: rutinaNum,
            casosRelevantes: relevantesNum,
            ajusteTotales: hayAjuste,
            justificacionAjuste: hayAjuste ? justificacionAjuste.trim() : undefined,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 max-h-[96vh] flex flex-col">
                <div className="bg-gradient-to-r from-blue-900 to-slate-800 p-4 sm:p-6 flex justify-between items-center text-white">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 pr-2">
                        <LogOut className="w-5 h-5" />
                        Finalizar Turno
                    </h2>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
                    {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Entrega de Servicio a
                            </label>
                            <input
                                type="text"
                                required
                                value={entregaServicio}
                                onChange={(e) => setEntregaServicio(e.target.value)}
                                placeholder="Grado y Nombre Completo"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Casos Rutinarios
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={casosRutinarios}
                                    onChange={(e) => setCasosRutinarios(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Casos Relevantes
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={casosRelevantes}
                                    onChange={(e) => setCasosRelevantes(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
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
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Justificación del ajuste
                                </label>
                                <textarea
                                    required
                                    value={justificacionAjuste}
                                    onChange={(e) => setJustificacionAjuste(e.target.value.slice(0, 300))}
                                    placeholder="Explica por qué los totales difieren de los registros..."
                                    rows={2}
                                    maxLength={300}
                                    className="w-full px-4 py-3 rounded-xl border border-amber-300 bg-amber-50 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all outline-none text-sm"
                                />
                                <p className="text-right text-[10px] text-gray-400 mt-1">
                                    {justificacionAjuste.length}/300
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                            <p className="text-xs text-blue-800">
                                Al finalizar, se generará un reporte completo y el servicio quedará en modo
                                &quot;Solo Lectura&quot;.
                            </p>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 flex justify-center items-center gap-2"
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
