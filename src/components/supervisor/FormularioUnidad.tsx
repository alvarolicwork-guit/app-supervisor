'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ClipboardPaste, Users, AlertTriangle, FileText, MapPin, Clock, UserCheck, X, CheckCircle2, Minus, Plus } from 'lucide-react';
import { extraerDatosCasoAction } from '@/app/actions';

interface FormularioUnidadProps {
    nombreUnidad: string;
    unidadId?: string;
    soloLectura?: boolean;
    onSave: (data: any) => void;
    onCancel: () => void;
}

type NovedadPersonal = 'sin' | 'con';
type TipoNovedadPersonal = 'faltante' | 'abandono' | 'arresto' | 'permiso' | null;

interface CasoRelevante {
    id: string;
    tipo: string;
    hora: string;
    lugar: string;
    encargado: string;
    detalle: string;
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
            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1 w-full sm:w-fit shadow-sm">
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
                    className="w-16 text-center bg-transparent font-bold text-gray-900 border-none outline-none focus:ring-0 text-lg mx-1"
                />
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={value >= max}
                    className="w-10 h-10 flex items-center justify-center bg-emerald-600 rounded-lg text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export function FormularioUnidad({ nombreUnidad, unidadId, soloLectura = false, onSave, onCancel }: FormularioUnidadProps) {
    // --- Estado Fecha y Hora ---
    const [fechaControl, setFechaControl] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });

    // --- Estados de Personal ---
    const [cantPersonal, setCantPersonal] = useState(0);
    const [novPersonal, setNovPersonal] = useState<NovedadPersonal>('sin');
    const [faltantes, setFaltantes] = useState<string[]>([]);
    const [abandono, setAbandono] = useState<string[]>([]);
    const [arrestados, setArrestados] = useState<string[]>([]);
    const [permisos, setPermisos] = useState<string[]>([]);
    const [tempNombre, setTempNombre] = useState('');
    const [tipoAgregando, setTipoAgregando] = useState<TipoNovedadPersonal>(null);

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

    // --- Funciones Personal ---
    function addPersonalList() {
        if (!tempNombre.trim()) return;
        if (tipoAgregando === 'faltante') setFaltantes(p => [...p, tempNombre]);
        if (tipoAgregando === 'abandono') setAbandono(p => [...p, tempNombre]);
        if (tipoAgregando === 'arresto') setArrestados(p => [...p, tempNombre]);
        if (tipoAgregando === 'permiso') setPermisos(p => [...p, tempNombre]);
        setTempNombre('');
    }

    // --- Funciones Casos ---
    function handleSaveCase() {
        if (!newCase.tipo || !newCase.detalle) {
            alert('Debe ingresar al menos Tipo y Detalle del caso.');
            return;
        }
        setCasosRelevantes(prev => [...prev, { ...newCase, id: Math.random().toString(36).substring(7) }]);
        setNewCase({ tipo: '', hora: '', lugar: '', encargado: '', detalle: '' });
        setIsAddingCase(false);
    }

    // --- Funciones IA ---
    async function handleAiExtraction() {
        if (!aiText.trim()) return;
        setIsAiProcessing(true);
        try {
            const data = await extraerDatosCasoAction(aiText) as any;
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
            alert('Error al extraer datos. Intente verificar su conexión.');
        } finally {
            setIsAiProcessing(false);
        }
    }

    function handleSave() {
        if (isPenal) {
            onSave({
                unidad: nombreUnidad,
                fechaHoraControl: fechaControl,
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

        onSave({
            unidad: nombreUnidad,
            fechaHoraControl: fechaControl,
            personal: { cantidad: cantPersonal, estado: novPersonal, detalles: { faltantes, abandono, arrestados, permisos } },
            servicio: { rutina: casosRutina, relevantes: casosRelevantes }
        });
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-emerald-900 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg">Registro: {nombreUnidad}</h3>
                <button onClick={onCancel} className="text-emerald-200 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">

                {/* SECCIÓN SUPERIOR: DATOS GENERALES (Compact layout) */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-emerald-700" />
                        <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Datos Generales del Control</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8 items-start">
                        {/* 1. FECHA */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fecha y Hora</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-white border border-gray-200 rounded-xl p-2 text-sm text-gray-700 font-mono shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={fechaControl}
                                onChange={e => setFechaControl(e.target.value)}
                            />
                        </div>

                        {/* 2. EFECTIVOS */}
                        <div className="md:border-l md:pl-6 border-gray-200">
                            <NumberStepper
                                label="Efectivos de Servicio"
                                value={cantPersonal}
                                onChange={setCantPersonal}
                            />
                        </div>

                        {/* 3. CASOS RUTINA / PPL (Dependiendo tipo unidad) */}
                        <div className="md:border-l md:pl-6 border-gray-200">
                            {isPenal ? (
                                <div className="p-2 bg-orange-50 rounded-lg border border-orange-100 text-center">
                                    <span className="block text-xs font-bold text-orange-800 uppercase mb-1">Total PPL</span>
                                    <span className="text-2xl font-bold text-orange-600">{pplVarones + pplMujeres}</span>
                                </div>
                            ) : (
                                <NumberStepper
                                    label="Casos Rutinarios"
                                    value={casosRutina}
                                    onChange={setCasosRutina}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: ESTADO PERSONAL */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-600" />
                            <h4 className="font-bold text-gray-700 text-xs uppercase">Novedades del Personal</h4>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex bg-gray-50 rounded-lg p-1 border">
                            <button
                                onClick={() => setNovPersonal('sin')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${novPersonal === 'sin' ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Sin Novedad
                            </button>
                            <button
                                onClick={() => setNovPersonal('con')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${novPersonal === 'con' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Con Novedad
                            </button>
                        </div>

                        {/* Resumen rápido si hay novedades */}
                        {novPersonal === 'con' && (
                            <span className="text-xs text-red-500 italic bg-red-50 px-2 py-1 rounded">
                                {faltantes.length + abandono.length + arrestados.length + permisos.length} reg.
                            </span>
                        )}
                    </div>

                    {novPersonal === 'con' && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                            <div className="flex gap-2 border-b border-gray-100 pb-2 mb-3 overflow-x-auto">
                                <button onClick={() => setTipoAgregando('faltante')} className={`whitespace-nowrap px-3 py-1 text-xs font-bold rounded-full transition-colors ${tipoAgregando === 'faltante' ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'}`}>Faltantes</button>
                                <button onClick={() => setTipoAgregando('abandono')} className={`whitespace-nowrap px-3 py-1 text-xs font-bold rounded-full transition-colors ${tipoAgregando === 'abandono' ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50'}`}>Abandono</button>
                                <button onClick={() => setTipoAgregando('arresto')} className={`whitespace-nowrap px-3 py-1 text-xs font-bold rounded-full transition-colors ${tipoAgregando === 'arresto' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Arrestados</button>
                                <button onClick={() => setTipoAgregando('permiso')} className={`whitespace-nowrap px-3 py-1 text-xs font-bold rounded-full transition-colors ${tipoAgregando === 'permiso' ? 'bg-yellow-500 text-white' : 'bg-white text-yellow-600 border border-yellow-200 hover:bg-yellow-50'}`}>Permiso</button>
                            </div>

                            {tipoAgregando && (
                                <div className="flex gap-2 mb-3">
                                    <input
                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 outline-none"
                                        placeholder={`Nombre del personal (${tipoAgregando})...`}
                                        value={tempNombre}
                                        onChange={e => setTempNombre(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addPersonalList()}
                                    />
                                    <button onClick={addPersonalList} className="bg-gray-900 text-white px-4 rounded-lg text-sm font-bold shadow-md hover:bg-black active:scale-95 transition-transform">+</button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {faltantes.map((n, i) => <div key={i} className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded-lg border border-red-100 text-xs font-bold"><span className="uppercase">Falta: {n}</span><button onClick={() => setFaltantes(p => p.filter(x => x !== n))} className="hover:text-red-900">×</button></div>)}
                                {abandono.map((n, i) => <div key={i} className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-lg border border-orange-100 text-xs font-bold"><span className="uppercase">Abandono: {n}</span><button onClick={() => setAbandono(p => p.filter(x => x !== n))} className="hover:text-orange-900">×</button></div>)}
                                {arrestados.map((n, i) => <div key={i} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg border border-gray-200 text-xs font-bold"><span className="uppercase">Arresto: {n}</span><button onClick={() => setArrestados(p => p.filter(x => x !== n))} className="hover:text-gray-900">×</button></div>)}
                                {permisos.map((n, i) => <div key={i} className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg border border-yellow-100 text-xs font-bold"><span className="uppercase">Permiso: {n}</span><button onClick={() => setPermisos(p => p.filter(x => x !== n))} className="hover:text-yellow-900">×</button></div>)}
                            </div>
                        </div>
                    )}
                </div>

                {/* SECCIÓN 3: PPL DETALLE (Solo Penal) */}
                {isPenal && (
                    <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 shadow-sm animate-in fade-in">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-orange-600" />
                            <h4 className="font-bold text-gray-800 text-xs uppercase">Detalle Población Penal</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <NumberStepper label="Varones" value={pplVarones} onChange={setPplVarones} />
                            <NumberStepper label="Mujeres" value={pplMujeres} onChange={setPplMujeres} />
                            <NumberStepper label="Det. Domiciliaria" value={pplDetencion} onChange={setPplDetencion} />
                        </div>
                        <div className="mt-4">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Novedades (Texto)</label>
                            <textarea
                                className="w-full bg-white border border-orange-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-200 outline-none"
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
                    <div className="bg-indigo-50/30 rounded-xl border border-indigo-100 p-4 shadow-sm">
                        <div className="flex justify-between items-end mb-4 border-b border-indigo-100 pb-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-indigo-600" />
                                <h4 className="font-bold text-gray-800 text-xs uppercase">Casos de Relevancia</h4>
                            </div>
                            {!isAddingCase && (
                                <div className="flex gap-2 scale-90 origin-right">
                                    <button onClick={() => setShowAiModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 transition-all shadow-sm">
                                        <Sparkles className="w-3.5 h-3.5" /> IA / WhatsApp
                                    </button>
                                    <button onClick={() => setIsAddingCase(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md">
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
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Hora</label>
                                        <input type="time" className="w-full border rounded-lg p-2 text-sm bg-gray-50" value={newCase.hora} onChange={e => setNewCase({ ...newCase, hora: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo</label>
                                        <input type="text" className="w-full border rounded-lg p-2 text-sm bg-gray-50" placeholder="Tipología..." value={newCase.tipo} onChange={e => setNewCase({ ...newCase, tipo: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="Lugar..." value={newCase.lugar} onChange={e => setNewCase({ ...newCase, lugar: e.target.value })} />
                                    <input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="Encargado..." value={newCase.encargado} onChange={e => setNewCase({ ...newCase, encargado: e.target.value })} />
                                </div>
                                <textarea className="w-full border rounded-lg p-2 text-sm mb-3 h-20 resize-none" placeholder="Detalle..." value={newCase.detalle} onChange={e => setNewCase({ ...newCase, detalle: e.target.value })} />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setIsAddingCase(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                                    <button onClick={handleSaveCase} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded font-bold">Guardar</button>
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

            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200">Cancelar</button>
                <button
                    onClick={handleSave}
                    disabled={soloLectura}
                    className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-bold shadow-lg hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {soloLectura ? 'Solo Lectura' : 'Guardar Registro'}
                </button>
            </div>
            {/* MODAL IA */}
            {showAiModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                        <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
                            <Sparkles className="text-purple-600" /> Extracción Inteligente
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">Pegue el reporte de WhatsApp y la IA completará las casillas automáticamente.</p>
                        <textarea className="w-full h-40 border rounded-xl p-3 text-xs font-mono bg-gray-50 focus:ring-2 focus:ring-purple-500 outline-none resize-none" placeholder={`PEGA AQUÍ EL TEXTO...`} value={aiText} onChange={e => setAiText(e.target.value)} />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setShowAiModal(false)} className="px-4 py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={handleAiExtraction} disabled={isAiProcessing || !aiText.trim()} className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                                {isAiProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : <ClipboardPaste className="w-4 h-4" />} Autocompletar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
