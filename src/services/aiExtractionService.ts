import { generateContentAction } from '@/app/actions/ai';
import { AperturaServicioExtra, PersonalNovedad, ObservacionUniforme } from '@/types/servicioExtraordinario';

// Tipo de respuesta esperada de Gemini
interface GeminiExtractionResponse {
    nroPlanOperaciones?: string;
    tipoServicio?: string;
    personalContemplado?: number;
    motosContempladas?: number;
    vehiculosContemplados?: number;
    supervisorGeneral?: string;
    jefeOperativo?: string;
    lugarFormacion?: string;
    horaFormacion?: string;
    horaInstalacion?: string;
    personalFormo?: number;
    personalFaltoCantidad?: number;
    personalFaltoLista?: PersonalNovedad[];
    personalPermisoCantidad?: number;
    personalPermisoLista?: PersonalNovedad[];
    observacionesUniforme?: ObservacionUniforme[];
    tareas?: string;
    casosRelevantes?: {
        tipo: string;
        hora: string;
        lugar: string;
        encargado: string;
        breveRelacion: string;
    }[];
    dudas?: Record<string, string[]>;
}

export interface ExtractionResult {
    data: Partial<AperturaServicioExtra>;
    dudas?: Record<string, string[]>;
}

/**
 * Construir prompt para Gemini según el tipo de fuente
 */
function buildExtractionPrompt(content: string, sourceType: 'text' | 'pdf' | 'image'): string {
    const sourceDescription = {
        text: 'un mensaje de WhatsApp',
        pdf: 'un documento PDF',
        image: 'una imagen/foto de un documento'
    };

    return `
Eres un asistente especializado en extraer información estructurada de planes de operaciones policiales.

CONTEXTO:
Se te proporciona ${sourceDescription[sourceType]} que contiene información sobre un servicio extraordinario policial.

CAMPOS A EXTRAER (si están disponibles):
1. nroPlanOperaciones - Número del plan (Ej: "1576/2025", "OP-045/2024")
2. tipoServicio - El nombre o descripción del servicio/operativo que aparece debajo del número de orden (Ej: "ESPACIOS PUBLICOS SEGUROS, PREVENCION Y CONTROL DEL CONSUMO DE ALCOHOL"). Extrae el texto completo y descriptivo.
3. personalContemplado - Número total de personal (Ej: 65). Busca el "TOTAL" en la columna "EFECTIVO POLICIAL".
4. motosContempladas - Número total de motocicletas. Busca el "TOTAL" en la columna "MTS" (debajo de MOTORIZADOS).
5. vehiculosContemplados - Número total de vehículos. Busca el "TOTAL" en la columna "VL" (debajo de MOTORIZADOS).
6. supervisorGeneral - Grado + Nombre completo (Ej: "Tcnl. DEAP Alberto Suarez Plata")
7. jefeOperativo - Grado + Nombre completo del jefe operativo
8. lugarFormacion - Lugar donde se forma el personal (Ej: "Multipropósito", "Patio Central")
9. horaFormacion - Hora de formación en formato HH:MM (Ej: "14:00")
10. horaInstalacion - Hora de instalación en formato HH:MM (Ej: "14:15")
11. personalFormo - Número de personal que formó
12. personalFaltoCantidad - Número de personal que faltó a la formación
13. personalFaltoLista - Array de { gradoNombre } del personal que faltó a la formación (Ej: "Sgto. Carlos Mamani")
14. personalPermisoCantidad - Número de personal con permiso
15. personalPermisoLista - Array de { gradoNombre } del personal con permiso
16. observacionesUniforme - Array de { gradoNombre, tipo } (tipo: "Incorrecto", "Sucio/Desarreglado" o "Incompleto")
17. tareas - RESUMEN de la misión y ejecución (Sección II del PDF, incisos A, B y C). Genera un resumen formal, específico y profesional de máximo 500 caracteres.
18. casosRelevantes - Array de { tipo, hora, lugar, encargado, breveRelacion }

Manejo de Incertidumbre y Ambigüedad (IMPORTANTE):
- Si tienes dudas razonables sobre algún campo (por ejemplo, hay varios nombres y no estás seguro de cuál es el Jefe Operativo), NO adivines ni lo incluyas en la raíz del objeto.
- En su lugar, agrega el nombre del campo exacto dentro de un objeto opcional llamado "dudas", junto con un array de las posibles opciones que encontraste.
- Ejemplo de objeto JSON si tienes dudas sobre el Jefe Operativo:
{
  "nroPlanOperaciones": "1576/2025",
  "dudas": {
    "jefeOperativo": ["May. Juan Perez", "Tcnl. Luis Silva"],
    "lugarFormacion": ["Multipropósito", "Patio Central"]
  }
}

INSTRUCCIONES EXTRA:
- Extrae SOLO la información que encuentres explícitamente en el documento
- Para campos numéricos usa números, no strings
- Para horas usa formato "HH:MM" (24 horas)
- Para personal, usa un objeto con "gradoNombre" que contenga TODO (Grado y Nombre)
- Si un campo no está presente, NO lo incluyas en la respuesta
- Retorna SOLO un objeto JSON válido, sin delimitadores como \`\`\`json.

CONTENIDO A ANALIZAR:
${content}

RESPUESTA (solo JSON):`;
}

