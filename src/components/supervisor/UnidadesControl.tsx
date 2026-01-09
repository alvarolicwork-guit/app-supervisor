import { useState, useEffect } from 'react';
import { Building2, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import { FormularioUnidad } from './FormularioUnidad';
import { ResumenTurno, DatosUnidadRegistrada } from './ResumenTurno';
import { useAuth } from '@/context/AuthContext';

type Unidad = {
    id: string;
    nombre: string;
    subUnidades?: { id: string; nombre: string }[];
};

const UNIDADES_FIJAS: Unidad[] = [
    {
        id: 'FELCC',
        nombre: 'FELCC',
        subUnidades: [
            { id: 'FELCC_CENTRAL', nombre: 'FELCC CENTRAL' },
            { id: 'FELCC_VILLA_ARMONIA', nombre: 'FELCC EPI VILLA ARMONÍA' },
            { id: 'FELCC_PATACON', nombre: 'FELCC EPI PATACÓN' },
            { id: 'FELCC_SAN_ROQUE', nombre: 'FELCC EPI SAN ROQUE' },
        ]
    },
    {
        id: 'FELCV',
        nombre: 'FELCV',
        subUnidades: [
            { id: 'FELCV_VILLA_ARMONIA', nombre: 'FELCV EPI VILLA ARMONÍA' },
            { id: 'FELCV_SAN_ROQUE', nombre: 'FELCV EPI SAN ROQUE' },
            { id: 'FELCV_PATACON', nombre: 'FELCV EPI PATACÓN' },
        ]
    },
    { id: 'DIPROVE', nombre: 'DIPROVE' },
    { id: 'INTERPOL', nombre: 'INTERPOL' },
    { id: 'POFOMA', nombre: 'POFOMA' },
    {
        id: 'TRANSITO',
        nombre: 'TRANSITO',
        subUnidades: [
            { id: 'TRANSITO_COMISARIA', nombre: 'COMISARIA' },
            { id: 'TRANSITO_ACCIDENTES', nombre: 'DIVISION ACCIDENTES Y ESPECIALES' },
        ]
    },
    { id: 'BOMBEROS', nombre: 'BOMBEROS' },
    { id: 'UTOP', nombre: 'UTOP' },
    { id: 'DELTA', nombre: 'DELTA' },
    { id: 'PAC', nombre: 'PAC' },
    { id: 'RADIO_PATRULLAS_110', nombre: 'RADIO PATRULLAS 110' },
    { id: 'UTEPII', nombre: 'UTEPII' },
    { id: 'PATRULLA_CAMINERA', nombre: 'PATRULLA CAMINERA' },
    { id: 'POLICIA_RURAL', nombre: 'POLICÍA RURAL Y FRONTERIZA' },
    { id: 'BSFE_1', nombre: 'BSFE N° 1' },
    { id: 'BSFE_2', nombre: 'BSFE N° 2' },
    { id: 'CONCILIACION', nombre: 'CONCILIACIÓN CIUDADANA' },
    { id: 'INTELIGENCIA', nombre: 'INTELIGENCIA' },
    { id: 'EPI_SAN_ROQUE', nombre: 'EPI DE SAN ROQUE' },
    { id: 'EPI_VILLA_ARMONIA', nombre: 'EPI DE VILLA ARMONÍA' },
    { id: 'EPI_PATACON', nombre: 'EPI DE PATACÓN' },
    { id: 'RECAUDACIONES', nombre: 'RECAUDACIONES, GARAJE' },
    { id: 'RECINTO_PENITENCIARIO', nombre: 'RECINTO PENITENCIARIO "SAN ROQUE"' },
    { id: 'COMANDO_DEPARTAMENTAL', nombre: 'COMANDO DEPARTAMENTAL' },
    { id: 'FATESCIPOL', nombre: 'FATESCIPOL' },
];

interface UnidadesControlProps {
    servicioId: string;
    soloLectura?: boolean;
}

export function UnidadesControl({ servicioId, soloLectura = false }: UnidadesControlProps) {
    // Si selectedParent está set, mostramos sus hijos.
    // Si selectedUnidad está set (y es hoja o hijo), mostramos el formulario.
    const [selectedParent, setSelectedParent] = useState<Unidad | null>(null);
    const [selectedUnidad, setSelectedUnidad] = useState<string | null>(null);
    const { user } = useAuth();

    // Estado para el Dashboard (Registros de la sesión actual)
    const [registrosSesion, setRegistrosSesion] = useState<DatosUnidadRegistrada[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            cargarRegistros();
        }
    }, [servicioId, user]);

    const cargarRegistros = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Cargar de Firestore
            const { getServicioActivo } = await import('@/services/servicioSupervisorService');
            const servicio = await getServicioActivo(user.uid);

            if (servicio && servicio.id === servicioId) {
                setRegistrosSesion(servicio.controlInstalaciones || []);
            }
        } catch (error) {
            console.error('Error cargando registros:', error);
        } finally {
            setLoading(false);
        }
    };

    const guardarEnSesion = async (nuevoRegistro: DatosUnidadRegistrada) => {
        // Actualizar estado local inmediatamente
        setRegistrosSesion(prev => [...prev, nuevoRegistro]);

        // Guardar en Firestore
        try {
            const { agregarControlInstalacion } = await import('@/services/servicioSupervisorService');
            await agregarControlInstalacion(servicioId, nuevoRegistro);
        } catch (error) {
            console.error('Error guardando en Firestore:', error);
            throw error;
        }
    };

    const handleParentSelect = (unidad: Unidad) => {
        if (unidad.subUnidades && unidad.subUnidades.length > 0) {
            setSelectedParent(unidad);
        } else {
            // Es una unidad simple, vamos directo al formulario
            setSelectedUnidad(unidad.id);
        }
    };

    const handleChildSelect = (childId: string) => {
        setSelectedUnidad(childId);
    };

    const handleBack = () => {
        setSelectedParent(null);
    };

    const getNombreUnidadSeleccionada = () => {
        if (!selectedUnidad) return '';

        // Buscar en padres simples
        const simple = UNIDADES_FIJAS.find(u => u.id === selectedUnidad);
        if (simple) return simple.nombre;

        // Buscar en hijos
        for (const p of UNIDADES_FIJAS) {
            if (p.subUnidades) {
                const child = p.subUnidades.find(c => c.id === selectedUnidad);
                if (child) return child.nombre;
            }
        }
        return selectedUnidad;
    };

    // 1. Mostrar Formulario si hay unidad seleccionada
    if (selectedUnidad) {
        return (
            <div className="mt-8 pt-2 animate-in slide-in-from-bottom-4 duration-500">
                <FormularioUnidad
                    unidadId={selectedUnidad}
                    nombreUnidad={getNombreUnidadSeleccionada()}
                    soloLectura={soloLectura}
                    onSave={async (data) => {
                        if (soloLectura) return;

                        try {
                            // Guardar en el servicio activo
                            await guardarEnSesion(data);

                            alert(`✅ Registro guardado correctamente.`);
                            setSelectedUnidad(null);
                            setSelectedParent(null); // Reset total al guardar
                        } catch (e: any) {
                            console.error(e);
                            alert(`❌ Error al guardar: ${e.message}`);
                        }
                    }}
                    onCancel={() => setSelectedUnidad(null)}
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="text-center py-20 animate-in fade-in">
                <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-emerald-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-emerald-800 font-bold bg-emerald-50 inline-block px-4 py-1 rounded-full text-sm">Cargando registros...</p>
            </div>
        );
    }

    // CALCULAR TOTAL DE UNIDADES A SUPERVISAR (Total hojas)
    const totalUnidades = UNIDADES_FIJAS.reduce((acc, u) => {
        return acc + (u.subUnidades ? u.subUnidades.length : 1);
    }, 0);

    // 2. Mostrar Sub-menú si hay padre seleccionado
    if (selectedParent) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-emerald-700 font-bold mb-4 transition-colors group bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Volver a lista general
                </button>

                <div className="flex items-center gap-4 mb-8 bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12"></div>
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white border border-white/20 shadow-lg">
                        <Building2 className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">{selectedParent.nombre}</h2>
                        <p className="text-emerald-200 font-medium">Seleccione la repartición específica</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {selectedParent.subUnidades?.map((sub) => {
                        const yaRegistrado = registrosSesion.some(r => r.unidad === sub.nombre);
                        return (
                            <button
                                key={sub.id}
                                onClick={() => handleChildSelect(sub.id)}
                                className={`
                                    p-6 rounded-2xl border text-left flex justify-between items-center group relative overflow-hidden transition-all duration-300
                                    ${yaRegistrado
                                        ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-sm'
                                        : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-1'
                                    }
                                `}
                            >
                                <div className="z-10 relative">
                                    <span className={`block font-bold text-lg mb-1 transition-colors ${yaRegistrado ? 'text-emerald-800' : 'text-gray-700 group-hover:text-emerald-700'}`}>
                                        {sub.nombre}
                                    </span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${yaRegistrado ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
                                        {yaRegistrado ? 'REGISTRADO' : 'PENDIENTE'}
                                    </span>
                                </div>

                                {yaRegistrado ? (
                                    <div className="bg-emerald-100 p-2 rounded-full">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-2 rounded-full group-hover:bg-emerald-100 transition-colors">
                                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // 3. Mostrar Lista Principal con DASHBOARD
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {soloLectura && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl shadow-sm flex items-start gap-3">
                    <span className="text-2xl">🔒</span>
                    <div>
                        <h4 className="font-bold text-amber-800">Modo Solo Lectura</h4>
                        <p className="text-sm text-amber-700">Estás visualizando un historial. No se pueden realizar modificaciones.</p>
                    </div>
                </div>
            )}

            {/* DASHBOARD DE RESUMEN */}
            <ResumenTurno totalUnidadesBase={totalUnidades} registros={registrosSesion} />

            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                    <Building2 className="w-6 h-6 text-emerald-800" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Control de Unidades</h2>
                    <p className="text-sm text-gray-500 font-medium">Supervisión rutinaria de puestos fijos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-24 md:pb-0">
                {UNIDADES_FIJAS.map((unidad) => {
                    // Verificar si esta unidad (o todas sus subunidades) ya fueron registradas
                    let estado = 'pendiente'; // pendiente, parcial, completo
                    if (unidad.subUnidades) {
                        const registrados = unidad.subUnidades.filter(sub => registrosSesion.some(r => r.unidad === sub.nombre)).length;
                        if (registrados === unidad.subUnidades.length) estado = 'completo';
                        else if (registrados > 0) estado = 'parcial';
                    } else {
                        if (registrosSesion.some(r => r.unidad === unidad.nombre)) estado = 'completo';
                    }

                    return (
                        <button
                            key={unidad.id}
                            onClick={() => handleParentSelect(unidad)}
                            className={`
                                group relative p-6 rounded-2xl border text-left transition-all duration-300
                                hover:-translate-y-1 hover:shadow-xl
                                ${estado === 'completo'
                                    ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                                    : 'bg-white border-gray-100 shadow-sm hover:border-emerald-200'}
                            `}
                        >
                            {estado === 'completo' && (
                                <div className="absolute top-4 right-4 animate-in zoom-in spin-in-90 duration-300">
                                    <div className="bg-emerald-100 p-1.5 rounded-full border border-emerald-200">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    </div>
                                </div>
                            )}

                            {estado === 'parcial' && (
                                <div className="absolute top-4 right-4" title="Progreso Parcial">
                                    <div className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className={`p-3.5 rounded-xl w-fit mb-4 transition-colors shadow-sm ${estado === 'completo'
                                    ? 'bg-emerald-100 text-emerald-700 shadow-emerald-100'
                                    : 'bg-gray-50 text-gray-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-200'
                                    }`}>
                                    <Building2 className="w-7 h-7" />
                                </div>
                                <h3 className="font-bold text-gray-900 group-hover:text-emerald-900 transition-colors text-lg tracking-tight leading-tight">
                                    {unidad.nombre}
                                </h3>

                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {unidad.subUnidades ? (
                                            <>
                                                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-gray-100 text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                                    {unidad.subUnidades.length} Áreas
                                                </span>
                                                {estado === 'parcial' && <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">EN PROCESO</span>}
                                            </>
                                        ) : (
                                            <div className={`text-xs flex items-center gap-1.5 font-medium ${estado === 'completo' ? 'text-emerald-600' : 'text-gray-400 group-hover:text-emerald-500'}`}>
                                                <MapPin className="w-3.5 h-3.5" />
                                                {estado === 'completo' ? 'VERIFICADO' : 'PENDIENTE'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Progreso Visual para Subunidades */}
                            {unidad.subUnidades && (estado === 'parcial' || estado === 'completo') && (
                                <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-500 rounded-b-2xl"
                                    style={{
                                        width: `${(unidad.subUnidades.filter(sub => registrosSesion.some(r => r.unidad === sub.nombre)).length / unidad.subUnidades.length) * 100}%`
                                    }}
                                ></div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Icono faltante importado manualmente para evitar errores si no está en imports top-level
import { CheckCircle2 } from 'lucide-react';
