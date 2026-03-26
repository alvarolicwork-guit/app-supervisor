'use client';

import { useState } from 'react';
import { X, Sparkles, FileText, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { extractFromText, extractFromPDF, extractFromImage, ExtractionResult } from '@/services/aiExtractionService';
import { AperturaServicioExtra } from '@/types/servicioExtraordinario';

interface AIExtractionModalProps {
    onExtracted: (data: Partial<AperturaServicioExtra>) => void;
    onCancel: () => void;
}

type TabType = 'whatsapp' | 'pdf' | 'image';

export function AIExtractionModal({ onExtracted, onCancel }: AIExtractionModalProps) {
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

            if (activeTab === 'whatsapp') {
                if (!text.trim()) {
                    throw new Error('Por favor pega el mensaje de WhatsApp');
                }
                result = await extractFromText(text);
            } else if (activeTab === 'pdf') {
                if (!file) {
                    throw new Error('Por favor selecciona un archivo PDF');
                }
                result = await extractFromPDF(file);
            } else {
                if (!file) {
                    throw new Error('Por favor selecciona una imagen');
                }
                result = await extractFromImage(file);
            }

            // Verificar que se extrajo al menos algo
            if (Object.keys(result.data).length === 0 && (!result.dudas || Object.keys(result.dudas).length === 0)) {
                throw new Error('No se pudo extraer información del documento. Verifica que contenga datos del plan de operaciones.');
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
                onExtracted(result.data);
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
        onExtracted(finalData);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[96vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 sm:p-6 rounded-t-2xl flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-white" />
                        <h2 className="text-base sm:text-xl font-bold text-white">Auto-completar con IA</h2>
                    </div>
                    <button onClick={onCancel} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('whatsapp')}
                        className={`flex-1 min-w-[140px] px-4 sm:px-6 py-3 sm:py-4 font-medium transition-all ${activeTab === 'whatsapp'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:bg-gray-50'
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
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:bg-gray-50'
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
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:bg-gray-50'
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
                            <p className="text-sm text-gray-600">
                                Pega aquí el mensaje de WhatsApp que contiene el plan de operaciones:
                            </p>
                            <textarea
                                value={text}
                                onChange={(e) => {
                                    setText(e.target.value);
                                    setError('');
                                }}
                                placeholder="PLAN DE OPERACIONES Nº 1576/2025&#10;&#10;Personal Contemplado: 22&#10;Supervisor General: Tcnl. DEAP Alberto Suarez..."
                                className="w-full h-48 sm:h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                disabled={loading}
                            />
                        </div>
                    )}

                    {/* PDF Tab */}
                    {!extractedResult && activeTab === 'pdf' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                Sube el PDF del plan de operaciones:
                            </p>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                                <input
                                    type="file"
                                    accept=".pdf"
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
                            <p className="text-sm text-gray-600">
                                Sube una foto del plan de operaciones:
                            </p>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
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
                                            <p className="text-xs text-gray-500 mt-1">JPG, PNG - máx 10MB</p>
                                        </div>
                                    )}
                                </label>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ Próximamente: La extracción desde imágenes (OCR) estará disponible en la próxima actualización.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Disambiguation UI */}
                    {extractedResult && extractedResult.dudas && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Clarificación Necesaria
                                </h3>
                                <p className="text-sm text-blue-800">
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
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-blue-800 font-medium">Procesando con IA...</p>
                            <p className="text-xs text-blue-600 mt-1">Esto puede tomar unos segundos</p>
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
                        className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                        disabled={loading}
                    >
                        {extractedResult ? 'Atrás' : 'Cancelar'}
                    </button>
                    
                    {extractedResult ? (
                        <button
                            onClick={handleConfirmDoubts}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            Confirmar Selección
                        </button>
                    ) : (
                        <button
                            onClick={handleExtract}
                            disabled={loading || (activeTab === 'whatsapp' && !text.trim()) || ((activeTab === 'pdf' || activeTab === 'image') && !file)}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
