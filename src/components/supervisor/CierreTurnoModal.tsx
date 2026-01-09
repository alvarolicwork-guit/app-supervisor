'use client';

import { useState } from 'react';
import { X, Save, LogOut } from 'lucide-react';

interface CierreTurnoModalProps {
    onClose: () => void;
    onContinuar: (data: {
        entregaServicio: string;
        casosRutinarios: number;
        casosRelevantes: number;
    }) => void;
}

export function CierreTurnoModal({ onClose, onContinuar }: CierreTurnoModalProps) {
    const [entregaServicio, setEntregaServicio] = useState('');
    const [casosRutinarios, setCasosRutinarios] = useState('');
    const [casosRelevantes, setCasosRelevantes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onContinuar({
            entregaServicio,
            casosRutinarios: parseInt(casosRutinarios) || 0,
            casosRelevantes: parseInt(casosRelevantes) || 0,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="bg-gradient-to-r from-blue-900 to-slate-800 p-6 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <LogOut className="w-5 h-5" />
                        Finalizar Turno
                    </h2>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
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

                        <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="pt-2">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                            <p className="text-xs text-blue-800">
                                Al finalizar, se generará un reporte completo y el servicio quedará en modo "Solo Lectura".
                            </p>
                        </div>
                        <div className="flex gap-3">
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
