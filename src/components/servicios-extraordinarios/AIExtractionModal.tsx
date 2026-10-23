'use client';

import { useState } from 'react';
import { X, Sparkles, FileText, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import {
    extractFromText,
    extractFromPDF,
    extractFromImage,
    MAX_AI_FILE_BYTES,
    ExtractionMode,
    ExtractionResult,
} from '@/services/aiExtractionService';
import { AperturaServicioExtra, CasoRelevante } from '@/types/servicioExtraordinario';
import { useAuth } from '@/context/AuthContext';

interface ExtractionExtras {
    casosRelevantes?: CasoRelevante[];
    observaciones?: string;
}

interface AIExtractionModalProps {
    onExtracted: (data: Partial<AperturaServicioExtra>, extras?: ExtractionExtras) => void;
    onCancel: () => void;
    mode?: ExtractionMode;
}

type TabType = 'whatsapp' | 'pdf' | 'image';

export function AIExtractionModal({ onExtracted, onCancel, mode = 'apertura' }: AIExtractionModalProps) {
    const esCierre = mode === 'cierre';
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('whatsapp');
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [extractedResult, setExtractedResult] = useState<ExtractionResult | null>(null);
    const [resolvedDudas, setResolvedDudas] = useState<Record<string, string>>({});

    const handleExtract = async () => {
        setError('');
        setLoading(true);

        try {
            let result: ExtractionResult;
            const idToken = await user?.getIdToken();

            if (!idToken) {
                throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
            }

            if (activeTab === 'whatsapp') {
                if (!text.trim()) {
                    throw new Error('Por favor pega el mensaje de WhatsApp');
                }
                result = await extractFromText(idToken, text, mode);
            } else if (activeTab === 'pdf') {
                if (!file) {
                    throw new Error('Por favor selecciona un archivo PDF');
                }
                result = await extractFromPDF(idToken, file, mode);
            } else {
                if (!file) {
                    throw new Error('Por favor selecciona una imagen');
                }
                result = await extractFromImage(idToken, file, mode);
            }

            // Verificar que se extrajo al menos algo (datos, casos u observaciones)
            const tieneCasos = (result.casosRelevantes?.length ?? 0) > 0;
            const tieneObservaciones = Boolean(result.observaciones?.trim());
            if (
                Object.keys(result.data).length === 0 &&
                !tieneCasos &&
                !tieneObservaciones &&
                (!result.dudas || Object.keys(result.dudas).length === 0)
            ) {
                throw new Error(
                    esCierre
                        ? 'No se encontraron novedades ni casos relevantes en el documento.'
                        : 'No se pudo extraer información del documento. Verifica que contenga datos del plan de operaciones.'
                );
            }

            if (result.dudas && Object.keys(result.dudas).length > 0) {
                // Initialize resolvedDudas with the first option for each doubt
                const initialResolved: Record<string, string> = {};
                Object.keys(result.dudas).forEach(key => {
                    initialResolved[key] = result.dudas![key][0];
                });
                setResolvedDudas(initialResolved);
                setExtractedResult(result);
            } else {
                onExtracted(result.data, {
                    casosRelevantes: result.casosRelevantes,
                    observaciones: result.observaciones,
                });
            }

        } catch (err: any) {
            console.error('Error en extracción:', err);
            setError(err.message || 'Error al procesar el documento');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDoubts = () => {
        if (!extractedResult) return;
        const finalData = { ...extractedResult.data, ...resolvedDudas };
        onExtracted(finalData, {
            casosRelevantes: extractedResult.casosRelevantes,
            observaciones: extractedResult.observaciones,
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const maxBytes = MAX_AI_FILE_BYTES;
        const allowedTypes =
            activeTab === 'pdf'
                ? ['application/pdf']
                : ['image/jpeg', 'image/png', 'image/webp'];

        if (selectedFile.size > maxBytes) {
            setFile(null);
            setError('El archivo supera el máximo de 3 MB permitido en la versión web.');
            return;
        }

        if (!allowedTypes.includes(selectedFile.type)) {
            setFile(null);
            setError('El tipo de archivo no es válido. Usa PDF, JPG, PNG o WebP.');
            return;
        }

        setFile(selectedFile);
        setError('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="app-card flex max-h-[96vh] w-full max-w-2xl flex-col overflow-hidden">
                {/* Header */}
                <div className="app-modal-header gap-3 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-white" />
                        <h2 className="text-base font-bold sm:text-lg">
                            {esCierre ? 'Auto-completar novedades' : 'Auto-completar apertura'}
                        </h2>
                    </div>
                    <button onClick={onCancel} className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label="Cerrar">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('whatsapp')}
                        className={`flex-1 min-w-[140px] px-4 sm:px-6 py-3 sm:py-4 font-medium transition-all ${activeTab === 'whatsapp'
                                ? 'border-b-2 border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FileText className="w-5 h-5" />
                            <span>Texto / WhatsApp</span>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveTab('pdf')}
                        className={`flex-1 min-w-[90px] px-4 sm:px-6 py-3 sm:py-4 font-medium transition-all ${activeTab === 'pdf'
                                ? 'border-b-2 border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FileText className="w-5 h-5" />
                            <span>PDF</span>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveTab('image')}
                        className={`flex-1 min-w-[140px] px-4 sm:px-6 py-3 sm:py-4 font-medium transition-all ${activeTab === 'image'
                                ? 'border-b-2 border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <ImageIcon className="w-5 h-5" />
                            <span>Foto / Imagen</span>
                        </div>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                    {/* WhatsApp Tab */}
                    {!extractedResult && activeTab === 'whatsapp' && (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600">
                                {esCierre
                                    ? 'Pega aquí el mensaje de WhatsApp con las novedades del servicio:'
                                    : 'Pega aquí el mensaje de WhatsApp que contiene el plan de operaciones:'}
                            </p>
                            <textarea
                                value={text}
                                onChange={(e) => {
                                    setText(e.target.value);
                                    setError('');
                                }}
                                placeholder={
                                    esCierre
                                        ? 'NOVEDADES DEL SERVICIO...\\n\\nA las 14:30, en la calle...\\nSe registró una riña entre...'
                                        : 'PLAN DE OPERACIONES Nº 1576/2025\\n\\nPersonal Contemplado: 22\\nSupervisor General: Tcnl. DEAP Alberto Suarez...'
                                }
                                className="app-input h-48 resize-none font-mono text-sm sm:h-64"
                                disabled={loading}
                            />
                        </div>
                    )}

                    {/* PDF Tab */}
                    {!extractedResult && activeTab === 'pdf' && (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600">
                                {esCierre
                                    ? 'Sube el PDF con las novedades del servicio:'
                                    : 'Sube el PDF del plan de operaciones:'}
                            </p>
                            <p className="text-xs text-slate-400">Máximo 3 MB en la versión web.</p>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                                <input
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="pdf-upload"
                                    disabled={loading}
                                />
                                <label htmlFor="pdf-upload" className="cursor-pointer">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    {file ? (
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Click para seleccionar PDF</p>
                                            <p className="text-xs text-gray-500 mt-1">o arrastra el archivo aquí</p>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Image Tab */}
                    {!extractedResult && activeTab === 'image' && (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600">
                                {esCierre
                                    ? 'Sube una foto con las novedades del servicio:'
                                    : 'Sube una foto del plan de operaciones:'}
                            </p>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="image-upload"
                                    disabled={loading}
                                />
                                <label htmlFor="image-upload" className="cursor-pointer">
                                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    {file ? (
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Click para tomar/seleccionar foto</p>
                                            <p className="text-xs text-gray-500 mt-1">JPG, PNG o WebP · máximo 3 MB</p>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Disambiguation UI */}
                    {extractedResult && extractedResult.dudas && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                                <h3 className="mb-2 flex items-center gap-2 font-bold text-indigo-900">
                                    <Sparkles className="h-5 w-5" />
                                    Clarificación necesaria
                                </h3>
                                <p className="text-sm text-indigo-800">
                                    La IA ha encontrado múltiples opciones para algunos campos. Por favor, selecciona la opción correcta:
                                </p>
                            </div>

                            <div className="space-y-4">
                                {Object.entries(extractedResult.dudas).map(([key, options]) => (
                                    <div key={key} className="bg-white border rounded-xl p-4 shadow-sm">
                                        <p className="font-semibold text-gray-900 mb-3 capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </p>
                                        <div className="space-y-2">
                                            {options.map((opt, idx) => (
                                                <label key={idx} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${resolvedDudas[key] === opt ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}>
                                                    <input
                                                        type="radio"
                                                        name={`doubt-${key}`}
                                                        value={opt}
                                                        checked={resolvedDudas[key] === opt}
                                                        onChange={() => setResolvedDudas(prev => ({ ...prev, [key]: opt }))}
                                                        className="mt-1"
                                                    />
                                                    <span className="text-sm font-medium text-gray-800">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && !extractedResult && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-800 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Success Preview */}
                    {loading && (
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-center">
                            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-indigo-600" />
                            <p className="text-sm font-medium text-indigo-800">Procesando con IA...</p>
                            <p className="mt-1 text-xs text-indigo-600">Esto puede tomar unos segundos.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t bg-gray-50 rounded-b-2xl flex flex-col-reverse sm:flex-row gap-3">
                    <button
                        onClick={() => {
                            if (extractedResult) {
                                setExtractedResult(null);
                                setResolvedDudas({});
                            } else {
                                onCancel();
                            }
                        }}
                        className="app-btn-secondary flex-1"
                        disabled={loading}
                    >
                        {extractedResult ? 'Atrás' : 'Cancelar'}
                    </button>
                    
                    {extractedResult ? (
                        <button
                            onClick={handleConfirmDoubts}
                            className="app-btn-primary flex-1"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            Confirmar Selección
                        </button>
                    ) : (
                        <button
                            onClick={handleExtract}
                            disabled={loading || (activeTab === 'whatsapp' && !text.trim()) || ((activeTab === 'pdf' || activeTab === 'image') && !file)}
                            className="app-btn-primary flex-1"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Extrayendo...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Extraer Información
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
