import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_AI_API_KEY;
const model = process.env.GENKIT_MODEL || 'googleai/gemini-2.0-flash';

if (!apiKey) {
  throw new Error('❌ GOOGLE_AI_API_KEY no está configurada. Crea un archivo .env.local con tu API key.');
}

const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model,
});

const RedaccionInput = z.object({
  textoBase: z.string(),
  tipo: z.enum(['novedad', 'informe', 'parte']).optional(),
  contexto: z.string().optional(),
});

const RedaccionOutput = z.object({
  textoMejorado: z.string(),
  resumen: z.string(),
});

const ExtraccionCasoInput = z.object({
  textoReporte: z.string(),
});

const ExtraccionCasoOutput = z.object({
  tipo: z.string().describe('Tipo de caso, ej: Auxilio, Robo, Rina, etc.'),
  hora: z.string().describe('Hora aproximada del hecho formato 24h (HH:mm)'),
  lugar: z.string().optional(),
  encargado: z.string().optional(),
  detalle: z.string().describe('Redaccion formal y resumida del hecho'),
});

function extractFirstJsonObject(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('La respuesta de IA no contiene JSON valido.');
  }
  return JSON.parse(match[0]);
}

function safeSnippet(value: string, max = 160): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

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

      Devuelve SOLO un JSON valido con esta estructura exacta:
      {
        "textoMejorado": "string",
        "resumen": "string"
      }
    `;

    const response = await ai.generate(prompt);
    const parsed = extractFirstJsonObject(response.text);
    return RedaccionOutput.parse(parsed);
  }
);

export const extraerDatosCasoFlow = ai.defineFlow(
  {
    name: 'extraerDatosCaso',
    inputSchema: ExtraccionCasoInput,
    outputSchema: ExtraccionCasoOutput,
  },
  async (input) => {
    if (!input.textoReporte.trim()) {
      throw new Error('No se recibio texto para extraer datos del caso.');
    }

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
        prompt,
        config: {
          temperature: 0.1,
        },
      });
      const parsed = extractFirstJsonObject(response.text);
      return ExtraccionCasoOutput.parse(parsed);
    } catch (e) {
      throw new Error(`Fallo al extraer datos del caso: ${safeSnippet(String(e))}`);
    }
  }
);
