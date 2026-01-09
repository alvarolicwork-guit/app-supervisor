import { generateContentDirect } from '@/ai/geminiDirect';
import { AperturaServicioExtra, PersonalNovedad, ObservacionUniforme } from '@/types/servicioExtraordinario';

// Tipo de respuesta esperada de Gemini
interface GeminiExtractionResponse {
    nroPlanOperaciones?: string;
    personalContemplado?: number;
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
    personalAtrasadoCantidad?: number;
    personalAtrasadoLista?: PersonalNovedad[];
    observacionesUniforme?: ObservacionUniforme[];
    casosRelevantes?: {
        tipo: string;
        hora: string;
        lugar: string;
        encargado: string;
        detalle: string;
    }[];
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
2. personalContemplado - Número total de personal (Ej: 22)
3. supervisorGeneral - Grado + Nombre completo (Ej: "Tcnl. DEAP Alberto Suarez Plata")
4. jefeOperativo - Grado + Nombre completo del jefe operativo
5. lugarFormacion - Lugar donde se forma el personal (Ej: "Multipropósito", "Patio Central")
6. horaFormacion - Hora de formación en formato HH:MM (Ej: "14:00")
7. horaInstalacion - Hora de instalación en formato HH:MM (Ej: "14:15")
8. personalFormo - Número de personal que formó
9. personalFaltoCantidad - Número de personal que faltó
10. personalFaltoLista - Array de { gradoNombre } del personal que faltó (Ej: "Sgto. Carlos Mamani")
11. personalPermisoCantidad - Número de personal con permiso
12. personalPermisoLista - Array de { gradoNombre } del personal con permiso
13. personalPaso - Número de personal que pasó
14. personalAtrasadoCantidad - Número de personal atrasado
15. personalAtrasadoLista - Array de { gradoNombre } del personal atrasado
16. observacionesUniforme - Array de { gradoNombre, tipo } (tipo: "Incorrecto", "Sucio/Desarreglado" o "Incompleto")
17. casosRelevantes - Array de casos/novedades ocurridas DURANTE el servicio (tipo, hora, lugar, encargado, detalle). NO incluyas novedades de formación aquí.

INSTRUCCIONES:
- Extrae SOLO la información que encuentres explícitamente en el documento
- Para campos numéricos usa números, no strings
- Para horas usa formato "HH:MM" (24 horas)
- Para personal, usa un objeto con "gradoNombre" que contenga TODO (Grado y Nombre)
- Si un campo no está presente, NO lo incluyas en la respuesta

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional antes o después.

Ejemplo:
{
  "nroPlanOperaciones": "1576/2025",
  "personalContemplado": 22,
  "supervisorGeneral": "Tcnl. DEAP Alberto Suarez Plata",
  "jefeOperativo": "May. Juan Pérez López",
  "lugarFormacion": "Multipropósito",
  "horaFormacion": "14:00",
  "horaInstalacion": "14:15",
  "personalFormo": 22,
  "personalFaltoCantidad": 2,
  "personalFaltoLista": [
    { "gradoNombre": "Sgto. Carlos Mamani" },
    { "gradoNombre": "Cbte. Luis Torres" }
  ],
  "personalPermisoCantidad": 1,
  "personalPermisoLista": [
    { "gradoNombre": "Sgto. 1º María González" }
  ],
  "personalAtrasadoCantidad": 0,
  "casosRelevantes": [
      {
          "tipo": "Riña y Pelea",
          "hora": "16:30",
          "lugar": "Tribuna Sur",
          "encargado": "Sgto. Perez",
          "detalle": "Se intervino una pelea entre dos personas..."
      }
  ]
}

DOCUMENTO A ANALIZAR:
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
export async function extractFromText(text: string): Promise<Partial<AperturaServicioExtra>> {
    if (!text.trim()) {
        throw new Error('El texto no puede estar vacío');
    }

    const prompt = buildExtractionPrompt(text, 'text');
    const response = await generateContentDirect(prompt);
    const extracted = parseGeminiResponse(response);

    return mapToAperturaData(extracted);
}

/**
 * Extraer información desde PDF
 */
export async function extractFromPDF(file: File): Promise<Partial<AperturaServicioExtra>> {
    // TODO: Implementar extracción de texto de PDF con pdf.js
    // Por ahora, lanzar error indicando que está en desarrollo
    throw new Error('La extracción desde PDF estará disponible próximamente. Por favor usa texto o imagen.');
}

/**
 * Extraer información desde imagen (OCR con Gemini Vision)
 */
export async function extractFromImage(file: File): Promise<Partial<AperturaServicioExtra>> {
    // Convertir imagen a base64
    const base64 = await fileToBase64(file);

    const prompt = buildExtractionPrompt('Imagen adjunta', 'image');

    // Gemini puede procesar imágenes directamente
    // Por ahora usar el endpoint de texto y indicar que hay imagen
    // TODO: Actualizar geminiDirect para soportar imágenes
    throw new Error('La extracción desde imagen estará disponible próximamente. Por favor usa texto.');
}

/**
 * Mapear respuesta de Gemini a estructura de AperturaServicioExtra
 */
function mapToAperturaData(extracted: GeminiExtractionResponse): Partial<AperturaServicioExtra> {
    const mapped: Partial<AperturaServicioExtra> = {};

    if (extracted.nroPlanOperaciones) mapped.nroPlanOperaciones = extracted.nroPlanOperaciones;
    if (extracted.personalContemplado) mapped.personalContemplado = extracted.personalContemplado;
    if (extracted.supervisorGeneral) mapped.supervisorGeneral = extracted.supervisorGeneral;
    if (extracted.jefeOperativo) mapped.jefeOperativo = extracted.jefeOperativo;
    if (extracted.lugarFormacion) mapped.lugarFormacion = extracted.lugarFormacion;
    if (extracted.horaFormacion) mapped.horaFormacion = extracted.horaFormacion;
    if (extracted.horaInstalacion) mapped.horaInstalacion = extracted.horaInstalacion;

    // Mapear novedades de formación
    if (extracted.personalFormo || extracted.personalFaltoCantidad || extracted.personalPermisoCantidad || extracted.personalAtrasadoCantidad) {
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
            personalAtrasado: {
                cantidad: extracted.personalAtrasadoCantidad || 0,
                lista: extracted.personalAtrasadoLista || []
            },
            observacionesUniforme: extracted.observacionesUniforme || []
        };
    }

    return mapped;
}

/**
 * Convertir archivo a base64
 */
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            // Remover el prefijo data:image/...;base64,
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
