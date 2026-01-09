'use client';

import { useState } from 'react';
import { Calendar, Users } from 'lucide-react';
import { NovedadForm } from './NovedadForm';

export function ServiciosExtra() {
    const [showForm, setShowForm] = useState(false);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Servicios Extraordinarios</h2>
                    <p className="text-sm text-gray-500">Eventos deportivos, sociales, ferias y otros servicios no rutinarios.</p>
                </div>
            </div>

            {!showForm ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No hay servicios extraordinarios registrados en este momento.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                        Registrar Nuevo Servicio Extra
                    </button>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Evento</label>
                            <input className="w-full border rounded-lg p-2.5" placeholder="Ej. Partido Liga: U vs Oriente" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                            <input className="w-full border rounded-lg p-2.5" placeholder="Estadio Patria" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
                            <input type="time" className="w-full border rounded-lg p-2.5" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Personal Desplegado (Cant.)</label>
                            <input type="number" className="w-full border rounded-lg p-2.5" placeholder="0" />
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <NovedadForm
                            titulo="Novedades del Servicio Extraordinario"
                            tipoEntidad="Servicio Extraordinario"
                            onSave={(data) => {
                                console.log('Guardando extra:', data);
                                alert('Servicio Extraordinario registrado');
                                setShowForm(false);
                            }}
                            onCancel={() => setShowForm(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
