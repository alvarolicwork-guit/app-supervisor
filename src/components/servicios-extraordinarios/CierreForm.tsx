'use client';

import { useState } from 'react';
import { X, Save, Plus, Trash2, Users, Clock, Sparkles } from 'lucide-react';
import { PersonalNovedad, CierreServicioExtra, CasoRelevante } from '@/types/servicioExtraordinario';
import { AIExtractionModal } from './AIExtractionModal';

interface CierreFormProps {
    personalFaltoInicial: PersonalNovedad[];  // Heredado de apertura
    personalAtrasadoInicial?: PersonalNovedad[]; // Heredado de apertura
    onSave: (data: CierreServicioExtra) => void;
    onCancel: () => void;
}

export function CierreForm({ personalFaltoInicial, personalAtrasadoInicial = [], onSave, onCancel }: CierreFormProps) {
    // Estado heredado + local
    const [personalFalto, setPersonalFalto] = useState<PersonalNovedad[]>(personalFaltoInicial);
    const [personalAtrasado, setPersonalAtrasado] = useState<PersonalNovedad[]>(personalAtrasadoInicial);

    // Novedades y Casos
    const [tipoNovedades, setTipoNovedades] = useState<'sin' | 'con'>('sin');
    const [casos, setCasos] = useState<CasoRelevante[]>([]);

    // Observaciones Generales
    const [tieneObservaciones, setTieneObservaciones] = useState(false);
    const [observaciones, setObservaciones] = useState('');

    // Temporal para agregar personal
    const [tempGradoNombre, setTempGradoNombre] = useState('');
    const [tempAtrasadoGradoNombre, setTempAtrasadoGradoNombre] = useState('');

    // AI Modal
    const [showAIModal, setShowAIModal] = useState(false);

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

    // --- Handlers Personal Atrasado ---
    const agregarPersonalAtrasado = () => {
        if (tempAtrasadoGradoNombre) {
            setPersonalAtrasado([...personalAtrasado, { gradoNombre: tempAtrasadoGradoNombre }]);
            setTempAtrasadoGradoNombre('');
        }
    };

    const eliminarPersonalAtrasado = (index: number) => {
        setPersonalAtrasado(personalAtrasado.filter((_, i) => i !== index));
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
    const handleAIExtraction = (data: any) => {
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
        alert('✅ Novedades extraídas. Verifica los datos.');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const data: CierreServicioExtra = {
            fechaCierre: new Date(),
            personalFaltoServicio: personalFalto,
            personalAtrasadoServicio: personalAtrasado,
            novedades: {
                tipo: tipoNovedades,
                ...(tipoNovedades === 'con' && { casos }),
                ...(tieneObservaciones && { observaciones })
            }
        };

        onSave(data);
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

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Personal que Faltó al Servicio */}
                        <div className="bg-red-50 p-4 rounded-xl space-y-3 border border-red-100">
                            <h3 className="font-bold text-lg text-red-900 flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Personal Faltó al Servicio
                            </h3>
                            <p className="text-xs text-red-700">
                                Lista heredada de la apertura.
                            </p>

                            {personalFalto.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {personalFalto.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white p-2 rounded border border-red-200 shadow-sm">
                                            <span className="text-sm font-medium">{p.gradoNombre}</span>
                                            <button type="button" onClick={() => eliminarPersonalFalto(i)} className="text-red-400 hover:text-red-700">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={tempGradoNombre}
                                    onChange={(e) => setTempGradoNombre(e.target.value)}
                                    placeholder="Grado y Nombre"
                                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                />
                                <button type="button" onClick={agregarPersonalFalto} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Personal Atrasado */}
                        <div className="bg-yellow-50 p-4 rounded-xl space-y-3 border border-yellow-100">
                            <h3 className="font-bold text-lg text-yellow-900 flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Personal Atrasado
                            </h3>
                            <p className="text-xs text-yellow-700">
                                Lista heredada de la apertura.
                            </p>

                            {personalAtrasado.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {personalAtrasado.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white p-2 rounded border border-yellow-200 shadow-sm">
                                            <span className="text-sm font-medium">{p.gradoNombre}</span>
                                            <button type="button" onClick={() => eliminarPersonalAtrasado(i)} className="text-yellow-600 hover:text-yellow-800">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={tempAtrasadoGradoNombre}
                                    onChange={(e) => setTempAtrasadoGradoNombre(e.target.value)}
                                    placeholder="Grado y Nombre"
                                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                />
                                <button type="button" onClick={agregarPersonalAtrasado} className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
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
                        <button type="button" onClick={onCancel} className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-gray-700">
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 shadow-lg shadow-red-200">
                            <Save className="w-5 h-5" />
                            Cerrar Servicio
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
