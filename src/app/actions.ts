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

export async function extraerDatosCasoAction(textoReporte: string) {
    try {
        return await extraerDatosCasoFlow({ textoReporte });
    } catch (error) {
        throw new Error(`Falló la extracción del caso: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
}

export async function transformarTareasPasadoAction(texto: string) {
    const base = texto.trim();
    if (!base) return '';

    try {
        const resultado = await mejorarRedaccionFlow({
            textoBase: base,
            tipo: 'informe',
            contexto: 'Reescribe exclusivamente en tiempo pasado, manteniendo el mismo significado. No agregues datos nuevos, no elimines datos, no cambies nombres propios ni cifras. Devuelve solo el texto final.',
        });

        return resultado.textoMejorado.trim();
    } catch {
        return base;
    }
}

export async function generarInformeInstitucionalIAAction(borrador: string) {
    const base = borrador.trim();
    if (!base) return '';

    try {
        const resultado = await mejorarRedaccionFlow({
            textoBase: base,
            tipo: 'informe',
            contexto: 'Reescribe este borrador como informe institucional policial en tiempo pasado, manteniendo todos los datos, nombres, horas y cifras exactamente como estan. No inventes informacion ni elimines secciones. Devuelve solo el texto final.',
        });

        return resultado.textoMejorado.trim();
    } catch {
        return base;
    }
}
