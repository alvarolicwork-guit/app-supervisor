'use client';

import { Activity, CheckCircle2, ClipboardList, Users, UserX, AlertOctagon } from 'lucide-react';
import { calcularNovedadesPersonal } from '@/utils/resumen';

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
    const unidadesUnicas = new Set(registros.map((r) => r.unidad).filter(Boolean));
    const unidadesSupervisadas = unidadesUnicas.size;
    const progreso = totalUnidadesBase > 0
        ? Math.min(Math.round((unidadesSupervisadas / totalUnidadesBase) * 100), 100)
        : 0;

    const totalCasosRelevantes = registros.reduce((acc, r) => acc + (r.servicio?.relevantes?.length || 0), 0);
    const unidadesConNovedad = registros
        .filter((r) => (r.servicio?.relevantes?.length || 0) > 0)
        .map((r) => r.unidad);

    const personal = calcularNovedadesPersonal(registros);

    const totalNovedadesPersonal =
        personal.faltas + personal.abandonos + personal.arrestos + personal.permisos;

    const totalPPL = registros.reduce((acc, r) => acc + (r.poblacionPenal?.total || 0), 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 font-sans">

            {/* TARJETA 1: PROGRESO */}
            <div className="app-card relative overflow-hidden p-4">
                <div className="absolute top-0 right-0 p-2 opacity-10 transition-opacity group-hover:opacity-20">
                    <Activity className="h-16 w-16 text-indigo-600" />
                </div>
                <div className="mb-2 flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Avance de turno</p>
                        <h3 className="text-2xl font-bold text-slate-900">{unidadesSupervisadas} <span className="text-sm font-medium text-slate-400">/ {totalUnidadesBase}</span></h3>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <ClipboardList className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-600 transition-all duration-1000 ease-out" style={{ width: `${progreso}%` }}></div>
                </div>
                <p className="mt-2 text-right text-xs font-semibold text-indigo-600">{progreso}% completado</p>
            </div>

            {/* TARJETA 2: CASOS RELEVANTES */}
            <div className={`app-card relative overflow-hidden p-4 transition-colors ${totalCasosRelevantes > 0 ? 'border-rose-200 bg-rose-50' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${totalCasosRelevantes > 0 ? 'text-red-600 animate-pulse' : 'text-gray-500'}`}>
                            {totalCasosRelevantes > 0 ? '⚠️ Alertas Activas' : 'Sin Novedad'}
                        </p>
                        <h3 className={`text-2xl font-bold ${totalCasosRelevantes > 0 ? 'text-red-700' : 'text-gray-800'}`}>
                            {totalCasosRelevantes}
                        </h3>
                    </div>
                    <div className={`rounded-lg p-2 ${totalCasosRelevantes > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                        {totalCasosRelevantes > 0 ? <AlertOctagon className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
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
            <div className="app-card relative overflow-hidden p-4 transition-colors hover:border-slate-300">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Novedades Personal</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-rose-600 leading-none">{personal.faltas}</span>
                                <span className="text-[10px] text-gray-400">Faltas</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-amber-600 leading-none">{personal.abandonos}</span>
                                <span className="text-[10px] text-gray-400">Abandonos</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-slate-700 leading-none">{personal.arrestos}</span>
                                <span className="text-[10px] text-gray-400">Arrestos</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-sky-600 leading-none">{personal.permisos}</span>
                                <span className="text-[10px] text-gray-400">Permisos</span>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                        <UserX className="h-5 w-5" />
                    </div>
                </div>
                {totalNovedadesPersonal === 0 ? (
                    <p className="text-xs text-gray-400 mt-2">Asistencia completa reportada.</p>
                ) : (
                    <p className="text-xs text-slate-500 mt-2">
                        {totalNovedadesPersonal} novedad(es) de personal en {unidadesSupervisadas} unidad(es).
                    </p>
                )}
            </div>

            {/* TARJETA 4: PPL (CÁRCEL) */}
            <div className="app-card relative overflow-hidden p-4 transition-colors hover:border-indigo-200">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Población Penal</p>
                        <h3 className="text-2xl font-bold text-indigo-900">{totalPPL}</h3>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <Users className="h-5 w-5" />
                    </div>
                </div>
                <p className="text-xs text-indigo-400 mt-2">Privados de libertad controlados hoy.</p>
            </div>

        </div>
    );
}
