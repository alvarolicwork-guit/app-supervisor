'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Building2, Calendar, LogOut, X, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { UnidadesControl } from '@/components/supervisor/UnidadesControl';
import { CierreTurnoModal } from '@/components/supervisor/CierreTurnoModal';
import { ListaServiciosExtraordinarios } from '@/components/servicios-extraordinarios/ListaServicios';
import { AperturaForm } from '@/components/servicios-extraordinarios/AperturaForm';
import { CierreForm } from '@/components/servicios-extraordinarios/CierreForm';
import { cerrarServicioSupervisor, getServicioById, type ServicioSupervisor } from '@/services/servicioSupervisorService';
import { agregarServicioExtraordinario, cerrarServicioExtraordinario } from '@/services/servicioExtraordinarioService';
import { ServicioExtraordinario, AperturaServicioExtra, CierreServicioExtra } from '@/types/servicioExtraordinario';
import { useAuth } from '@/context/AuthContext';
import { generarInformeTexto } from '@/utils/reporteSupervisor';

export default function ServicioDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const servicioId = params?.id as string;
    const { user, isAdmin, loading: authLoading } = useAuth();

    const [servicio, setServicio] = useState<ServicioSupervisor | null>(null);
    const [activeTab, setActiveTab] = useState<'instalaciones' | 'sextraordinarios'>('instalaciones');
    const [loading, setLoading] = useState(true);
    const [showCierreModal, setShowCierreModal] = useState(false);
    const [showReporte, setShowReporte] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            cargarServicio();
        }
    }, [authLoading, user, servicioId]);

    const cargarServicio = async () => {
        setLoading(true);
        try {
            if (!servicioId) return;

            const serv = await getServicioById(servicioId);

            if (!serv) {
                alert('Servicio no encontrado');
                router.push('/');
                return;
            }

            // Validar propiedad
            if (serv.uidSupervisor !== user!.uid && !isAdmin) {
                alert('No tienes permiso para ver este servicio');
                router.push('/');
                return;
            }

            setServicio(serv);
            if (serv.estado === 'cerrado') setShowReporte(true);

        } catch (error) {
            console.error('Error cargando servicio:', error);
            alert('Error al cargar servicio');
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    const handleCerrarServicioClick = () => {
        setShowCierreModal(true);
    };

    const handleConfirmarCierre = async (datos: { entregaServicio: string; casosRutinarios: number; casosRelevantes: number }) => {
        if (!servicio) return;

        try {
            // Generar informe final
            const informeTexto = generarInformeTexto(servicio, datos);

            await cerrarServicioSupervisor(servicio.id!, {
                ...datos,
                informeFinal: informeTexto
            });

            // Actualizar estado local
            const updatedService: ServicioSupervisor = {
                ...servicio,
                estado: 'cerrado',
                cierre: {
                    fechaHora: new Date(),
                    ...datos,
                    informeFinal: informeTexto
                }
            };
            setServicio(updatedService);
            setShowCierreModal(false);
            setShowReporte(true);
        } catch (error: any) {
            console.error(error);
            alert(`Error al cerrar servicio: ${error.message}`);
        }
    };

    const formatFecha = (date: Date) => {
        return new Intl.DateTimeFormat('es-BO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando servicio...</p>
                </div>
            </div>
        );
    }

    if (!servicio) return null;

    // Si queremos mostrar el reporte, renderizamos la vista de reporte
    if (showReporte) {
        return <ReporteView servicio={servicio} onVolver={() => router.push('/')} />;
    }

    const servicioActivo = servicio.estado === 'abierto';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header del Servicio */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <button
                                    onClick={() => router.push('/')}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Volver a inicio"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                                <div>
                                    <div className="flex items-center gap-2">
                                        {servicioActivo && (
                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                        )}
                                        <h1 className="text-xl font-bold text-gray-900">
                                            {servicioActivo ? 'SERVICIO ACTIVO' : 'SERVICIO CERRADO'}
                                        </h1>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Memorándum: {servicio.apertura.nroMemorandum} |
                                        Abierto: {formatFecha(servicio.apertura.fechaHora)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {servicioActivo && (
                            <button
                                onClick={handleCerrarServicioClick}
                                className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg flex items-center gap-2"
                            >
                                <LogOut className="w-5 h-5" />
                                CERRAR SERVICIO 24h
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('instalaciones')}
                            className={`px-6 py-4 font-bold text-sm transition-all relative ${activeTab === 'instalaciones'
                                ? 'text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5" />
                                Control de Instalaciones
                            </div>
                            {activeTab === 'instalaciones' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('sextraordinarios')}
                            className={`px-6 py-4 font-bold text-sm transition-all relative ${activeTab === 'sextraordinarios'
                                ? 'text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Servicios Extraordinarios
                            </div>
                            {activeTab === 'sextraordinarios' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {!servicioActivo && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                            <p className="text-yellow-800 font-medium">
                                ⚠️ Este servicio está cerrado. Los registros son de solo lectura.
                            </p>
                        </div>
                    )}

                    {activeTab === 'instalaciones' && (
                        <UnidadesControl servicioId={servicio.id!} soloLectura={!servicioActivo} />
                    )}

                    {activeTab === 'sextraordinarios' && (
                        <ServiciosExtraordinariosTab servicio={servicio} servicioActivo={servicioActivo} />
                    )}
                </div>
            </div>

            {showCierreModal && (
                <CierreTurnoModal
                    onClose={() => setShowCierreModal(false)}
                    onContinuar={handleConfirmarCierre}
                />
            )}
        </div>
    );
}

function ReporteView({ servicio, onVolver }: { servicio: ServicioSupervisor; onVolver: () => void }) {
    // Generate simple text report for copy/paste
    const generarTextoReporte = () => {
        // Si ya existe un informe guardado, usarlo.
        if (servicio.cierre?.informeFinal) {
            return servicio.cierre.informeFinal;
        }

        // Fallback para servicios antiguos (aunque no deberían existir con este formato nuevo)
        return `INFORME
        
Este servicio fue cerrado con una versión anterior del sistema y no cuenta con el formato de informe automatizado guardado.
Por favor, consulte los detalles en el dashboard.
        `;
    };

    const copiarPortapapeles = () => {
        navigator.clipboard.writeText(generarTextoReporte());
        alert("Reporte copiado al portapapeles");
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center">
            <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-green-600 p-6 text-white text-center">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-100" />
                    <h1 className="text-2xl font-bold">Servicio Completado</h1>
                    <p className="opacity-90 mt-2">
                        {servicio.cierre?.fechaHora.toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="block text-gray-500 text-xs uppercase tracking-wider font-bold">Total Casos</span>
                                <span className="block text-3xl font-extrabold text-blue-900 mt-1">
                                    {(servicio.cierre?.casosRutinarios || 0) + (servicio.cierre?.casosRelevantes || 0)}
                                </span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="block text-gray-500 text-xs uppercase tracking-wider font-bold">Unidades</span>
                                <span className="block text-3xl font-extrabold text-indigo-900 mt-1">
                                    {servicio.controlInstalaciones?.length || 0}
                                </span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Vista Previa del Reporte
                            </h3>
                            <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap font-mono text-gray-600 h-64">
                                {generarTextoReporte()}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex gap-3">
                    <button onClick={onVolver} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                        Volver al Inicio
                    </button>
                    <button onClick={copiarPortapapeles} className="flex-1 py-3 px-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-lg">
                        Copiar Informe
                    </button>
                </div>
            </div>
        </div>
    );
}

// Componente auxiliar para el tab de S.Extraordinarios
function ServiciosExtraordinariosTab({ servicio, servicioActivo }: { servicio: ServicioSupervisor; servicioActivo: boolean }) {
    const [showAperturaForm, setShowAperturaForm] = useState(false);
    const [showCierreForm, setShowCierreForm] = useState(false);
    const [servicioSeleccionado, setServicioSeleccionado] = useState<ServicioExtraordinario | null>(null);

    const handleAbrirNuevo = () => {
        setShowAperturaForm(true);
    };

    const handleSaveApertura = async (data: AperturaServicioExtra) => {
        try {
            await agregarServicioExtraordinario(servicio.id!, data);
            setShowAperturaForm(false);
            alert('✅ Servicio extraordinario abierto correctamente');
            window.location.reload(); // Recargar para ver cambios
        } catch (error: any) {
            console.error(error);
            alert(`❌ Error al abrir servicio: ${error.message}`);
        }
    };

    const handleCerrarServicio = (servicioId: string) => {
        const s = (servicio.serviciosExtraordinarios || []).find(s => s.id === servicioId);
        if (s) {
            setServicioSeleccionado(s);
            setShowCierreForm(true);
        }
    };

    const handleSaveCierre = async (data: CierreServicioExtra) => {
        if (!servicioSeleccionado) return;

        try {
            await cerrarServicioExtraordinario(servicio.id!, servicioSeleccionado.id, data);
            setShowCierreForm(false);
            setServicioSeleccionado(null);
            alert('✅ Servicio extraordinario cerrado correctamente');
            window.location.reload(); // Recargar para ver cambios
        } catch (error: any) {
            console.error(error);
            alert(`❌ Error al cerrar servicio: ${error.message}`);
        }
    };

    return (
        <>
            <ListaServiciosExtraordinarios
                servicios={servicio.serviciosExtraordinarios || []}
                soloLectura={!servicioActivo}
                onAbrirNuevo={handleAbrirNuevo}
                onCerrarServicio={handleCerrarServicio}
                onVerDetalle={(id) => alert('Ver detalle: ' + id)}
            />

            {showAperturaForm && (
                <AperturaForm
                    onSave={handleSaveApertura}
                    onCancel={() => setShowAperturaForm(false)}
                />
            )}

            {showCierreForm && servicioSeleccionado && (
                <CierreForm
                    personalFaltoInicial={servicioSeleccionado.apertura.novedadesFormacion.personalFalto.lista}
                    onSave={handleSaveCierre}
                    onCancel={() => {
                        setShowCierreForm(false);
                        setServicioSeleccionado(null);
                    }}
                />
            )}
        </>
    );
}

