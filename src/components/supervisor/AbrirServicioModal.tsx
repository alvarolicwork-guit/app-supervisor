'use client';

import { useState } from 'react';
import { X, FileText, User } from 'lucide-react';
import { abrirServicioSupervisor, type SupervisorInfo } from '@/services/servicioSupervisorService';
import { useAuth } from '@/context/AuthContext';
import { InlineAlert, type InlineAlertData } from '@/components/ui/InlineAlert';

interface AbrirServicioModalProps {
    onClose: () => void;
    onServicioCreado: (servicioId: string) => void;
}

export function AbrirServicioModal({ onClose, onServicioCreado }: AbrirServicioModalProps) {
    const { user, userProfile } = useAuth();
    const [nroMemorandum, setNroMemorandum] = useState('');
    const [fechaHora, setFechaHora] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });
    const [gradoRelevo, setGradoRelevo] = useState('');
    // const [nombreRelevo, setNombreRelevo] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<InlineAlertData | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !userProfile) {
            setNotice({ type: 'error', message: 'Error de sesión. Cierra sesión y vuelve a ingresar.' });
            return;
        }

        if (!nroMemorandum.trim() || !gradoRelevo.trim()) {
            setNotice({ type: 'error', message: 'Por favor completa todos los campos.' });
            return;
        }

        setLoading(true);

        try {
            const supervisorRelevo: SupervisorInfo = {
                grado: 'Relevo', // Generic label since we combined the input
                nombreCompleto: gradoRelevo.trim(), // We use the single input for the full string
            };

            const supervisorActual: SupervisorInfo = {
                grado: userProfile.grado || 'S/G',
                nombreCompleto: userProfile.nombreCompleto || 'Usuario',
            };

            const servicioId = await abrirServicioSupervisor(
                user.uid,
                supervisorActual,
                {
                    nroMemorandum: nroMemorandum.trim(),
                    fechaHora: new Date(fechaHora),
                    supervisorRelevo,
                }
            );

            onServicioCreado(servicioId);
        } catch (error) {
            console.error(error);
            setNotice({
                type: 'error',
                message: `Error al abrir servicio: ${error instanceof Error ? error.message : 'error desconocido'}`,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 overflow-hidden max-h-[96vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 p-4 sm:p-6 flex justify-between items-center text-white">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 pr-2">
                        <FileText className="w-6 h-6" />
                        Abrir Nuevo Turno
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto">
                    {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            📄 Nº Memorándum de Designación
                        </label>
                        <input
                            type="text"
                            value={nroMemorandum}
                            onChange={(e) => setNroMemorandum(e.target.value)}
                            placeholder="Ej: 045/2025"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            📅 Fecha y Hora de Inicio
                        </label>
                        <input
                            type="datetime-local"
                            value={fechaHora}
                            onChange={(e) => setFechaHora(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100">
                        <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <User className="w-4 h-4" />
                            Datos del Relevo (Saliente)
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">
                                    Grado y Nombre del Relevo
                                </label>
                                <input
                                    type="text"
                                    value={gradoRelevo}
                                    onChange={(e) => setGradoRelevo(e.target.value)}
                                    placeholder="Ej: Tcnl. Juan Pérez"
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                    disabled={loading}
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-emerald-600/30 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? 'Procesando...' : 'Iniciar Turno'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
