'use client';

import { useState } from 'react';
import { X, FileText, User } from 'lucide-react';
import { abrirServicioSupervisor, type SupervisorInfo } from '@/services/servicioSupervisorService';
import { useAuth } from '@/context/AuthContext';
import { InlineAlert, type InlineAlertData } from '@/components/ui/InlineAlert';
import { normalizarNombre } from '@/utils/text';

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
                nombreCompleto: normalizarNombre(gradoRelevo),
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
                <div className="app-modal-header px-5 py-4">
                    <h2 className="flex items-center gap-2 pr-2 text-base font-bold">
                        <FileText className="h-5 w-5" />
                        Abrir nuevo turno
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto">
                    {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

                    <div>
                        <label className="app-label">
                            Nº Memorándum de designación
                        </label>
                        <input
                            type="text"
                            value={nroMemorandum}
                            onChange={(e) => setNroMemorandum(e.target.value)}
                            placeholder="Ej: 045/2025"
                            className="app-input mt-1.5"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="app-label">
                            Fecha y hora de inicio
                        </label>
                        <input
                            type="datetime-local"
                            value={fechaHora}
                            onChange={(e) => setFechaHora(e.target.value)}
                            className="app-input mt-1.5"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="app-label mb-4 flex items-center gap-2 text-slate-600">
                            <User className="h-4 w-4" />
                            Datos del relevo (saliente)
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="app-label">
                                    Grado y nombre del relevo
                                </label>
                                <input
                                    type="text"
                                    value={gradoRelevo}
                                    onChange={(e) => setGradoRelevo(e.target.value)}
                                    onBlur={() => setGradoRelevo((valor) => normalizarNombre(valor))}
                                    placeholder="Ej: Tcnl. Juan Pérez"
                                    className="app-input mt-1.5"
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
                            className="app-btn-secondary flex-1"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="app-btn-primary flex-1"
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
