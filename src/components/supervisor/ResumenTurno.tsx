'use client';

import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Users, UserX, AlertOctagon } from 'lucide-react';

export interface DatosUnidadRegistrada {
    unidad: string;
    fechaHoraControl: string;
    personal: {
        cantidad: number;
        estado: 'sin' | 'con';
        detalles: {
            faltantes: string[];
            abandono: string[];
            arrestados: string[];
            permisos: string[];
        }
    };
    servicio?: {
        rutina: number;
        relevantes: any[]; // Array de casos
    };
    poblacionPenal?: {
        total: number;
        varones: number;
        mujeres: number;
        detencionDomiciliaria: number;
    };
    jefeSeguridad?: string;
    novedadesTexto?: string;
}

interface ResumenTurnoProps {
    totalUnidadesBase: number;
    registros: DatosUnidadRegistrada[];
}

export function ResumenTurno({ totalUnidadesBase, registros }: ResumenTurnoProps) {
    // 1. Cálculos
    const unidadesSupervisadas = registros.length;
    const progreso = Math.min(Math.round((unidadesSupervisadas / totalUnidadesBase) * 100), 100);

    const totalCasosRelevantes = registros.reduce((acc, r) => acc + (r.servicio?.relevantes?.length || 0), 0);
    const unidadesConNovedad = registros.filter(r => (r.servicio?.relevantes?.length || 0) > 0).map(r => r.unidad);

    const personal = {
        faltas: registros.reduce((acc, r) => acc + (r.personal.detalles.faltantes?.length || 0), 0),
        arrestos: registros.reduce((acc, r) => acc + (r.personal.detalles.arrestados?.length || 0), 0),
        permisos: registros.reduce((acc, r) => acc + (r.personal.detalles.permisos?.length || 0), 0),
    };

    const totalPPL = registros.reduce((acc, r) => acc + (r.poblacionPenal?.total || 0), 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 font-sans">

            {/* TARJETA 1: PROGRESO */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity className="w-16 h-16 text-blue-600" />
                </div>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Avance de Turno</p>
                        <h3 className="text-2xl font-bold text-gray-800">{unidadesSupervisadas} <span className="text-sm text-gray-400 font-medium">/ {totalUnidadesBase}</span></h3>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progreso}%` }}></div>
                </div>
                <p className="text-xs text-blue-600 font-semibold mt-2 text-right">{progreso}% Completado</p>
            </div>

            {/* TARJETA 2: CASOS RELEVANTES */}
            <div className={`rounded-xl shadow-sm border p-4 relative overflow-hidden transition-colors ${totalCasosRelevantes > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${totalCasosRelevantes > 0 ? 'text-red-600 animate-pulse' : 'text-gray-500'}`}>
                            {totalCasosRelevantes > 0 ? '⚠️ Alertas Activas' : 'Sin Novedad'}
                        </p>
                        <h3 className={`text-2xl font-bold ${totalCasosRelevantes > 0 ? 'text-red-700' : 'text-gray-800'}`}>
                            {totalCasosRelevantes}
                        </h3>
                    </div>
                    <div className={`p-2 rounded-lg ${totalCasosRelevantes > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-green-600'}`}>
                        {totalCasosRelevantes > 0 ? <AlertOctagon className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                </div>
                {totalCasosRelevantes > 0 ? (
                    <div className="mt-2">
                        <p className="text-xs text-red-500 font-medium mb-1">Unidades afectadas:</p>
                        <div className="flex flex-wrap gap-1">
                            {unidadesConNovedad.map((u, i) => (
                                <span key={i} className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 truncate max-w-[120px]">
                                    {u}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 mt-2">Todo en orden por el momento.</p>
                )}
            </div>

            {/* TARJETA 3: PERSONAL */}
            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 relative overflow-hidden hover:border-orange-200 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Novedades Personal</p>
                        <div className="flex gap-3 mt-1">
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-red-600 leading-none">{personal.faltas}</span>
                                <span className="text-[10px] text-gray-400">Faltas</span>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-gray-700 leading-none">{personal.arrestos}</span>
                                <span className="text-[10px] text-gray-400">Arrestos</span>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-yellow-600 leading-none">{personal.permisos}</span>
                                <span className="text-[10px] text-gray-400">Permisos</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                        <UserX className="w-5 h-5" />
                    </div>
                </div>
                {personal.faltas + personal.arrestos + personal.permisos === 0 && (
                    <p className="text-xs text-gray-400 mt-2">Asistencia completa reportada.</p>
                )}
            </div>

            {/* TARJETA 4: PPL (CÁRCEL) */}
            <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-4 relative overflow-hidden hover:border-indigo-200 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Población Penal</p>
                        <h3 className="text-2xl font-bold text-indigo-900">{totalPPL}</h3>
                    </div>
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Users className="w-5 h-5" />
                    </div>
                </div>
                <p className="text-xs text-indigo-400 mt-2">Privados de libertad controlados hoy.</p>
            </div>

        </div>
    );
}
