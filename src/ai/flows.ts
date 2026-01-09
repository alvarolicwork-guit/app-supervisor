import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Configurar Genkit con Google AI
const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  throw new Error('❌ GOOGLE_AI_API_KEY no está configurada. Crea un archivo .env.local con tu API key.');
}

const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: 'gemini-pro',
});

// Definir esquema de entrada y salida
const RedaccionInput = z.object({
  textoBase: z.string(),
  tipo: z.enum(['novedad', 'informe', 'parte']).optional(),
  contexto: z.string().optional(),
});

const RedaccionOutput = z.object({
  textoMejorado: z.string(),
  resumen: z.string(),
});

// Flujo: Mejorar Redacción Policial
export const mejorarRedaccionFlow = ai.defineFlow(
  {
    name: 'mejorarRedaccion',
    inputSchema: RedaccionInput,
    outputSchema: RedaccionOutput,
  },
  async (input) => {
    const prompt = `
      Actúa como un Supervisor Policial experto con años de experiencia en redacción de informes oficiales.
      Tu tarea es transformar el siguiente borrador informal en una novedad policial técnica, formal y precisa.

      Contexto adicional: ${input.contexto || 'Ninguno'}
      Tipo de documento: ${input.tipo || 'Novedad de servicio'}

      Borrador original:
      "${input.textoBase}"

      Reglas de redacción:
      1. Usa lenguaje formal y técnico (ej. "se procedió", "apersonó", "suscitado").
      2. Mantén la objetividad.
      3. Sé conciso pero detallado en los hechos.
      4. Corrige ortografía y gramática.
      5. Si faltan datos clave (hora, lugar), déjalos indicados entre corchetes [HORA?].

      Genera también un resumen de una línea para el parte diario.
    `;

    const response = await ai.generate(prompt);

    // Extracción robusta (aunque Genkit suele dar texto directo, estructuramos la respuesta)
    // Para simplificar en este paso, asumimos que el modelo sigue instrucciones. 
    // En producción idealmente usamos output estructurado nativo (json mode).

    const text = response.text;
    const [cuerpo, resumen] = text.split('RESUMEN:');

    return {
      textoMejorado: cuerpo ? cuerpo.trim() : text,
      resumen: resumen ? resumen.trim() : 'Resumen no generado automáticamente.',
    };
  }
);

// --- Nuevo Flujo: Extracción de Datos de Casos (WhatsApp -> JSON) ---

const ExtraccionCasoInput = z.object({
  textoReporte: z.string(),
});

const ExtraccionCasoOutput = z.object({
  tipo: z.string().describe('Tipo de caso, ej: Auxilio, Robo, Rina, etc.'),
  hora: z.string().describe('Hora aproximada del hecho formato 24h'),
  detalle: z.string().describe('Redacción formal y resumida del hecho'),
  lugar: z.string().optional(),
});

export const extraerDatosCasoFlow = ai.defineFlow(
  {
    name: 'extraerDatosCaso',
    inputSchema: ExtraccionCasoInput,
    outputSchema: z.unknown(), // Desactivamos validación estricta temporalmente
  },
  async (input) => {
    console.log('DEBUG_ANTIGRAVITY: Iniciando flujo con texto:', input.textoReporte.substring(0, 50) + '...');
    const prompt = `
      Eres un asistente experto en análisis de reportes policiales.
      Tu tarea es leer el siguiente reporte crudo (posiblemente copiado de WhatsApp) y extraer los datos clave para el sistema.

      Reporte Original:
      """
      ${input.textoReporte}
      """

      Instrucciones:
      1. Identifica la 'Naturaleza del Hecho' o Tipo.
      2. Identifica la Hora del hecho.
      3. Identifica el Lugar exacto del hecho.
      4. Identifica al 'Encargado del Caso' o personal que atendió (Grado y Nombre).
      5. Genera un 'Detalle' que sea un resumen técnico policial formal de lo sucedido.
      
      Devuelve SOLO un objeto JSON válido con la estructura:
      {
        "tipo": "String",
        "hora": "String (HH:mm)",
        "lugar": "String",
        "encargado": "String (Grado y Nombre)",
        "detalle": "String (Texto formal)"
      }
    `;

    try {
      const response = await ai.generate({
        prompt: prompt,
        config: {
          temperature: 0.1, // Baja temperatura para más determinismo
        }
      });
      const text = response.text;
      console.log('DEBUG_ANTIGRAVITY: Respuesta Raw Genkit:', text);

      // Extracción robusta de JSON: busca el primer '{' y el último '}'
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error('DEBUG_ANTIGRAVITY: No JSON match found in:', text);
        throw new Error('La respuesta de la IA no contiene un JSON válido.');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('DEBUG_ANTIGRAVITY: JSON Parsed ok:', parsed);
      return parsed;

    } catch (e) {
      console.error('DEBUG_ANTIGRAVITY: Error en flujo:', e);
      throw e;
    }
  }
);
