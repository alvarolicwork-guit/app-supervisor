'use client';

import { useState } from 'react';
import { X, Save, Plus, Trash2, Users, Clock, Sparkles, Check } from 'lucide-react';
import { PersonalNovedad, CierreServicioExtra, CasoRelevante, AperturaServicioExtra } from '@/types/servicioExtraordinario';
import { AIExtractionModal } from './AIExtractionModal';
import { InlineAlert, type InlineAlertData } from '@/components/ui/InlineAlert';

type AIExtractionData = Partial<AperturaServicioExtra> & {
    casosRelevantes?: CasoRelevante[];
    casos?: CasoRelevante[];
    observaciones?: string;
};

interface CierreFormProps {
    personalFaltoInicial: PersonalNovedad[];  // Heredado de apertura
    onSave: (data: CierreServicioExtra) => void;
    onCancel: () => void;
}

export function CierreForm({ personalFaltoInicial, onSave, onCancel }: CierreFormProps) {
    // Separar personal que ya se incorporó de los que siguen faltando
    const atrasados = personalFaltoInicial.filter(p => !!p.horaIncorporacion);
    const faltasIniciales = personalFaltoInicial.filter(p => !p.horaIncorporacion);

    // Estado para personal que finalmente NO se presentó
    const [personalFalto, setPersonalFalto] = useState<PersonalNovedad[]>(faltasIniciales);
    const [personalIncorporadoTarde, setPersonalIncorporadoTarde] = useState<PersonalNovedad[]>(atrasados);
    const [incorporacionTarget, setIncorporacionTarget] = useState<string | null>(null);
    const [incorporacionHora, setIncorporacionHora] = useState('');

    // Novedades y Casos
    const [tipoNovedades, setTipoNovedades] = useState<'sin' | 'con'>('sin');
    const [casos, setCasos] = useState<CasoRelevante[]>([]);

    // Observaciones Generales
    const [tieneObservaciones, setTieneObservaciones] = useState(false);
    const [observaciones, setObservaciones] = useState('');

    // Temporal para agregar personal
    const [tempGradoNombre, setTempGradoNombre] = useState('');

    // AI Modal
    const [showAIModal, setShowAIModal] = useState(false);
    const [notice, setNotice] = useState<InlineAlertData | null>(null);

    // Temporal para agregar casos
    const [tempTipo, setTempTipo] = useState('');
    const [tempHora, setTempHora] = useState('');
    const [tempLugar, setTempLugar] = useState('');
    const [tempEncargado, setTempEncargado] = useState('');
    const [tempDetalle, setTempDetalle] = useState('');

    // --- Handlers Personal Faltó ---
    const agregarPersonalFalto = () => {
        if (tempGradoNombre) {
            setPersonalFalto([...personalFalto, { gradoNombre: tempGradoNombre }]);
            setTempGradoNombre('');
        }
    };

    const eliminarPersonalFalto = (index: number) => {
        setPersonalFalto(personalFalto.filter((_, i) => i !== index));
    };

    const iniciarIncorporacion = (gradoNombre: string) => {
        setIncorporacionTarget(gradoNombre);
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setIncorporacionHora(`${hh}:${mm}`);
    };

    const confirmarIncorporacion = () => {
        if (!incorporacionTarget || !incorporacionHora) return;

        setPersonalFalto((prev) => prev.filter((p) => p.gradoNombre !== incorporacionTarget));
        setPersonalIncorporadoTarde((prev) => [...prev, { gradoNombre: incorporacionTarget, horaIncorporacion: incorporacionHora }]);
        setIncorporacionTarget(null);
        setIncorporacionHora('');
    };

    const revertirIncorporacion = (gradoNombre: string) => {
        setPersonalIncorporadoTarde((prev) => prev.filter((p) => p.gradoNombre !== gradoNombre));
        setPersonalFalto((prev) => [...prev, { gradoNombre }]);
    };

    // --- Handlers Casos ---
    const agregarCaso = () => {
        if (tempTipo && tempHora && tempLugar && tempDetalle) {
            const nuevoCaso: CasoRelevante = {
                id: Date.now().toString(),
                tipo: tempTipo,
                hora: tempHora,
                lugar: tempLugar,
                encargado: tempEncargado,
                detalle: tempDetalle
            };
            setCasos([...casos, nuevoCaso]);
            setTempTipo('');
            setTempHora('');
            setTempLugar('');
            setTempEncargado('');
            setTempDetalle('');
        }
    };

    const eliminarCaso = (id: string) => {
        setCasos(casos.filter(c => c.id !== id));
    };

    // --- AI Handler ---
    const handleAIExtraction = (data: AIExtractionData) => {
        // La IA devuelve un objeto parcial de Apertura, pero usamos los campos mapeados en el servicio
        // En este caso, aiExtractionService.ts fue actualizado para devolver 'casosRelevantes' en el raw response,
        // pero necesitamos acceder a ello.
        // REVISIÓN: extractFromText devuelve Partial<AperturaServicioExtra>.
        // Necesitamos que devuelva también los casos.
        // Como solución rápida, asumiremos que el usuario copia el texto de las novedades y la IA extrae los casos.

        // HACK: As we modified the service but function return type might strict, 
        // let's assume 'data' might have 'casosRelevantes' if we cast it or if we update the service return type properly.
        // For now, let's look at what 'data' brings.

        // Si data trae casos (necesitamos asegurar esto en el servicio o modal)
        // El modal actualmente tipa data como Partial<AperturaServicioExtra>.
        // Vamos a usar 'any' temporalmente para acceder a propiedades extras si las hubiera, 
        // o mejor, actualizaremos el modal props.

        if (data.casosRelevantes) {
            // Map backend field name to frontend expected structure if needed, or if it matches
            setCasos([...casos, ...data.casosRelevantes]);
            setTipoNovedades('con');
        } else if (data.casos) {
            setCasos([...casos, ...data.casos]);
            setTipoNovedades('con');
        }
        if (data.observaciones) { // Si la IA extrajera observaciones
            setObservaciones(data.observaciones);
            setTieneObservaciones(true);
        }

        setShowAIModal(false);
        setNotice({ type: 'success', message: 'Novedades extraídas. Verifica los datos.' });
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting) return;
        setIsSubmitting(true);

        const data: CierreServicioExtra = {
            fechaCierre: new Date(),
            personalFaltoServicio: personalFalto,
            personalIncorporadoTarde,
            novedades: {
                tipo: tipoNovedades,
                ...(tipoNovedades === 'con' && { casos }),
                ...(tieneObservaciones && { observaciones })
            }
        };

        try {
            await onSave(data);
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
                {/* Header */}
                <div className="bg-red-600 p-6 rounded-t-2xl flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-white">Cierre Servicio Extraordinario</h2>
                    <button onClick={onCancel} className="text-white hover:bg-red-700 p-2 rounded-lg transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

                    {/* Botón IA para Novedades */}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowAIModal(true)}
                            className="text-sm px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-md flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            Auto-completar Novedades con IA
                        </button>
                    </div>
 
                    <div className="max-w-xl mx-auto w-full space-y-6">
                        {/* Personal ATRASADO (Incorporado) */}
                        {personalIncorporadoTarde.length > 0 && (
                            <div className="bg-green-50 p-4 rounded-xl space-y-2 border border-green-100">
                                <h3 className="font-bold text-sm text-green-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Personal que llegó con retraso (Atrasados)
                                </h3>
                                <div className="space-y-1">
                                    {personalIncorporadoTarde.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs text-green-700 bg-white/50 px-2 py-1 rounded">
                                            <div>
                                                <span>{p.gradoNombre}</span>
                                                <span className="font-bold ml-2">Presente a hrs {p.horaIncorporacion}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => revertirIncorporacion(p.gradoNombre)}
                                                className="text-[10px] px-2 py-1 rounded bg-white border border-green-200 hover:bg-green-100"
                                            >
                                                Marcar falta
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Personal que Faltó al Servicio */}
                        <div className="bg-red-50 p-4 rounded-xl space-y-3 border border-red-100">
                            <h3 className="font-bold text-lg text-red-900 flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Faltas Definitivas al Servicio
                            </h3>
                            <p className="text-xs text-red-700 font-medium">
                                Confirme quiénes NO se presentaron en todo el servicio.
                            </p>
 
                            {personalFalto.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {personalFalto.map((p, i) => (
                                        <div key={i} className="bg-white p-2 rounded border border-red-200 shadow-sm space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{p.gradoNombre}</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => iniciarIncorporacion(p.gradoNombre)}
                                                        className="text-[10px] px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                                                    >
                                                        Retirar falta
                                                    </button>
                                                    <button type="button" onClick={() => eliminarPersonalFalto(i)} className="text-red-400 hover:text-red-700">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {incorporacionTarget === p.gradoNombre && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={incorporacionHora}
                                                        onChange={(e) => setIncorporacionHora(e.target.value)}
                                                        className="px-2 py-1 text-xs border border-green-300 rounded"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={confirmarIncorporacion}
                                                        className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-700 text-white hover:bg-green-800"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                        Confirmar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIncorporacionTarget(null)}
                                                        className="text-[10px] px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
 
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={tempGradoNombre}
                                    onChange={(e) => setTempGradoNombre(e.target.value)}
                                    placeholder="Agregar grado y nombre..."
                                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                />
                                <button type="button" onClick={agregarPersonalFalto} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Novedades del Servicio */}
                    <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-200">
                        <h3 className="font-bold text-lg text-gray-900">📋 Novedades del Servicio</h3>

                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${tipoNovedades === 'sin' ? 'border-green-500' : 'border-gray-400'}`}>
                                    {tipoNovedades === 'sin' && <div className="w-3 h-3 rounded-full bg-green-500" />}
                                </div>
                                <input type="radio" name="novedades" value="sin" checked={tipoNovedades === 'sin'} onChange={() => setTipoNovedades('sin')} className="hidden" />
                                <span className={`font-medium ${tipoNovedades === 'sin' ? 'text-green-700' : 'text-gray-600'}`}>Sin Novedad</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${tipoNovedades === 'con' ? 'border-blue-500' : 'border-gray-400'}`}>
                                    {tipoNovedades === 'con' && <div className="w-3 h-3 rounded-full bg-blue-500" />}
                                </div>
                                <input type="radio" name="novedades" value="con" checked={tipoNovedades === 'con'} onChange={() => setTipoNovedades('con')} className="hidden" />
                                <span className={`font-medium ${tipoNovedades === 'con' ? 'text-blue-700' : 'text-gray-600'}`}>Con Novedad</span>
                            </label>
                        </div>

                        {tipoNovedades === 'con' && (
                            <div className="space-y-4 mt-4 animate-in slide-in-from-top-2 fade-in">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <h4 className="font-bold text-blue-900 mb-3 text-sm">Registro de Casos Relevantes</h4>

                                    {casos.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            {casos.map((caso) => (
                                                <div key={caso.id} className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div>
                                                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mb-1">{caso.tipo}</span>
                                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> {caso.hora} | {caso.lugar}
                                                            </p>
                                                        </div>
                                                        <button onClick={() => eliminarCaso(caso.id)} className="text-gray-400 hover:text-red-500">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-gray-800 mt-1 line-clamp-2">{caso.detalle}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <input type="text" value={tempTipo} onChange={(e) => setTempTipo(e.target.value)} placeholder="Tipo (Ej. Riña)" className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                                        <input type="time" value={tempHora} onChange={(e) => setTempHora(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                                        <input type="text" value={tempLugar} onChange={(e) => setTempLugar(e.target.value)} placeholder="Lugar" className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                                        <input type="text" value={tempEncargado} onChange={(e) => setTempEncargado(e.target.value)} placeholder="Encargado (Opcional)" className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <textarea value={tempDetalle} onChange={(e) => setTempDetalle(e.target.value)} placeholder="Detalle del hecho..." className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-3" rows={2} />
                                    <button type="button" onClick={agregarCaso} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                        Agregar Caso
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Observaciones Generales */}
                        <div className="pt-2">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={tieneObservaciones}
                                    onChange={(e) => setTieneObservaciones(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 rounded"
                                />
                                <span className="font-bold text-gray-700">Observaciones Generales</span>
                            </label>

                            {tieneObservaciones && (
                                <div className="animate-in slide-in-from-top-1 fade-in">
                                    <textarea
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value.slice(0, 100))}
                                        placeholder="Escriba aquí alguna observación adicional (Máx 100 caracteres)..."
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-purple-50"
                                        rows={2}
                                        maxLength={100}
                                    />
                                    <div className="text-right text-xs text-gray-400 mt-1">
                                        {observaciones.length}/100
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 shadow-lg shadow-red-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Cerrando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Cerrar Servicio
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            {showAIModal && (
                <AIExtractionModal
                    onCancel={() => setShowAIModal(false)}
                    onExtracted={handleAIExtraction}
                />
            )}
        </div>
    );
}
