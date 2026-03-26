'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LogOut, X, Loader2, FileText, CheckCircle2, ShieldAlert, Clock, Check, UserCheck, Copy } from 'lucide-react';
import { CierreForm } from '@/components/servicios-extraordinarios/CierreForm';
import { getServicioJefeOperativoById, cerrarServicioJefeOperativo, registrarIncorporacionJefeOperativo } from '@/services/jefeOperativoService';
import { ServicioJefeOperativo } from '@/types/jefeOperativo';
import { CierreServicioExtra, PersonalNovedad } from '@/types/servicioExtraordinario';
import { useAuth } from '@/context/AuthContext';
import { InlineAlert, type InlineAlertData } from '@/components/ui/InlineAlert';
import { transformarTareasPasadoAction, generarInformeInstitucionalIAAction } from '@/app/actions';

function formatFechaSolo(date: Date) {
    return new Intl.DateTimeFormat('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function toPastTenseFallback(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return 'SIN TAREAS REGISTRADAS';
    if (trimmed.toLowerCase().startsWith('se ejecut')) return trimmed;
    return `Se ejecutaron las siguientes tareas: ${trimmed}`;
}

function generarReporteWhatsapp(servicio: ServicioJefeOperativo): string {
    const faltan = Number(servicio.apertura.novedadesFormacion.personalFalto.cantidad || 0);
    const consignado = Number(servicio.apertura.personalContemplado || 0);
    const permisos = Number(servicio.apertura.novedadesFormacion.personalPermiso.cantidad || 0);
    const forman = Math.max(consignado - faltan, 0);
    const vehiculos = Number(servicio.apertura.vehiculosContemplados || 0);
    const motocicletas = Number(servicio.apertura.motosContempladas || 0);

    const detalleFaltante = servicio.apertura.novedadesFormacion.personalFalto.lista.length > 0
        ? servicio.apertura.novedadesFormacion.personalFalto.lista.map((p) => `• ${p.gradoNombre}`).join('\n')
        : '• SIN NOVEDAD';

    return `*REPORTE OPERATIVO*
*"ESTRATEGIA OPERACIÓN 200"*
*"POR NUESTRAS FAMILIAS, BOLIVIA Y NUESTRO FUTURO"*
*COMANDO DEPARTAMENTAL DE LA POLICIA DE CHUQUISACA*

*ORDEN DE OPERACIONES N° ${servicio.apertura.nroPlanOperaciones || 'S/N'}*
*${servicio.apertura.tipoServicio || 'SIN TÍTULO'}*
*PARA CONFORMIDAD DE:*
• Comandante departamental
• Sub comandante departamental
• Inspector departamental

*SUPERVISOR GENERAL:* ${servicio.apertura.supervisorGeneral || 'SIN REGISTRO'}
*JEFE OPERATIVO:* ${servicio.apertura.jefeOperativo || 'SIN REGISTRO'}

*FECHA:* ${formatFechaSolo(servicio.apertura.fechaApertura)}
*HORA DE FORMACIÓN:* ${servicio.apertura.horaFormacion || 'SIN REGISTRO'}
*HORA DE INSTALACIÓN:* ${servicio.apertura.horaInstalacion || 'SIN REGISTRO'}
*LUGAR DE FORMACION:* ${servicio.apertura.lugarFormacion || 'SIN REGISTRO'}

*ORGANIZACIÓN DE LA FUERZA*
*PERSONAL CONSIGNADO:* ${consignado}
*FORMAN:* ${forman}
*PERMISOS:* ${permisos}
*FALTAN:* ${faltan}
*VEHÍCULOS:* ${vehiculos}
*MOTOCICLETAS:* ${motocicletas}
*TAREAS ASIGNADAS AL SERVICIO:*
${servicio.apertura.tareas || 'SIN TAREAS REGISTRADAS'}
*DETALLE DEL PERSONAL FALTANTE:*
${detalleFaltante}
*𝑺𝑬 𝑨𝑫𝑱𝑼𝑵𝑻𝑨 𝑴𝑼𝑬𝑺𝑻𝑹𝑨𝑹𝑰𝑶 𝑭𝑶𝑻𝑶𝑮𝑹𝑨𝑭𝑰𝑪𝑶*`;
}

function formatHora(date?: Date) {
    if (!date) return 'SIN REGISTRO';
    return new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function buildReporteCierreWhatsapp(servicio: ServicioJefeOperativo, cierre: CierreServicioExtra): string {
    const consignado = Number(servicio.apertura.personalContemplado || 0);
    const faltan = Number(servicio.apertura.novedadesFormacion.personalFalto.cantidad || 0);
    const forman = Math.max(consignado - faltan, 0);
    const permisos = Number(servicio.apertura.novedadesFormacion.personalPermiso.cantidad || 0);
    const vehiculos = Number(servicio.apertura.vehiculosContemplados || 0);
    const motos = Number(servicio.apertura.motosContempladas || 0);

    const tardiosBase = servicio.apertura.novedadesFormacion.personalFalto.lista.filter((p) => !!p.horaIncorporacion);
    const tardiosCierre = cierre.personalIncorporadoTarde || [];
    const tardiosMap = new Map<string, string>();
    [...tardiosBase, ...tardiosCierre].forEach((p) => {
        if (p.gradoNombre && p.horaIncorporacion) tardiosMap.set(p.gradoNombre, p.horaIncorporacion);
    });

    const tardiosTexto = tardiosMap.size > 0
        ? Array.from(tardiosMap.entries()).map(([nombre, hora]) => `• ${nombre} (Incorporación: ${hora})`).join('\n')
        : '• SIN NOVEDAD';

    const faltantesDefinitivos = (cierre.personalFaltoServicio || []).filter((p) => !p.horaIncorporacion);
    const faltantesTexto = faltantesDefinitivos.length > 0
        ? faltantesDefinitivos.map((p) => `• ${p.gradoNombre}`).join('\n')
        : '• SIN NOVEDAD';

    const observacionesUniforme = servicio.apertura.novedadesFormacion.observacionesUniforme;
    const uniformeTexto = observacionesUniforme.length > 0
        ? observacionesUniforme.map((o) => `• ${o.gradoNombre} - ${o.tipo}`).join('\n')
        : '• SIN NOVEDAD';

    const casos = cierre.novedades.casos || [];
    const novedadesServicioTexto = casos.length > 0
        ? casos
            .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
            .map((c, idx) => `${idx + 1}. [${c.hora}] ${c.tipo} - ${c.lugar}. ${c.detalle}`)
            .join('\n')
        : 'SIN NOVEDAD';

    const tareasPasado = cierre.tareasEjecutadas || toPastTenseFallback(servicio.apertura.tareas || '');

    return `*REPORTE OPERATIVO*
*"ESTRATEGIA OPERACIÓN 200"*
*"POR NUESTRAS FAMILIAS, BOLIVIA Y NUESTRO FUTURO"*
*COMANDO DEPARTAMENTAL DE LA POLICIA DE CHUQUISACA*

*ORDEN DE OPERACIONES N° ${servicio.apertura.nroPlanOperaciones || 'S/N'}*
*${servicio.apertura.tipoServicio || 'SIN TÍTULO'}*
*PARA CONFORMIDAD DE:*
• Comandante departamental
• Sub comandante departamental
• Inspector departamental

*SUPERVISOR GENERAL:* ${servicio.apertura.supervisorGeneral || 'SIN REGISTRO'}
*JEFE OPERATIVO:* ${servicio.apertura.jefeOperativo || 'SIN REGISTRO'}

*FECHA:* ${formatFechaSolo(servicio.apertura.fechaApertura)}
*HORA DE INICIO:* ${servicio.apertura.horaInstalacion || 'SIN REGISTRO'}
*HORA DE CONCLUSIÓN:* ${formatHora(cierre.fechaCierre)}
*LUGAR DE FORMACION:* ${servicio.apertura.lugarFormacion || 'SIN REGISTRO'}
*ORGANIZACIÓN DE LA FUERZA*
*PERSONAL CONSIGNADO:* ${consignado}
*FORMAN:* ${forman}
*PERMISOS:* ${permisos}
*FALTAN:* ${faltan}
*VEHÍCULOS:* ${vehiculos}
*MOTOCICLETAS:* ${motos}

*TAREAS ASIGNADAS AL SERVICIO:*
${tareasPasado}

*NOVEDADES DEL SERVICIO*
${novedadesServicioTexto}

*NOVEDADES DEL  PERSONAL:*
• Personal incorporado tardíamente:
${tardiosTexto}
• Personal que faltó al servicio:
${faltantesTexto}
• Observaciones de uniforme:
${uniformeTexto}

*𝑺𝑬 𝑨𝑫𝑱𝑼𝑵𝑻𝑨 𝑴𝑼𝑬𝑺𝑻𝑹𝑨𝑹𝑰𝑶 𝑭𝑶𝑻𝑶𝑮𝑹𝑨𝑭𝑰𝑪𝑶*`;
}

function buildInformeInstitucionalDraft(servicio: ServicioJefeOperativo, cierre: CierreServicioExtra): string {
    const consignado = Number(servicio.apertura.personalContemplado || 0);
    const faltan = Number(servicio.apertura.novedadesFormacion.personalFalto.cantidad || 0);
    const forman = Math.max(consignado - faltan, 0);
    const permisos = Number(servicio.apertura.novedadesFormacion.personalPermiso.cantidad || 0);
    const vehiculos = Number(servicio.apertura.vehiculosContemplados || 0);
    const motos = Number(servicio.apertura.motosContempladas || 0);

    const casos = cierre.novedades.casos || [];
    const casosTexto = casos.length > 0
        ? casos.map((c, i) => `${i + 1}. ${c.tipo} - ${c.lugar} (${c.hora}). ${c.detalle}`).join('\n')
        : 'SIN NOVEDAD';

    const tardios = (cierre.personalIncorporadoTarde || [])
        .map((p) => `- ${p.gradoNombre} (Incorporación: ${p.horaIncorporacion || 'S/H'})`)
        .join('\n') || '- SIN NOVEDAD';

    const faltas = (cierre.personalFaltoServicio || [])
        .map((p) => `- ${p.gradoNombre}`)
        .join('\n') || '- SIN NOVEDAD';

    const uniforme = servicio.apertura.novedadesFormacion.observacionesUniforme.length > 0
        ? servicio.apertura.novedadesFormacion.observacionesUniforme.map((o) => `- ${o.gradoNombre}: ${o.tipo}`).join('\n')
        : '- SIN NOVEDAD';

    const tareasPasado = cierre.tareasEjecutadas || toPastTenseFallback(servicio.apertura.tareas || '');

    return `INFORME INSTITUCIONAL DEL SERVICIO

COMANDO DEPARTAMENTAL DE LA POLICIA DE CHUQUISACA
ORDEN DE OPERACIONES N° ${servicio.apertura.nroPlanOperaciones || 'S/N'}
OPERACIÓN: ${servicio.apertura.tipoServicio || 'SIN TÍTULO'}

1. PERSONAL DE MANDO
- Supervisor General: ${servicio.apertura.supervisorGeneral || 'SIN REGISTRO'}
- Jefe Operativo: ${servicio.apertura.jefeOperativo || 'SIN REGISTRO'}

2. DATOS OPERATIVOS
- Fecha: ${formatFechaSolo(servicio.apertura.fechaApertura)}
- Hora de inicio: ${servicio.apertura.horaInstalacion || 'SIN REGISTRO'}
- Hora de conclusión: ${formatHora(cierre.fechaCierre)}
- Lugar de formación: ${servicio.apertura.lugarFormacion || 'SIN REGISTRO'}

3. ORGANIZACIÓN DE LA FUERZA
- Personal consignado: ${consignado}
- Personal que formó: ${forman}
- Permisos: ${permisos}
- Faltan: ${faltan}
- Vehículos: ${vehiculos}
- Motocicletas: ${motos}

4. TAREAS EJECUTADAS
${tareasPasado}

5. NOVEDADES DEL SERVICIO
${casosTexto}

6. NOVEDADES DEL PERSONAL
Personal incorporado tardíamente:
${tardios}

Personal que faltó al servicio:
${faltas}

Observaciones de uniforme:
${uniforme}

Se adjunta muestrario fotográfico.`;
}

export default function JefeOperativoDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const servicioId = params?.id as string;
    const { user, isAdmin, loading: authLoading } = useAuth();

    const [servicio, setServicio] = useState<ServicioJefeOperativo | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCierreForm, setShowCierreForm] = useState(false);
    const [showReporte, setShowReporte] = useState(false);
    const [notice, setNotice] = useState<InlineAlertData | null>(null);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

    // Estado para incorporación
    const [updatingIncorporacion, setUpdatingIncorporacion] = useState<string | null>(null); // gradoNombre
    const [horaIncorporacionTemp, setHoraIncorporacionTemp] = useState('');

    const cargarServicio = useCallback(async () => {
        setLoading(true);
        try {
            if (!servicioId) return;

            const serv = await getServicioJefeOperativoById(servicioId);

            if (!serv) {
                setNotice({ type: 'error', message: 'Servicio de Jefe Operativo no encontrado.' });
                router.push('/');
                return;
            }

            // Validar propiedad
            if (serv.uidJefe !== user!.uid && !isAdmin) {
                setNotice({ type: 'error', message: 'No tienes permiso para ver este servicio.' });
                router.push('/');
                return;
            }

            setServicio(serv);
            if (serv.estado === 'cerrado') setShowReporte(true);

        } catch (error) {
            console.error('Error cargando servicio operativo:', error);
            setNotice({ type: 'error', message: 'Error al cargar servicio.' });
            router.push('/');
        } finally {
            setLoading(false);
        }
    }, [servicioId, router, user, isAdmin]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            void cargarServicio();
        }
    }, [authLoading, user, router, cargarServicio]);

    const handleConfirmarCierre = async (datos: CierreServicioExtra) => {
        if (!servicio) return;

        try {
            let tareasEjecutadas = '';
            const tareasOriginales = servicio.apertura.tareas || '';

            if (tareasOriginales.trim()) {
                const textoIA = await transformarTareasPasadoAction(tareasOriginales);
                tareasEjecutadas = toPastTenseFallback(textoIA || tareasOriginales);
            }

            const payloadCierre: CierreServicioExtra = {
                ...datos,
                tareasEjecutadas,
            };

            const reporteWhatsappFinal = buildReporteCierreWhatsapp(servicio, payloadCierre);
            const borradorInforme = buildInformeInstitucionalDraft(servicio, payloadCierre);
            const informeInstitucionalFinal = await generarInformeInstitucionalIAAction(borradorInforme);

            payloadCierre.reporteWhatsappFinal = reporteWhatsappFinal;
            payloadCierre.informeInstitucionalFinal = informeInstitucionalFinal || borradorInforme;
            payloadCierre.generatedAt = new Date();

            await cerrarServicioJefeOperativo(servicio.id!, payloadCierre);

            // Actualizar estado local
            const updatedService: ServicioJefeOperativo = {
                ...servicio,
                estado: 'cerrado',
                cierre: payloadCierre
            };
            setServicio(updatedService);
            setShowCierreForm(false);
            setNotice({ type: 'success', message: 'Servicio cerrado. Informe y reporte generados correctamente.' });
            router.push('/');
        } catch (error) {
            console.error(error);
            setNotice({
                type: 'error',
                message: `Error al cerrar servicio: ${error instanceof Error ? error.message : 'error desconocido'}`,
            });
        }
    };

    const handleActualizarIncorporacion = async (gradoNombre: string) => {
        if (!servicio || !servicioId || !horaIncorporacionTemp) return;

        try {
            await registrarIncorporacionJefeOperativo(servicioId, gradoNombre, horaIncorporacionTemp);
            
            // Actualizar estado local
            const updatedLista = servicio.apertura.novedadesFormacion.personalFalto.lista.map(p => {
                if (p.gradoNombre === gradoNombre) {
                    return { ...p, horaIncorporacion: horaIncorporacionTemp };
                }
                return p;
            });

            setServicio({
                ...servicio,
                apertura: {
                    ...servicio.apertura,
                    novedadesFormacion: {
                        ...servicio.apertura.novedadesFormacion,
                        personalFalto: {
                            ...servicio.apertura.novedadesFormacion.personalFalto,
                            lista: updatedLista
                        }
                    }
                }
            });

            setUpdatingIncorporacion(null);
            setHoraIncorporacionTemp('');
        } catch (error) {
            console.error(error);
            setNotice({ type: 'error', message: 'Error al registrar incorporación.' });
        }
    };

    const iniciarIncorporacion = (p: PersonalNovedad) => {
        setUpdatingIncorporacion(p.gradoNombre);
        // Hora actual en formato HH:mm
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setHoraIncorporacionTemp(`${hh}:${mm}`);
    };

    const handleGenerarReporteWhatsapp = () => {
        if (!servicio) return;
        setShowWhatsAppModal(true);
    };

    const handleCopiarReporteWhatsapp = async () => {
        if (!servicio) return;
        try {
            await navigator.clipboard.writeText(generarReporteWhatsapp(servicio));
            setNotice({ type: 'success', message: 'Reporte institucional copiado. Listo para WhatsApp.' });
            setShowWhatsAppModal(false);
        } catch {
            setNotice({ type: 'error', message: 'No se pudo copiar el reporte. Intenta nuevamente.' });
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
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando servicio...</p>
                </div>
            </div>
        );
    }

    if (!servicio) return null;

    if (showReporte) {
        return <ReporteViewJefeOperativo servicio={servicio} onVolver={() => router.push('/')} />;
    }

    const servicioActivo = servicio.estado === 'abierto';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header del Servicio */}
            <div className="bg-indigo-900 shadow-lg border-b border-indigo-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShieldAlert className="w-48 h-48 text-white" />
                </div>
                <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <button
                                    onClick={() => router.push('/')}
                                    className="p-2 hover:bg-indigo-800 rounded-lg transition-colors"
                                    title="Volver a inicio"
                                >
                                    <X className="w-5 h-5 text-indigo-100" />
                                </button>
                                <div>
                                    <div className="flex items-center gap-2">
                                        {servicioActivo && (
                                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                                        )}
                                        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                                            {servicioActivo ? 'JEFE OPERATIVO: ACTIVO' : 'JEFE OPERATIVO: CERRADO'}
                                        </h1>
                                    </div>
                                    <div className="text-sm text-indigo-200 mt-1 flex flex-col gap-1">
                                        <span className="font-bold text-white uppercase text-xs opacity-75">Plan / Operación:</span>
                                        <span className="text-indigo-50 leading-relaxed">{servicio.apertura.tipoServicio}</span>
                                        <div className="flex flex-wrap gap-2 mt-1 opacity-80 text-xs sm:text-sm">
                                            <span>Orden: {servicio.apertura.nroPlanOperaciones}</span>
                                            <span>•</span>
                                            <span>Lugar: {servicio.apertura.lugarFormacion}</span>
                                            <span>•</span>
                                            <span>Inicio: {formatFecha(servicio.apertura.fechaApertura)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {servicioActivo && (
                            <button
                                onClick={() => setShowCierreForm(true)}
                                className="px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-5 h-5" />
                                FINALIZAR SERVICIO
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-4 py-8">
                {/* Detalles de la Apertura */}
                {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Detalles de Operación</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Supervisor General</p>
                            <p className="text-gray-900 font-semibold">{servicio.apertura.supervisorGeneral}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Jefe Operativo</p>
                            <p className="text-gray-900 font-semibold">{servicio.apertura.jefeOperativo}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Horarios (Formación - Instalación)</p>
                            <p className="text-gray-900 font-semibold">{servicio.apertura.horaFormacion} - {servicio.apertura.horaInstalacion}</p>
                        </div>
                        <div className="md:col-span-1 grid grid-cols-3 gap-2">
                            <div>
                                <p className="text-[10px] font-medium text-gray-500 uppercase">Personal</p>
                                <p className="text-gray-900 font-bold">{servicio.apertura.personalContemplado}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-medium text-gray-500 uppercase">Motos (MTS)</p>
                                <p className="text-gray-900 font-bold">{servicio.apertura.motosContempladas || 0}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-medium text-gray-500 uppercase">Vehículos (VL)</p>
                                <p className="text-gray-900 font-bold">{servicio.apertura.vehiculosContemplados || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tareas del Servicio (NUEVO) */}
                    {servicio.apertura.tareas && (
                        <div className="mt-6 pt-4 border-t">
                            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-600" />
                                Tareas / Misión y Ejecución
                            </h3>
                            <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 italic leading-relaxed">
                                "{servicio.apertura.tareas}"
                            </p>
                        </div>
                    )}

                    {/* Novedades Importantes y Personal que Faltó */}
                    {(servicio.apertura.novedadesFormacion.personalFalto.cantidad > 0 || servicio.apertura.novedadesFormacion.observacionesUniforme.length > 0) && (
                        <div className="mt-6 pt-4 border-t">
                             <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-900">Personal que Faltó / Novedades Iniciales</h3>
                                <div className="flex gap-2">
                                    {servicio.apertura.novedadesFormacion.personalFalto.cantidad > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-bold uppercase">
                                            {servicio.apertura.novedadesFormacion.personalFalto.cantidad} Faltas
                                        </span>
                                    )}
                                    {servicio.apertura.novedadesFormacion.observacionesUniforme.length > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-bold uppercase">
                                            {servicio.apertura.novedadesFormacion.observacionesUniforme.length} Obs. Uniforme
                                        </span>
                                    )}
                                </div>
                             </div>

                             {/* Lista de Personal que Faltó con Incorporación */}
                             {servicio.apertura.novedadesFormacion.personalFalto.lista.length > 0 && (
                                 <div className="space-y-2 mb-6">
                                     {servicio.apertura.novedadesFormacion.personalFalto.lista.map((p, idx) => {
                                         const incorporado = !!p.horaIncorporacion;
                                         const isUpdating = updatingIncorporacion === p.gradoNombre;

                                         return (
                                             <div 
                                                key={idx} 
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                    incorporado 
                                                        ? 'bg-green-50 border-green-200 shadow-sm' 
                                                        : 'bg-white border-gray-100'
                                                }`}
                                             >
                                                 <div className="flex items-center gap-3">
                                                     <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                         incorporado ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                                     }`}>
                                                         {incorporado ? <UserCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                                                     </div>
                                                     <div>
                                                         <p className={`text-sm font-bold ${incorporado ? 'text-green-600' : 'text-red-600'}`}>
                                                             {p.gradoNombre}
                                                         </p>
                                                         {incorporado ? (
                                                             <p className="text-[10px] text-green-600 font-medium flex items-center gap-1 mt-0.5">
                                                                 <Check className="w-3 h-3" /> Presente a hrs {p.horaIncorporacion}
                                                             </p>
                                                         ) : (
                                                             <p className="text-[10px] text-red-400 font-medium mt-0.5">Ausente (Atrasado)</p>
                                                         )}
                                                     </div>
                                                 </div>

                                                 {servicioActivo && !incorporado && (
                                                     <div>
                                                         {isUpdating ? (
                                                             <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                                                                 <input 
                                                                    type="time" 
                                                                    value={horaIncorporacionTemp}
                                                                    onChange={(e) => setHoraIncorporacionTemp(e.target.value)}
                                                                    className="px-2 py-1 text-xs border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                                                 />
                                                                 <button 
                                                                    onClick={() => handleActualizarIncorporacion(p.gradoNombre)}
                                                                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm"
                                                                    title="Confirmar incorporación"
                                                                 >
                                                                     <Check className="w-3 h-3" />
                                                                 </button>
                                                                 <button 
                                                                    onClick={() => setUpdatingIncorporacion(null)}
                                                                    className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                                                                 >
                                                                     <X className="w-3 h-3" />
                                                                 </button>
                                                             </div>
                                                         ) : (
                                                             <button 
                                                                onClick={() => iniciarIncorporacion(p)}
                                                                className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 shadow-md shadow-green-100 transition-all active:scale-95 flex items-center gap-1.5"
                                                             >
                                                                 <Clock className="w-3 h-3" />
                                                                 INCORPORACIÓN
                                                             </button>
                                                         )}
                                                     </div>
                                                 )}
                                             </div>
                                         );
                                     })}
                                     
                                     {/* Indicador de personal adicional sin nombre registrado */}
                                     {servicio.apertura.novedadesFormacion.personalFalto.cantidad > servicio.apertura.novedadesFormacion.personalFalto.lista.length && (
                                         <div className="mt-2 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl animate-pulse">
                                             <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                                 <ShieldAlert className="w-4 h-4" />
                                             </div>
                                             <p className="text-xs font-bold text-red-700 italic leading-tight">
                                                 + {servicio.apertura.novedadesFormacion.personalFalto.cantidad - servicio.apertura.novedadesFormacion.personalFalto.lista.length} efectivos adicionales reportados sin nombre registrado.
                                             </p>
                                         </div>
                                     )}
                                 </div>
                             )}
                        </div>
                    )}
                </div>

                {!servicioActivo && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                        <p className="text-yellow-800 font-medium">
                            ⚠️ Este servicio está cerrado. Consulta el reporte completo al reiniciar la vista.
                        </p>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Reporte Institucional para WhatsApp</p>
                        <p className="text-xs text-gray-500">Genera el formato oficial con negrillas usando asteriscos.</p>
                    </div>
                    <button
                        onClick={handleGenerarReporteWhatsapp}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        Generar Reporte
                    </button>
                </div>
            </div>

            {showWhatsAppModal && servicio && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="px-6 py-4 border-b bg-emerald-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-emerald-900">Reporte Operativo - WhatsApp</h3>
                                <p className="text-xs text-emerald-700">Formato estricto institucional listo para copiar.</p>
                            </div>
                            <button onClick={() => setShowWhatsAppModal(false)} className="p-2 rounded-lg hover:bg-emerald-100">
                                <X className="w-4 h-4 text-emerald-800" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto">
                            <textarea
                                readOnly
                                value={generarReporteWhatsapp(servicio)}
                                className="w-full h-72 sm:h-96 rounded-xl border border-gray-300 p-3 sm:p-4 text-xs font-mono text-gray-700 bg-gray-50"
                            />
                            <div className="mt-4 flex flex-col sm:flex-row justify-end gap-3">
                                <button
                                    onClick={() => setShowWhatsAppModal(false)}
                                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={handleCopiarReporteWhatsapp}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800"
                                >
                                    <Copy className="w-4 h-4" />
                                    Copiar para WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCierreForm && (
                <CierreForm
                    personalFaltoInicial={servicio.apertura.novedadesFormacion.personalFalto.lista}
                    onSave={handleConfirmarCierre}
                    onCancel={() => setShowCierreForm(false)}
                />
            )}
        </div>
    );
}

