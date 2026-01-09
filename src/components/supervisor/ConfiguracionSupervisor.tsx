'use client';

import { useState, useEffect } from 'react';
import { User, Calendar, FileText } from 'lucide-react';
import { getSupervisorActual, setSupervisorActual, type SupervisorInfo } from '@/services/servicioSupervisorService';

interface ConfiguracionSupervisorProps {
    onSupervisorSet: (supervisor: SupervisorInfo) => void;
}

export function ConfiguracionSupervisor({ onSupervisorSet }: ConfiguracionSupervisorProps) {
    const [grado, setGrado] = useState('');
    const [nombreCompleto, setNombreCompleto] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!grado.trim() || !nombreCompleto.trim()) {
            alert('Por favor completa todos los campos');
            return;
        }

        const supervisor: SupervisorInfo = {
            grado: grado.trim(),
            nombreCompleto: nombreCompleto.trim(),
        };

        setSupervisorActual(supervisor);
        onSupervisorSet(supervisor);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">App Supervisor</h1>
                    <p className="text-gray-500 mt-2">Comando Departamental Chuquisaca</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Grado
                        </label>
                        <input
                            type="text"
                            value={grado}
                            onChange={(e) => setGrado(e.target.value)}
                            placeholder="Ej: Tcnl. DEAP"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Nombre Completo
                        </label>
                        <input
                            type="text"
                            value={nombreCompleto}
                            onChange={(e) => setNombreCompleto(e.target.value)}
                            placeholder="Ej: Alberto Suarez Plata"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                    >
                        Continuar
                    </button>
                </form>

                <p className="text-xs text-gray-400 text-center mt-6">
                    Esta información se guardará localmente en tu dispositivo
                </p>
            </div>
        </div>
    );
}
