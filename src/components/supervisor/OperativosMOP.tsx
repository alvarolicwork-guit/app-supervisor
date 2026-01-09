'use client';

import { useState } from 'react';
import { ShieldAlert, Siren } from 'lucide-react';
import { NovedadForm } from './NovedadForm';

export function OperativosMOP() {
    const [activePlan, setActivePlan] = useState<string | null>(null);

    const PLANES_ACTIVOS = [
        { id: 'CHACHA', nombre: 'Plan Chachapuma', estado: 'En ejecución' },
        { id: 'MERCADO', nombre: 'Plan Mercado Seguro', estado: 'Pendiente' },
        { id: 'ESCUELA', nombre: 'Plan Mochila Segura', estado: 'Concluido' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 rounded-xl">
                    <ShieldAlert className="w-6 h-6 text-red-700" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Operativos de Orden y Seguridad (MOP)</h2>
                    <p className="text-sm text-gray-500">Planes de operaciones, controles de impacto y dispositivos especiales.</p>
                </div>
            </div>

            <div className="space-y-4">
                {PLANES_ACTIVOS.map((plan) => (
                    <div key={plan.id} className="bg-white border hover:border-red-300 rounded-xl p-4 transition-all shadow-sm">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                                <div className="bg-red-50 p-2 rounded-lg h-fit">
                                    <Siren className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{plan.nombre}</h3>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                                        {plan.estado}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setActivePlan(plan.id === activePlan ? null : plan.id)}
                                className="text-sm text-blue-600 font-medium hover:underline"
                            >
                                {activePlan === plan.id ? 'Ocultar detalles' : 'Registrar Novedad'}
                            </button>
                        </div>

                        {activePlan === plan.id && (
                            <div className="mt-4 pt-4 border-t animate-in slide-in-from-top-2">
                                <NovedadForm
                                    titulo={`Novedades en ${plan.nombre}`}
                                    tipoEntidad="Operativo Policial"
                                    onSave={() => {
                                        alert('Novedad de operativo registrada');
                                        setActivePlan(null);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}

                <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors">
                    + Iniciar Nuevo Plan de Operaciones
                </button>
            </div>
        </div>
    );
}