function ReporteViewJefeOperativo({ servicio, onVolver }: { servicio: ServicioJefeOperativo; onVolver: () => void }) {
    const [notice, setNotice] = useState<InlineAlertData | null>(null);

    const generarTextoReporte = () => {
        if (!servicio.cierre) return 'SERVICIO SIN CIERRE REGISTRADO';
        return servicio.cierre.reporteWhatsappFinal || buildReporteCierreWhatsapp(servicio, servicio.cierre);
    };

    const generarInformeInstitucional = () => {
        if (!servicio.cierre) return 'SERVICIO SIN CIERRE REGISTRADO';
        return servicio.cierre.informeInstitucionalFinal || buildInformeInstitucionalDraft(servicio, servicio.cierre);
    };

    const imprimirInformeInstitucional = () => {
        const texto = generarInformeInstitucional();
        const escaped = texto
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) {
            setNotice({ type: 'error', message: 'No se pudo abrir la vista de impresión.' });
            return;
        }

        win.document.write(`<!doctype html><html><head><title>Informe Institucional</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}pre{white-space:pre-wrap;font-family:Consolas,monospace;font-size:12px;line-height:1.45}h1{font-size:18px;margin-bottom:12px}</style></head><body><h1>Informe Institucional del Servicio</h1><pre>${escaped}</pre></body></html>`);
        win.document.close();
        win.focus();
        win.print();
    };

    const copiarPortapapeles = async () => {
        try {
            await navigator.clipboard.writeText(generarTextoReporte());
            setNotice({ type: 'success', message: 'Reporte copiado al portapapeles.' });
        } catch {
            setNotice({ type: 'error', message: 'No se pudo copiar el reporte.' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center">
            <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-indigo-600 p-6 text-white text-center">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-indigo-100" />
                    <h1 className="text-2xl font-bold">Servicio Finalizado</h1>
                    <p className="opacity-90 mt-2">
                        {servicio.cierre?.fechaCierre.toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="space-y-6">
                        {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Vista Previa del Reporte de Operación
                            </h3>
                            <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap font-mono text-gray-600 h-64">
                                {generarTextoReporte()}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-3">
                    <button onClick={onVolver} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                        Panel Principal
                    </button>
                    <button onClick={imprimirInformeInstitucional} className="flex-1 py-3 px-4 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg">
                        Informe Institucional (PDF)
                    </button>
                    <button onClick={copiarPortapapeles} className="flex-1 py-3 px-4 bg-indigo-900 text-white rounded-xl font-bold hover:bg-indigo-800 transition-colors shadow-lg">
                        Copiar Reporte WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
}
