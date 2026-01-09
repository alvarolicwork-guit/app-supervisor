'use server';

import { mejorarRedaccionFlow, extraerDatosCasoFlow } from '@/ai/flows';

export async function mejorarTextoAction(texto: string, contexto?: string) {
    try {
        // En Genkit 1.x+, podemos invocar el flujo directamente como una función asíncrona
        // cuando estamos ejecutando en el mismo entorno de servidor (Next.js server action).
        const resultado = await mejorarRedaccionFlow({
            textoBase: texto,
            contexto: contexto,
            tipo: 'novedad',
        });
        return resultado;
    } catch (error) {
        console.error('Error al ejecutar flujo de IA:', error);
        // Retornamos un error controlado para no romper la UI
        throw new Error('No se pudo procesar la solicitud con IA. Verifique su conexión o credenciales.');
    }
}

import { generateContentDirect } from '@/ai/geminiDirect';

// ... (codigo anterior) ...

export async function extraerDatosCasoAction(textoReporte: string) {
    console.log("Server Action (Direct): Procesando texto:", textoReporte.substring(0, 30));

    const prompt = `
      Eres un asistente experto en reportes policiales. Analiza este texto:
      "${textoReporte}"
      
      Extrae en JSON:
      {
        "tipo": "String (ej. Robo, Riña)",
        "hora": "String (HH:mm)",
        "lugar": "String",
        "encargado": "String",
        "detalle": "String (Resumen formal)"
      }
      SOLO JSON.
    `;

    try {
        const rawText = await generateContentDirect(prompt);
        console.log("Gemini Raw:", rawText);

        // Parsing robusto
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No se encontró JSON en la respuesta");

        return JSON.parse(jsonMatch[0]);

    } catch (error: any) {
        console.error('CRITICAL ERROR Gemini Direct:', error);
        throw new Error(`Falló la extracción (Directo): ${error.message}`);
    }
}