/**
 * Parsear respuesta de Gemini y validar JSON
 */
function parseGeminiResponse(response: string): GeminiExtractionResponse {
    try {
        // Limpiar respuesta (remover markdown code blocks si existen)
        let cleanedResponse = response.trim();

        // Remover ```json y ``` si están presentes
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(cleanedResponse);
        return parsed;
    } catch (error) {
        console.error('Error parsing Gemini response:', error);
        console.error('Raw response:', response);
        throw new Error('No se pudo parsear la respuesta de la IA. Por favor intenta nuevamente.');
    }
}

/**
 * Extraer información desde texto plano (WhatsApp)
 */
export async function extractFromText(text: string): Promise<ExtractionResult> {
    if (!text.trim()) {
        throw new Error('El texto no puede estar vacío');
    }

    const prompt = buildExtractionPrompt(text, 'text');
    const response = await generateContentAction(prompt);
    const extracted = parseGeminiResponse(response);

    return {
        data: mapToAperturaData(extracted),
        dudas: extracted.dudas
    };
}

/**
 * Extraer información desde PDF
 */
export async function extractFromPDF(file: File): Promise<ExtractionResult> {
    const prompt = buildExtractionPrompt('Extrae la información relevante del Plan de Operaciones en el documento PDF adjunto.', 'pdf');
    
    // Convertir File a base64
    const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remover metadata data:MIME_TYPE;base64,
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });

    const fileData = {
        base64: base64String,
        mimeType: file.type || 'application/pdf'
    };

    const response = await generateContentAction(prompt, fileData);
    const extracted = parseGeminiResponse(response);

    return {
        data: mapToAperturaData(extracted),
        dudas: extracted.dudas
    };
}

/**
 * Extraer información desde una Imagen
 */
export async function extractFromImage(_file: File): Promise<ExtractionResult> {
    void _file;
    // TODO: Implementar extracción desde imagen
    throw new Error('La extracción desde imagen estará disponible próximamente. Por favor usa texto o PDF.');
}

/**
 * Mapear respuesta de Gemini a estructura de AperturaServicioExtra
 */
function mapToAperturaData(extracted: GeminiExtractionResponse): Partial<AperturaServicioExtra> {
    const mapped: Partial<AperturaServicioExtra> = {};

    if (extracted.nroPlanOperaciones) mapped.nroPlanOperaciones = extracted.nroPlanOperaciones;
    if (extracted.tipoServicio) mapped.tipoServicio = extracted.tipoServicio;
    if (extracted.personalContemplado) mapped.personalContemplado = extracted.personalContemplado;
    if (extracted.motosContempladas) mapped.motosContempladas = extracted.motosContempladas;
    if (extracted.vehiculosContemplados) mapped.vehiculosContemplados = extracted.vehiculosContemplados;
    if (extracted.supervisorGeneral) mapped.supervisorGeneral = extracted.supervisorGeneral;
    if (extracted.jefeOperativo) mapped.jefeOperativo = extracted.jefeOperativo;
    if (extracted.lugarFormacion) mapped.lugarFormacion = extracted.lugarFormacion;
    if (extracted.horaFormacion) mapped.horaFormacion = extracted.horaFormacion;
    if (extracted.horaInstalacion) mapped.horaInstalacion = extracted.horaInstalacion;
    if (extracted.tareas) mapped.tareas = extracted.tareas;

    // Mapear novedades de formación
    if (extracted.personalFormo || extracted.personalFaltoCantidad || extracted.personalPermisoCantidad) {
        mapped.novedadesFormacion = {
            personalFormo: extracted.personalFormo || 0,
            personalFalto: {
                cantidad: extracted.personalFaltoCantidad || 0,
                lista: extracted.personalFaltoLista || []
            },
            personalPermiso: {
                cantidad: extracted.personalPermisoCantidad || 0,
                lista: extracted.personalPermisoLista || []
            },
            observacionesUniforme: extracted.observacionesUniforme || []
        };
    }

    return mapped;
}

