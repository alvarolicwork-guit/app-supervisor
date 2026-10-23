'use client';

import { useState, useEffect } from 'react';
import { X, Save, Plus, Sparkles, Trash2 } from 'lucide-react';
import { PersonalNovedad, AperturaServicioExtra, ObservacionUniforme } from '@/types/servicioExtraordinario';
import { useAuth } from '@/context/AuthContext';
import { AIExtractionModal } from './AIExtractionModal';
import { InlineAlert, type InlineAlertData } from '@/components/ui/InlineAlert';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { normalizarNombre } from '@/utils/text';

interface AperturaFormProps {
    onSave: (data: AperturaServicioExtra) => void;
    onCancel: () => void;
    tipoUsuario?: 'supervisor' | 'jefe';
}

export function AperturaForm({ onSave, onCancel, tipoUsuario = 'supervisor' }: AperturaFormProps) {
    // Obtener supervisor actual desde AuthContext
    const { userProfile } = useAuth();
    
    const nombreCompletoActual = userProfile
        ? `${userProfile.grado || ''} ${userProfile.nombreCompleto || ''}`.trim()
        : '';

    // Plan de Operaciones
    const [nroPlan, setNroPlan] = useState('');
    const [turno, setTurno] = useState('');
    const [turnoEtiqueta, setTurnoEtiqueta] = useState('');
    const [horarioTurno, setHorarioTurno] = useState('');
    const [tipoServicio, setTipoServicio] = useState('');
    const [personalContemplado, setPersonalContemplado] = useState('');
    const [motosContempladas, setMotosContempladas] = useState('');
    const [vehiculosContemplados, setVehiculosContemplados] = useState('');
    const [supervisorGeneral, setSupervisorGeneral] = useState(tipoUsuario === 'supervisor' ? nombreCompletoActual : '');
    const [jefeOperativo, setJefeOperativo] = useState(tipoUsuario === 'jefe' ? nombreCompletoActual : ''); 
    
    // Si el perfil carga después, actualizamos los campos si están vacíos
    useEffect(() => {
        if (nombreCompletoActual) {
            if (tipoUsuario === 'supervisor' && !supervisorGeneral) setSupervisorGeneral(nombreCompletoActual);
            if (tipoUsuario === 'jefe' && !jefeOperativo) setJefeOperativo(nombreCompletoActual);
        }
    }, [nombreCompletoActual, tipoUsuario, supervisorGeneral, jefeOperativo]);
    const [lugarFormacion, setLugarFormacion] = useState('');
    const [horaFormacion, setHoraFormacion] = useState('');
    const [horaInstalacion, setHoraInstalacion] = useState('');
    const [fechaApertura, setFechaApertura] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });
    const [tareas, setTareas] = useState('');

    // Novedades Formación
    const [personalFormo, setPersonalFormo] = useState('');

    // Faltas
    const [personalFaltoCantidad, setPersonalFaltoCantidad] = useState('');
    const [personalFaltoLista, setPersonalFaltoLista] = useState<PersonalNovedad[]>([]);

    // Permisos
    const [personalPermisoCantidad, setPersonalPermisoCantidad] = useState('');
    const [personalPermisoLista, setPersonalPermisoLista] = useState<PersonalNovedad[]>([]);

    // Observaciones Uniforme (NUEVO)
    const [observacionesUniforme, setObservacionesUniforme] = useState<ObservacionUniforme[]>([]);

    // Temporal para agregar personal
    const [tempGradoNombreFalto, setTempGradoNombreFalto] = useState('');
    const [tempGradoNombrePermiso, setTempGradoNombrePermiso] = useState('');

    // Temporal para observaciones
    const [obsGradoNombre, setObsGradoNombre] = useState('');
    const [obsTipo, setObsTipo] = useState<'Incorrecto' | 'Sucio/Desarreglado' | 'Incompleto'>('Incorrecto');

    // Toggle para Novedades de Uniforme
    const [tieneNovedadesUniforme, setTieneNovedadesUniforme] = useState(false);

    // Modal de IA
    const [showAIModal, setShowAIModal] = useState(false);
    const [notice, setNotice] = useState<InlineAlertData | null>(null);

    // Handler para auto-fill desde IA. Reemplaza el bloque completo para que no
    // queden datos del turno o servicio anterior.
    const handleAIExtraction = (data: Partial<AperturaServicioExtra>) => {
        const novedades = data.novedadesFormacion;

        setNroPlan(data.nroPlanOperaciones || '');
        setTurno(data.turno || '');
        setTurnoEtiqueta(data.turnoEtiqueta || '');
        setHorarioTurno(data.horarioTurno || '');
        setTipoServicio(data.tipoServicio || '');
        setPersonalContemplado(data.personalContemplado?.toString() || '');
        setMotosContempladas(data.motosContempladas?.toString() || '');
        setVehiculosContemplados(data.vehiculosContemplados?.toString() || '');
        setSupervisorGeneral(
            data.supervisorGeneral || (tipoUsuario === 'supervisor' ? nombreCompletoActual : '')
        );
        setJefeOperativo(
            data.jefeOperativo || (tipoUsuario === 'jefe' ? nombreCompletoActual : '')
        );
        setLugarFormacion(data.lugarFormacion || '');
        setHoraFormacion(data.horaFormacion || '');
        setHoraInstalacion(data.horaInstalacion || '');
        setTareas(data.tareas || '');

        setPersonalFormo(novedades?.personalFormo?.toString() || '');
        setPersonalFaltoCantidad(novedades?.personalFalto?.cantidad?.toString() || '');
        setPersonalFaltoLista(novedades?.personalFalto?.lista || []);
        setPersonalPermisoCantidad(novedades?.personalPermiso?.cantidad?.toString() || '');
        setPersonalPermisoLista(novedades?.personalPermiso?.lista || []);
        setObservacionesUniforme(novedades?.observacionesUniforme || []);
        setTieneNovedadesUniforme(Boolean(novedades?.observacionesUniforme?.length));

        setShowAIModal(false);
        setNotice({
            type: 'success',
            message: 'Información del turno seleccionado cargada. Revisa y completa los campos.',
        });
    };

    const agregarPersonalFalto = () => {
        if (tempGradoNombreFalto) {
            const nuevaLista = [...personalFaltoLista, { gradoNombre: normalizarNombre(tempGradoNombreFalto) }];
            setPersonalFaltoLista(nuevaLista);
            setTempGradoNombreFalto('');
            // Sincronizar recuento si es necesario
            if (parseInt(personalFaltoCantidad) < nuevaLista.length) {
                setPersonalFaltoCantidad(nuevaLista.length.toString());
            }
        }
    };

    const removePersonalFalto = (idx: number) => {
        const nuevaLista = personalFaltoLista.filter((_, i) => i !== idx);
        setPersonalFaltoLista(nuevaLista);
        // Si el recuento manual era igual al de la lista, lo bajamos también
        if (parseInt(personalFaltoCantidad) === personalFaltoLista.length) {
            setPersonalFaltoCantidad(nuevaLista.length.toString());
        }
    };

    const agregarPersonalPermiso = () => {
        if (tempGradoNombrePermiso) {
            const nuevaLista = [...personalPermisoLista, { gradoNombre: normalizarNombre(tempGradoNombrePermiso) }];
            setPersonalPermisoLista(nuevaLista);
            setTempGradoNombrePermiso('');
            // Sincronizar recuento
            if (parseInt(personalPermisoCantidad) < nuevaLista.length) {
                setPersonalPermisoCantidad(nuevaLista.length.toString());
            }
        }
    };

    const removePersonalPermiso = (idx: number) => {
        const nuevaLista = personalPermisoLista.filter((_, i) => i !== idx);
        setPersonalPermisoLista(nuevaLista);
        if (parseInt(personalPermisoCantidad) === personalPermisoLista.length) {
            setPersonalPermisoCantidad(nuevaLista.length.toString());
        }
    };

    const agregarObservacion = () => {
        if (obsGradoNombre) {
            setObservacionesUniforme([...observacionesUniforme, {
                gradoNombre: normalizarNombre(obsGradoNombre),
                tipo: obsTipo
            }]);
            setObsGradoNombre('');
            setObsTipo('Incorrecto'); // Reset default
        }
    };

    const removeObservacion = (idx: number) => {
        setObservacionesUniforme(observacionesUniforme.filter((_, i) => i !== idx));
    }

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting) return;

        // Auto-capturar personal que quedó escrito en los cuadros de texto pero no se presionó [+]
        let finalFaltoLista = [...personalFaltoLista];
        let finalFaltoCantidad = parseInt(personalFaltoCantidad) || 0;
        if (tempGradoNombreFalto.trim()) {
            finalFaltoLista.push({ gradoNombre: normalizarNombre(tempGradoNombreFalto) });
            if (finalFaltoCantidad < finalFaltoLista.length) {
                finalFaltoCantidad = finalFaltoLista.length;
            }
        }

        let finalPermisoLista = [...personalPermisoLista];
        let finalPermisoCantidad = parseInt(personalPermisoCantidad) || 0;
        if (tempGradoNombrePermiso.trim()) {
            finalPermisoLista.push({ gradoNombre: normalizarNombre(tempGradoNombrePermiso) });
            if (finalPermisoCantidad < finalPermisoLista.length) {
                finalPermisoCantidad = finalPermisoLista.length;
            }
        }

        setIsSubmitting(true);

        const data: AperturaServicioExtra = {
            nroPlanOperaciones: nroPlan,
            turno: turno || undefined,
            turnoEtiqueta: turnoEtiqueta || undefined,
            horarioTurno: horarioTurno || undefined,
            tipoServicio,
            personalContemplado: parseInt(personalContemplado) || 0,
            motosContempladas: parseInt(motosContempladas) || 0,
            vehiculosContemplados: parseInt(vehiculosContemplados) || 0,
            supervisorGeneral: normalizarNombre(supervisorGeneral),
            jefeOperativo: normalizarNombre(jefeOperativo),
            lugarFormacion,
            horaFormacion,
            horaInstalacion,
            tareas,
            fechaApertura: fechaApertura ? new Date(fechaApertura) : new Date(),
            novedadesFormacion: {
                personalFormo: Number(personalFormo) || 0,
                personalFalto: {
                    cantidad: finalFaltoCantidad,
                    lista: finalFaltoLista
                },
                personalPermiso: {
                    cantidad: finalPermisoCantidad,
                    lista: finalPermisoLista
                },
                observacionesUniforme: tieneNovedadesUniforme ? observacionesUniforme : []
            }
        };

        try {
            await onSave(data);
        } catch (error) {
            console.error(error);
            setIsSubmitting(false); // Only re-enable on error
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-3 sm:my-8 max-h-[96vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="app-modal-header sticky top-0 z-10 px-4 py-4 sm:px-6">
                    <h2 className="pr-2 text-base font-bold sm:text-lg">Apertura servicio extraordinario</h2>
                    <button onClick={onCancel} className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label="Cerrar">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto">
                    {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

                    {/* AI Auto-complete Button */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-indigo-600" />
                                    <h3 className="font-bold text-slate-900">Auto-completar con IA</h3>
                                </div>
                                <p className="text-sm text-slate-600">
                                    Extrae información desde WhatsApp, PDF o imagen.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAIModal(true)}
                                className="app-btn-primary w-full sm:w-auto"
                            >
                                <Sparkles className="h-4 w-4" />
                                Usar IA
                            </button>
                        </div>
                    </div>

                    {/* Plan de Operaciones */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                        <h3 className="font-bold text-lg text-gray-900">📑 Plan de Operaciones</h3>
 
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">N° de Orden de Operaciones *</label>
                                <input
                                    type="text"
                                    value={nroPlan}
                                    onChange={(e) => setNroPlan(e.target.value)}
                                    placeholder="301/2026"
                                    className="app-input"
                                    required
                                />
                            </div>
 
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Servicio *</label>
                                <input
                                    type="text"
                                    value={tipoServicio}
                                    onChange={(e) => setTipoServicio(e.target.value)}
                                    placeholder="PLAN INTEGRAL DE SEGURIDAD INTERNA"
                                    className="app-input"
                                    required
                                />
                            </div>
 
                            <NumberStepper
                                label="Personal (Efectivo Policial) *"
                                value={parseInt(personalContemplado) || 0}
                                onChange={(val) => setPersonalContemplado(val.toString())}
                            />
                            <NumberStepper
                                label="Motocicletas (MTS) *"
                                value={parseInt(motosContempladas) || 0}
                                onChange={(val) => setMotosContempladas(val.toString())}
                            />
                            <NumberStepper
                                label="Vehículos (VL) *"
                                value={parseInt(vehiculosContemplados) || 0}
                                onChange={(val) => setVehiculosContemplados(val.toString())}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="app-label">Turno / servicio</label>
                                <input
                                    type="text"
                                    value={turnoEtiqueta}
                                    onChange={(e) => setTurnoEtiqueta(e.target.value)}
                                    placeholder="Ej: Segundo Turno"
                                    className="app-input mt-1.5"
                                />
                            </div>
                            <div>
                                <label className="app-label">Horario del turno</label>
                                <input
                                    type="text"
                                    value={horarioTurno}
                                    onChange={(e) => setHorarioTurno(e.target.value)}
                                    placeholder="Ej: 14:00 - 22:00"
                                    className="app-input mt-1.5"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor General *</label>
                            <input
                                type="text"
                                value={supervisorGeneral}
                                onChange={(e) => setSupervisorGeneral(e.target.value)}
                                onBlur={() => setSupervisorGeneral((valor) => normalizarNombre(valor))}
                                placeholder="Tcnl. DEAP Alberto Suarez Plata"
                                className="app-input"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jefe Operativo *</label>
                            <input
                                type="text"
                                value={jefeOperativo}
                                onChange={(e) => setJefeOperativo(e.target.value)}
                                onBlur={() => setJefeOperativo((valor) => normalizarNombre(valor))}
                                placeholder="Tcnl. DEAP Alberto Suarez Plata"
                                className="app-input"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora *</label>
                                <input
                                    type="datetime-local"
                                    value={fechaApertura}
                                    onChange={(e) => setFechaApertura(e.target.value)}
                                    className="app-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar Formación *</label>
                                <input
                                    type="text"
                                    value={lugarFormacion}
                                    onChange={(e) => setLugarFormacion(e.target.value)}
                                    placeholder="Multipropósito"
                                    className="app-input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Formación *</label>
                                <input
                                    type="time"
                                    value={horaFormacion}
                                    onChange={(e) => setHoraFormacion(e.target.value)}
                                    className="app-input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Instalación *</label>
                                <input
                                    type="time"
                                    value={horaInstalacion}
                                    onChange={(e) => setHoraInstalacion(e.target.value)}
                                    className="app-input"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tareas / Misión y Ejecución</label>
                            <textarea
                                value={tareas}
                                onChange={(e) => setTareas(e.target.value)}
                                placeholder="Resumen de la misión y ejecución del servicio..."
                                className="app-input min-h-[100px]"
                                maxLength={500}
                            />
                            <p className="text-right text-[10px] text-gray-500 mt-1">
                                {tareas.length} / 500 caracteres
                            </p>
                        </div>
                    </div>

                    {/* Novedades de Formación */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                        <h3 className="font-bold text-lg text-gray-900">👥 Novedades de Formación</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <NumberStepper
                                label="Personal que Formó"
                                value={Number(personalFormo) || 0}
                                onChange={(val) => setPersonalFormo(val.toString())}
                            />
                            <NumberStepper
                                label="Faltaron a la Formación"
                                value={parseInt(personalFaltoCantidad) || 0}
                                onChange={(val) => setPersonalFaltoCantidad(val.toString())}
                            />
                            <NumberStepper
                                label="Con Permiso"
                                value={parseInt(personalPermisoCantidad) || 0}
                                onChange={(val) => setPersonalPermisoCantidad(val.toString())}
                            />
                        </div>

                        {/* DETALLE FALTAS */}
                        {parseInt(personalFaltoCantidad) > 0 && (
                            <div className="border border-red-200 bg-red-50 p-3 rounded-lg animate-in fade-in">
                                <p className="text-sm font-medium text-red-800 mb-2">Detalle: Personal que Faltó a la Formación</p>
                                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={tempGradoNombreFalto}
                                        onChange={(e) => setTempGradoNombreFalto(e.target.value)}
                                        placeholder="Grado y Nombre Completo"
                                        className="app-input flex-1"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                agregarPersonalFalto();
                                            }
                                        }}
                                    />
                                    <button type="button" onClick={agregarPersonalFalto} className="app-btn-primary w-full sm:w-auto">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                                {personalFaltoLista.map((p, i) => (
                                    <div key={i} className="text-sm text-gray-700 bg-white p-1.5 rounded border mb-1 flex justify-between items-center group">
                                        <span className="font-medium text-red-900">{p.gradoNombre}</span>
                                        <button type="button" onClick={() => removePersonalFalto(i)} className="text-red-300 hover:text-red-600">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {parseInt(personalFaltoCantidad) > personalFaltoLista.length && (
                                    <p className="text-[10px] text-red-400 italic mt-1 font-medium">
                                        + {parseInt(personalFaltoCantidad) - personalFaltoLista.length} efectivos adicionales sin registrar nombre.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* DETALLE PERMISOS */}
                        {parseInt(personalPermisoCantidad) > 0 && (
                            <div className="border border-blue-200 bg-blue-50 p-3 rounded-lg animate-in fade-in">
                                <p className="text-sm font-medium text-blue-800 mb-2">Detalle: Personal con Permiso</p>
                                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={tempGradoNombrePermiso}
                                        onChange={(e) => setTempGradoNombrePermiso(e.target.value)}
                                        placeholder="Grado y Nombre Completo"
                                        className="app-input flex-1"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                agregarPersonalPermiso();
                                            }
                                        }}
                                    />
                                    <button type="button" onClick={agregarPersonalPermiso} className="app-btn-primary w-full sm:w-auto">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                                {personalPermisoLista.map((p, i) => (
                                    <div key={i} className="text-sm text-gray-700 bg-white p-1.5 rounded border mb-1 flex justify-between items-center group">
                                        <span className="font-medium text-blue-900">{p.gradoNombre}</span>
                                        <button type="button" onClick={() => removePersonalPermiso(i)} className="text-blue-300 hover:text-blue-600">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {parseInt(personalPermisoCantidad) > personalPermisoLista.length && (
                                    <p className="text-[10px] text-blue-400 italic mt-1 font-medium">
                                        + {parseInt(personalPermisoCantidad) - personalPermisoLista.length} efectivos con permiso sin registrar nombre.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* OBSEVACIONES UNIFORME */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <h3 className="font-bold text-lg text-gray-900">👮 Observaciones sobre el Uniforme</h3>
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-lg border shadow-sm">
                                <input
                                    type="checkbox"
                                    checked={tieneNovedadesUniforme}
                                    onChange={(e) => setTieneNovedadesUniforme(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Presenta novedades?</span>
                            </label>
                        </div>

                        {tieneNovedadesUniforme && (
                            <div className="animate-in slide-in-from-top-2 fade-in">
                                <p className="text-xs text-gray-500 mb-3">Registre aquí al personal que no cumple con el reglamento de uniformes.</p>

                                <div className="flex flex-col md:flex-row gap-2 md:items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Grado y Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={obsGradoNombre}
                                            onChange={(e) => setObsGradoNombre(e.target.value)}
                                            className="w-full px-2 py-2 border rounded-lg text-sm"
                                            placeholder="Ej: Sbtte. Juan Perez"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="app-label">Observación</label>
                                        <div className="mt-1.5 flex flex-wrap gap-2">
                                            {[
                                                { value: 'Incorrecto', label: 'Uniforme incorrecto' },
                                                { value: 'Sucio/Desarreglado', label: 'Sucio y desarreglado' },
                                                { value: 'Incompleto', label: 'Sin implemento completo' },
                                            ].map((opcion) => (
                                                <button
                                                    key={opcion.value}
                                                    type="button"
                                                    onClick={() => setObsTipo(opcion.value as ObservacionUniforme['tipo'])}
                                                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                                                        obsTipo === opcion.value
                                                            ? 'border-slate-900 bg-slate-900 text-white'
                                                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {opcion.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={agregarObservacion}
                                        className="app-btn-primary w-full md:w-auto"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Lista de Observaciones */}
                                {observacionesUniforme.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {observacionesUniforme.map((obs, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-orange-100 p-1.5 rounded-full">
                                                        <span className="text-orange-700 text-xs font-bold">!</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{obs.gradoNombre}</p>
                                                        <p className="text-xs text-red-600 font-medium">{obs.tipo}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeObservacion(idx)}
                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="app-btn-secondary flex-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="app-btn-primary flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Abrir Servicio
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* AI Modal */}
            {showAIModal && (
                <AIExtractionModal
                    onExtracted={handleAIExtraction}
                    onCancel={() => setShowAIModal(false)}
                />
            )}
        </div>
    );
}
