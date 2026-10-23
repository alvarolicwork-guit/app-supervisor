'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ClipboardPaste, Users, AlertTriangle, FileText } from 'lucide-react';
import { extraerDatosCasoAction } from '@/app/actions';
import { InlineAlert, type InlineAlertData } from '@/components/ui/InlineAlert';
import { NumberStepper } from '@/components/ui/NumberStepper';
import {
    PersonasNovedad,
    type NovedadesPersonal,
} from '@/components/ui/PersonasNovedad';
import { useAuth } from '@/context/AuthContext';
import { normalizarNombre } from '@/utils/text';
import type { DatosUnidadRegistrada } from './ResumenTurno';

interface FormularioUnidadProps {
    nombreUnidad: string;
    unidadId?: string;
    soloLectura?: boolean;
    onSave: (data: DatosUnidadRegistrada) => void;
    onCancel: () => void;
}

type NovedadPersonal = 'sin' | 'con';

interface CasoRelevante {
    id: string;
    tipo: string;
    hora: string;
    lugar: string;
    encargado: string;
    detalle: string;
}

export function FormularioUnidad({ nombreUnidad, unidadId, soloLectura = false, onSave, onCancel }: FormularioUnidadProps) {
    const { user } = useAuth();

    // --- Estado Fecha y Hora ---
    const [fechaControl, setFechaControl] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });

    // --- Estado Jefe de Seguridad ---
    const [jefeSeguridad, setJefeSeguridad] = useState('');

    // --- Estados de Personal ---
    const [cantPersonal, setCantPersonal] = useState(0);
    const [novPersonal, setNovPersonal] = useState<NovedadPersonal>('sin');
    const [faltantes, setFaltantes] = useState<string[]>([]);
    const [abandono, setAbandono] = useState<string[]>([]);
    const [arrestados, setArrestados] = useState<string[]>([]);
    const [permisos, setPermisos] = useState<string[]>([]);

    // --- Estados de Servicio ---
    const [casosRutina, setCasosRutina] = useState(0);
    const [casosRelevantes, setCasosRelevantes] = useState<CasoRelevante[]>([]);

    // --- Estados Penal (San Roque) ---
    const [pplVarones, setPplVarones] = useState(0);
    const [pplMujeres, setPplMujeres] = useState(0);
    const [pplDetencion, setPplDetencion] = useState(0);
    const [novedadesTexto, setNovedadesTexto] = useState('');

    const isPenal = unidadId?.includes('PENITENCIARIO') || unidadId?.includes('RECINTO') || nombreUnidad.includes('PENITENCIARIO') || nombreUnidad.includes('Recinto Penitenciario');

    // --- Estado Editor de Caso Manual/IA ---
    const [isAddingCase, setIsAddingCase] = useState(false);
    const [newCase, setNewCase] = useState<Omit<CasoRelevante, 'id'>>({
        tipo: '', hora: '', lugar: '', encargado: '', detalle: ''
    });

    // Estado para el modal IA
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiText, setAiText] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notice, setNotice] = useState<InlineAlertData | null>(null);

    const novedadesPersonal: NovedadesPersonal = {
        faltantes,
        abandono,
        arrestados,
        permisos,
    };

    const actualizarNovedades = (next: NovedadesPersonal) => {
        setFaltantes(next.faltantes);
        setAbandono(next.abandono);
        setArrestados(next.arrestados);
        setPermisos(next.permisos);
    };

    // --- Funciones Casos ---
    function handleSaveCase() {
        if (!newCase.tipo || !newCase.detalle) {
            setNotice({ type: 'error', message: 'Debe ingresar al menos tipo y detalle del caso.' });
            return;
        }
        setCasosRelevantes(prev => [
            ...prev,
            {
                ...newCase,
                encargado: normalizarNombre(newCase.encargado),
                id: Math.random().toString(36).substring(7),
            },
        ]);
        setNewCase({ tipo: '', hora: '', lugar: '', encargado: '', detalle: '' });
        setIsAddingCase(false);
    }

    // --- Funciones IA ---
    async function handleAiExtraction() {
        if (!aiText.trim()) return;
        setIsAiProcessing(true);
        try {
            const idToken = await user?.getIdToken();
            if (!idToken) {
                setNotice({ type: 'error', message: 'Sesión no válida. Vuelve a iniciar sesión.' });
                return;
            }

            const data = await extraerDatosCasoAction(idToken, aiText);
            if (data) {
                // Autocompletar el formulario de nuevo caso
                setNewCase({
                    tipo: data.tipo || 'Sin especificar',
                    hora: data.hora || '',
                    lugar: data.lugar || '',
                    encargado: data.encargado || '',
                    detalle: data.detalle || ''
                });
                setIsAddingCase(true); // Abrir el editor si no estaba abierto
            } else {
                throw new Error('Datos incompletos');
            }
            setAiText('');
            setShowAiModal(false);
        } catch (e) {
            console.error(e);
            setNotice({ type: 'error', message: 'Error al extraer datos. Verifica tu conexión e intenta de nuevo.' });
        } finally {
            setIsAiProcessing(false);
        }
    }

    async function handleSave() {
        if (soloLectura || isSubmitting) return;

        setIsSubmitting(true);
        try {
            if (isPenal) {
                await onSave({
                    unidad: nombreUnidad,
                    fechaHoraControl: fechaControl,
                    jefeSeguridad: normalizarNombre(jefeSeguridad),
                    personal: { cantidad: cantPersonal, estado: novPersonal, detalles: { faltantes, abandono, arrestados, permisos } },
                    poblacionPenal: {
                        total: pplVarones + pplMujeres,
                        varones: pplVarones,
                        mujeres: pplMujeres,
                        detencionDomiciliaria: pplDetencion
                    },
                    novedadesTexto: novedadesTexto.trim() || 'Sin novedades registradas.'
                });
                return;
            }

            await onSave({
                unidad: nombreUnidad,
                fechaHoraControl: fechaControl,
                jefeSeguridad: jefeSeguridad.trim(),
                personal: { cantidad: cantPersonal, estado: novPersonal, detalles: { faltantes, abandono, arrestados, permisos } },
                servicio: { rutina: casosRutina, relevantes: casosRelevantes }
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="app-card overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="app-modal-header">
                <h3 className="text-base font-bold">Registro: {nombreUnidad}</h3>
                <button onClick={onCancel} className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Cerrar">
                    ✕
                </button>
            </div>

            <div className="max-h-[80vh] space-y-5 overflow-y-auto p-5">
                {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

                {/* SECCIÓN SUPERIOR: DATOS GENERALES */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <h4 className="app-label">Datos generales del control</h4>
                    </div>

                    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3 lg:gap-8">
                        <div>
                            <label className="app-label">Fecha y hora</label>
                            <input
                                type="datetime-local"
                                className="app-input mt-1.5 font-mono"
                                value={fechaControl}
                                onChange={e => setFechaControl(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="app-label">Jefe de seguridad / Responsable</label>
                            <input
                                type="text"
                                className="app-input mt-1.5"
                                placeholder="Grado y nombre completo"
                                value={jefeSeguridad}
                                onChange={e => setJefeSeguridad(e.target.value)}
                                onBlur={() => setJefeSeguridad((valor) => normalizarNombre(valor))}
                            />
                        </div>

                        <div className="md:border-l md:border-slate-200 md:pl-6">
                            <NumberStepper
                                label="Efectivos de servicio"
                                value={cantPersonal}
                                onChange={setCantPersonal}
                                hint="Personal presente en la unidad."
                            />
                        </div>

                        <div className="md:border-l md:border-slate-200 md:pl-6">
                            {isPenal ? (
                                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-center">
                                    <span className="block text-xs font-bold uppercase text-indigo-700">Total PPL</span>
                                    <span className="text-2xl font-bold text-indigo-900">{pplVarones + pplMujeres}</span>
                                </div>
                            ) : (
                                <NumberStepper
                                    label="Casos rutinarios"
                                    value={casosRutina}
                                    onChange={setCasosRutina}
                                    hint="Casos sin relevancia especial."
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: ESTADO PERSONAL */}
                <div className="app-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-600" />
                        <h4 className="app-label">Novedades del Personal</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <button
                                type="button"
                                onClick={() => setNovPersonal('sin')}
                                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                                    novPersonal === 'sin'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Sin novedad
                            </button>
                            <button
                                type="button"
                                onClick={() => setNovPersonal('con')}
                                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                                    novPersonal === 'con'
                                        ? 'bg-white text-rose-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Con novedad
                            </button>
                        </div>

                        {novPersonal === 'con' && (
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                {novedadesPersonal.faltantes.length +
                                    novedadesPersonal.abandono.length +
                                    novedadesPersonal.arrestados.length +
                                    novedadesPersonal.permisos.length}{' '}
                                registro(s)
                            </span>
                        )}
                    </div>

                    {novPersonal === 'con' && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                            <PersonasNovedad
                                value={novedadesPersonal}
                                onChange={actualizarNovedades}
                                disabled={soloLectura}
                            />
                        </div>
                    )}
                </div>

                {/* SECCIÓN 3: PPL DETALLE (Solo Penal) */}
                {isPenal && (
                    <div className="app-card p-4 animate-in fade-in">
                        <div className="mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4 text-indigo-600" />
                            <h4 className="app-label">Detalle población penal</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <NumberStepper label="Varones" value={pplVarones} onChange={setPplVarones} />
                            <NumberStepper label="Mujeres" value={pplMujeres} onChange={setPplMujeres} />
                            <NumberStepper label="Detención domiciliaria" value={pplDetencion} onChange={setPplDetencion} />
                        </div>
                        <div className="mt-4">
                            <label className="app-label">Novedades (texto)</label>
                            <textarea
                                className="app-input mt-1.5"
                                rows={2}
                                placeholder="Escriba novedades..."
                                value={novedadesTexto}
                                onChange={e => setNovedadesTexto(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* SECCIÓN 4: CASOS RELEVANTES (Solo No Penal) */}
                {!isPenal && (
                    <div className="app-card p-4">
                        <div className="mb-4 flex items-end justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-indigo-600" />
                                <h4 className="app-label">Casos de relevancia</h4>
                            </div>
                            {!isAddingCase && (
                                <div className="flex origin-right scale-90 gap-2">
                                    <button onClick={() => setShowAiModal(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-slate-50">
                                        <Sparkles className="h-3.5 w-3.5" /> IA / WhatsApp
                                    </button>
                                    <button onClick={() => setIsAddingCase(true)} className="app-btn-primary px-3 py-1.5 text-xs">
                                        + Agregar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* EDITOR DE CASO */}
                        {isAddingCase && (
                            <div className="bg-white rounded-xl p-4 border border-indigo-200 animate-in slide-in-from-top-2 shadow-sm mb-4">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="app-label">Hora</label>
                                        <input type="time" className="app-input mt-1" value={newCase.hora} onChange={e => setNewCase({ ...newCase, hora: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="app-label">Tipo</label>
                                        <input type="text" className="app-input mt-1" placeholder="Tipología..." value={newCase.tipo} onChange={e => setNewCase({ ...newCase, tipo: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <input type="text" className="app-input" placeholder="Lugar..." value={newCase.lugar} onChange={e => setNewCase({ ...newCase, lugar: e.target.value })} />
                                    <input type="text" className="app-input" placeholder="Encargado..." value={newCase.encargado} onChange={e => setNewCase({ ...newCase, encargado: e.target.value })} onBlur={() => setNewCase((prev) => ({ ...prev, encargado: normalizarNombre(prev.encargado) }))} />
                                </div>
                                <textarea className="app-input mb-3 h-20 resize-none" placeholder="Detalle..." value={newCase.detalle} onChange={e => setNewCase({ ...newCase, detalle: e.target.value })} />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setIsAddingCase(false)} className="app-btn-secondary px-3 py-1.5 text-xs">Cancelar</button>
                                    <button onClick={handleSaveCase} className="app-btn-primary px-3 py-1.5 text-xs">Guardar</button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {casosRelevantes.map(caso => (
                                <div key={caso.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm relative group hover:border-indigo-300 transition-all">
                                    <button onClick={() => setCasosRelevantes(p => p.filter(c => c.id !== caso.id))} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">×</button>
                                    <div className="flex flex-wrap gap-2 mb-1 items-center">
                                        <span className="font-bold text-indigo-700 text-[10px] uppercase bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{caso.tipo}</span>
                                        <span className="text-gray-400 text-[10px]">{caso.hora}</span>
                                    </div>
                                    <p className="text-gray-700 text-sm line-clamp-2">{caso.detalle}</p>
                                </div>
                            ))}
                            {casosRelevantes.length === 0 && !isAddingCase && (
                                <div className="text-center py-4 text-gray-400 text-xs italic">Sin casos relevantes.</div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
                <button onClick={onCancel} className="app-btn-secondary">Cancelar</button>
                <button
                    onClick={() => void handleSave()}
                    disabled={soloLectura || isSubmitting}
                    className="app-btn-primary"
                >
                    {soloLectura ? 'Solo lectura' : isSubmitting ? 'Guardando...' : 'Guardar registro'}
                </button>
            </div>
            {/* MODAL IA */}
            {showAiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="app-card w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="app-modal-header">
                            <h3 className="flex items-center gap-2 text-base font-bold">
                                <Sparkles className="h-4 w-4" /> Extracción inteligente
                            </h3>
                            <button onClick={() => setShowAiModal(false)} className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Cerrar">
                                ✕
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="mb-3 text-sm text-slate-500">Pega el reporte de WhatsApp y la IA completará las casillas automáticamente.</p>
                            <textarea className="app-input h-40 resize-none font-mono text-xs" placeholder="PEGA AQUÍ EL TEXTO..." value={aiText} onChange={e => setAiText(e.target.value)} />
                            <div className="mt-4 flex justify-end gap-3">
                                <button onClick={() => setShowAiModal(false)} className="app-btn-secondary">Cancelar</button>
                                <button onClick={handleAiExtraction} disabled={isAiProcessing || !aiText.trim()} className="app-btn-primary">
                                    {isAiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPaste className="h-4 w-4" />} Autocompletar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
