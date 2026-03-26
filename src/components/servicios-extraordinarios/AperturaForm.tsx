'use client';

import { useState, useEffect } from 'react';
import { X, Save, Plus, Sparkles, Trash2, Minus } from 'lucide-react';
import { PersonalNovedad, AperturaServicioExtra, ObservacionUniforme } from '@/types/servicioExtraordinario';
import { useAuth } from '@/context/AuthContext';
import { AIExtractionModal } from './AIExtractionModal';
import { InlineAlert, type InlineAlertData } from '@/components/ui/InlineAlert';

interface AperturaFormProps {
    onSave: (data: AperturaServicioExtra) => void;
    onCancel: () => void;
    tipoUsuario?: 'supervisor' | 'jefe';
}

// Componente Local de Stepper Numérico
const NumberStepper = ({ label, value, onChange, min = 0, max = 999 }: { label: string, value: number, onChange: (val: number) => void, min?: number, max?: number }) => {
    const handleIncrement = () => {
        if (value < max) onChange(value + 1);
    };

    const handleDecrement = () => {
        if (value > min) onChange(value - 1);
    };

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1 w-full shadow-sm">
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={value <= min}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-600 shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                    <Minus className="w-4 h-4" />
                </button>
                <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={value}
                    onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        if (val >= min && val <= max) onChange(val);
                    }}
                    className="w-full text-center bg-transparent font-bold text-gray-900 border-none outline-none focus:ring-0 text-lg mx-1"
                />
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={value >= max}
                    className="w-10 h-10 flex items-center justify-center bg-blue-600 rounded-lg text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export function AperturaForm({ onSave, onCancel, tipoUsuario = 'supervisor' }: AperturaFormProps) {
    // Obtener supervisor actual desde AuthContext
    const { userProfile } = useAuth();
    
    const nombreCompletoActual = userProfile
        ? `${userProfile.grado || ''} ${userProfile.nombreCompleto || ''}`.trim()
        : '';

    // Plan de Operaciones
    const [nroPlan, setNroPlan] = useState('');
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

    // Handler para auto-fill desde IA
    const handleAIExtraction = (data: Partial<AperturaServicioExtra>) => {
        // ... (rest of the code remains the same as before until render) ...
        // Auto-llenar campos del plan
        if (data.nroPlanOperaciones) setNroPlan(data.nroPlanOperaciones);
        if (data.tipoServicio) setTipoServicio(data.tipoServicio);
            if (data.personalContemplado) setPersonalContemplado(data.personalContemplado.toString());
            if (data.motosContempladas) setMotosContempladas(data.motosContempladas.toString());
            if (data.vehiculosContemplados) setVehiculosContemplados(data.vehiculosContemplados.toString());
            if (data.supervisorGeneral) setSupervisorGeneral(data.supervisorGeneral);
        if (data.jefeOperativo) setJefeOperativo(data.jefeOperativo);
        if (data.lugarFormacion) setLugarFormacion(data.lugarFormacion);
        if (data.horaFormacion) setHoraFormacion(data.horaFormacion);
        if (data.horaInstalacion) setHoraInstalacion(data.horaInstalacion);
        if (data.tareas) setTareas(data.tareas);

        // Auto-llenar novedades de formación
        if (data.novedadesFormacion) {
            if (data.novedadesFormacion.personalFormo) {
                setPersonalFormo(data.novedadesFormacion.personalFormo.toString());
            }
            if (data.novedadesFormacion.personalFalto) {
                setPersonalFaltoCantidad(data.novedadesFormacion.personalFalto.cantidad.toString());
                setPersonalFaltoLista(data.novedadesFormacion.personalFalto.lista);
            }
            if (data.novedadesFormacion.personalPermiso) {
                setPersonalPermisoCantidad(data.novedadesFormacion.personalPermiso.cantidad.toString());
                setPersonalPermisoLista(data.novedadesFormacion.personalPermiso.lista);
            }
            if (data.novedadesFormacion.observacionesUniforme && data.novedadesFormacion.observacionesUniforme.length > 0) {
                setTieneNovedadesUniforme(true);
                setObservacionesUniforme(data.novedadesFormacion.observacionesUniforme);
            }
        }

        // Cerrar modal y mostrar éxito
        setShowAIModal(false);
        setNotice({ type: 'success', message: 'Información extraída correctamente. Revisa y completa los campos.' });
    };

    const agregarPersonalFalto = () => {
        if (tempGradoNombreFalto) {
            const nuevaLista = [...personalFaltoLista, { gradoNombre: tempGradoNombreFalto }];
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
            const nuevaLista = [...personalPermisoLista, { gradoNombre: tempGradoNombrePermiso }];
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
                gradoNombre: obsGradoNombre,
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
            finalFaltoLista.push({ gradoNombre: tempGradoNombreFalto.trim() });
            if (finalFaltoCantidad < finalFaltoLista.length) {
                finalFaltoCantidad = finalFaltoLista.length;
            }
        }

        let finalPermisoLista = [...personalPermisoLista];
        let finalPermisoCantidad = parseInt(personalPermisoCantidad) || 0;
        if (tempGradoNombrePermiso.trim()) {
            finalPermisoLista.push({ gradoNombre: tempGradoNombrePermiso.trim() });
            if (finalPermisoCantidad < finalPermisoLista.length) {
                finalPermisoCantidad = finalPermisoLista.length;
            }
        }

        setIsSubmitting(true);

        const data: AperturaServicioExtra = {
            nroPlanOperaciones: nroPlan,
            tipoServicio,
            personalContemplado: parseInt(personalContemplado) || 0,
            motosContempladas: parseInt(motosContempladas) || 0,
            vehiculosContemplados: parseInt(vehiculosContemplados) || 0,
            supervisorGeneral,
            jefeOperativo,
            lugarFormacion,
            horaFormacion,
            horaInstalacion,
            tareas,
            fechaApertura: new Date(),
            novedadesFormacion: {
                personalFormo: parseInt(personalFormo),
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
                <div className="bg-blue-600 p-4 sm:p-6 rounded-t-2xl flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-base sm:text-xl font-bold text-white pr-2">Apertura Servicio Extraordinario</h2>
                    <button onClick={onCancel} className="text-white hover:bg-blue-700 p-2 rounded-lg transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto">
                    {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

                    {/* AI Auto-complete Button */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="w-5 h-5 text-purple-600" />
                                    <h3 className="font-bold text-gray-900">Auto-completar con IA</h3>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Extrae información automáticamente desde WhatsApp, PDF o foto
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAIModal(true)}
                                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-5 h-5" />
                                Usar IA
                            </button>
                        </div>
                    </div>

                    {/* Plan de Operaciones */}
                    <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                        <h3 className="font-bold text-lg text-gray-900">📑 Plan de Operaciones</h3>
 
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">N° de Orden de Operaciones *</label>
                                <input
                                    type="text"
                                    value={nroPlan}
                                    onChange={(e) => setNroPlan(e.target.value)}
                                    placeholder="301/2026"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor General *</label>
                            <input
                                type="text"
                                value={supervisorGeneral}
                                onChange={(e) => setSupervisorGeneral(e.target.value)}
                                placeholder="Tcnl. DEAP Alberto Suarez Plata"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jefe Operativo *</label>
                            <input
                                type="text"
                                value={jefeOperativo}
                                onChange={(e) => setJefeOperativo(e.target.value)}
                                placeholder="Tcnl. DEAP Alberto Suarez Plata"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar Formación *</label>
                                <input
                                    type="text"
                                    value={lugarFormacion}
                                    onChange={(e) => setLugarFormacion(e.target.value)}
                                    placeholder="Multipropósito"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Formación *</label>
                                <input
                                    type="time"
                                    value={horaFormacion}
                                    onChange={(e) => setHoraFormacion(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Instalación *</label>
                                <input
                                    type="time"
                                    value={horaInstalacion}
                                    onChange={(e) => setHoraInstalacion(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px] text-sm"
                                maxLength={500}
                            />
                            <p className="text-right text-[10px] text-gray-500 mt-1">
                                {tareas.length} / 500 caracteres
                            </p>
                        </div>
                    </div>

                    {/* Novedades de Formación */}
                    <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                        <h3 className="font-bold text-lg text-gray-900">👥 Novedades de Formación</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        className="flex-1 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), agregarPersonalFalto())}
                                    />
                                    <button type="button" onClick={agregarPersonalFalto} className="w-full sm:w-auto px-3 py-2 sm:py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors shadow-sm">
                                        <Plus className="w-4 h-4" />
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
                                        className="flex-1 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), agregarPersonalPermiso())}
                                    />
                                    <button type="button" onClick={agregarPersonalPermiso} className="w-full sm:w-auto px-3 py-2 sm:py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors shadow-sm">
                                        <Plus className="w-4 h-4" />
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
                    <div className="bg-gray-50 p-4 rounded-xl space-y-4">
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
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Observación</label>
                                        <select
                                            value={obsTipo}
                                            onChange={(e) => setObsTipo(e.target.value as ObservacionUniforme['tipo'])}
                                            className="w-full px-2 py-2 border rounded-lg text-sm"
                                        >
                                            <option value="Incorrecto">1. Uniforme incorrecto</option>
                                            <option value="Sucio/Desarreglado">2. Uniforme sucio y desarreglado</option>
                                            <option value="Incompleto">3. Sin implemento o balero Completo</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={agregarObservacion}
                                        className="w-full md:w-auto px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition-colors"
                                    >
                                        <Plus className="w-5 h-5" />
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
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
