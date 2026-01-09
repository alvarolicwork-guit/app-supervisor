'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { mejorarTextoAction } from '@/app/actions';

interface NovedadFormProps {
    titulo: string;
    onSave: (data: any) => void;
    onCancel?: () => void;
    tipoEntidad?: string; // Estación, Operativo, etc.
}

export function NovedadForm({ titulo, onSave, onCancel, tipoEntidad = 'Servicio' }: NovedadFormProps) {
    const [detalle, setDetalle] = useState('');
    const [resumen, setResumen] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    async function handleMejorarConIA() {
        if (!detalle.trim()) return;
        setIsAiLoading(true);
        try {
            const resultado = await mejorarTextoAction(detalle, `Tipo de entidad: ${tipoEntidad}`);
            setDetalle(resultado.textoMejorado);
            setResumen(resultado.resumen);
        } catch (err) {
            alert('Error al conectar con la IA. Intente más tarde.');
        } finally {
            setIsAiLoading(false);
        }
    }

    return (
        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2">{titulo}</h3>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Detalle de la Novedad (Borrador)</label>
                <div className="relative">
                    <textarea
                        className="w-full border rounded-xl p-3 min-h-[120px] pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Escriba aquí lo sucedido (ej: 'El sargento Mamani llegó tarde a su puesto en la FELCC a las 8, dice que no había trufi...')"
                        value={detalle}
                        onChange={(e) => setDetalle(e.target.value)}
                    />
                    <button
                        onClick={handleMejorarConIA}
                        disabled={isAiLoading || !detalle.trim()}
                        className="absolute top-2 right-2 p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                        title="Mejorar redacción con IA"
                    >
                        {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    💡 Escriba rápido o pegue un audio transcrito. La IA lo formateará profesionalmente.
                </p>
            </div>

            {resumen && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Resumen sugerido para el Parte</label>
                    <p className="text-sm text-gray-800">{resumen}</p>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                {onCancel && (
                    <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                        Cancelar
                    </button>
                )}
                <button
                    onClick={() => onSave({ detalle, resumen })}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
                >
                    Registrar Novedad
                </button>
            </div>
        </div>
    );
}
