'use client';

import { useState } from 'react';
import { Plus, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { ServicioExtraordinario } from '@/types/servicioExtraordinario';

interface ListaServiciosExtraordinariosProps {
    servicios: ServicioExtraordinario[];
    soloLectura: boolean;
    onAbrirNuevo: () => void;
    onCerrarServicio: (servicioId: string) => void;
    onVerDetalle: (servicioId: string) => void;
}

export function ListaServiciosExtraordinarios({
    servicios,
    soloLectura,
    onAbrirNuevo,
    onCerrarServicio,
    onVerDetalle
}: ListaServiciosExtraordinariosProps) {

    const serviciosActivos = servicios.filter(s => s.estado === 'abierto');
    const serviciosCerrados = servicios.filter(s => s.estado === 'cerrado');

    const formatFecha = (date: Date) => {
        return new Intl.DateTimeFormat('es-BO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Servicios Extraordinarios</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestión de operativos especiales con planes de operaciones
                    </p>
                </div>
                {!soloLectura && (
                    <button
                        onClick={onAbrirNuevo}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Servicio Extraordinario
                    </button>
                )}
            </div>

            {/* Servicios Activos */}
            {serviciosActivos.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        Servicios Activos ({serviciosActivos.length})
                    </h3>
                    <div className="space-y-3">
                        {serviciosActivos.map((servicio) => (
                            <div
                                key={servicio.id}
                                className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-4 hover:shadow-md transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Calendar className="w-5 h-5 text-blue-600" />
                                            <span className="font-bold text-gray-900">
                                                Orden Nº {servicio.apertura.nroPlanOperaciones}
                                            </span>
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                                Activo
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1 ml-8">
                                            <p><strong>Lugar:</strong> {servicio.apertura.lugarFormacion}</p>
                                            <p className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                <strong>Abierto:</strong> {formatFecha(servicio.apertura.fechaApertura)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onVerDetalle(servicio.id)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                        >
                                            Ver Detalle
                                        </button>
                                        {!soloLectura && (
                                            <button
                                                onClick={() => onCerrarServicio(servicio.id)}
                                                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Cerrar Servicio
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Servicios Cerrados */}
            {serviciosCerrados.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-gray-400" />
                        Servicios Cerrados Hoy ({serviciosCerrados.length})
                    </h3>
                    <div className="space-y-3">
                        {serviciosCerrados.map((servicio) => (
                            <div
                                key={servicio.id}
                                className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <Calendar className="w-5 h-5 text-gray-400" />
                                            <span className="font-bold text-gray-700">
                                                Orden Nº {servicio.apertura.nroPlanOperaciones}
                                            </span>
                                            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                                                Cerrado
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 ml-8">
                                            <p>Cerrado: {servicio.cierre && formatFecha(servicio.cierre.fechaCierre)}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onVerDetalle(servicio.id)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                                    >
                                        Ver Detalle
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {servicios.length === 0 && (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">
                        No hay servicios extraordinarios
                    </h3>
                    <p className="text-gray-500 mb-6">
                        Abre un nuevo servicio extraordinario para comenzar a registrar operativos especiales
                    </p>
                    {!soloLectura && (
                        <button
                            onClick={onAbrirNuevo}
                            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg inline-flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Servicio Extraordinario
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
