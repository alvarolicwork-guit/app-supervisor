'use server';

import { ZodError } from 'zod';
import { extraerDatosCasoFlow, mejorarRedaccionFlow } from '@/ai/flows';
import { contextSchema, promptSchema } from '@/lib/aiValidation';
import { enforceRateLimit } from '@/lib/rateLimit';
import { AuthError, requireActiveUser } from '@/lib/serverAuth';

async function authorize(idToken: string, action: string): Promise<void> {
    const user = await requireActiveUser(idToken);
    await enforceRateLimit(user.uid, action);
}

function toPublicError(error: unknown, fallback: string): Error {
    if (error instanceof AuthError) return new Error(error.message);
    if (error instanceof ZodError) {
        return new Error(error.issues[0]?.message || 'Solicitud inválida.');
    }
    return new Error(fallback);
}

export async function mejorarTextoAction(idToken: string, texto: string, contexto?: string) {
    try {
        await authorize(idToken, 'mejorar');
        const textoBase = promptSchema.parse(texto);
        const contextoValidado = contextSchema.parse(contexto);

        return await mejorarRedaccionFlow({
            textoBase,
            contexto: contextoValidado,
            tipo: 'novedad',
        });
    } catch (error) {
        console.error('Error al ejecutar flujo de IA:', error);
        throw toPublicError(
            error,
            'No se pudo procesar la solicitud con IA. Verifique su conexión o credenciales.'
        );
    }
}

export async function extraerDatosCasoAction(idToken: string, textoReporte: string) {
    try {
        await authorize(idToken, 'extraer-caso');
        const texto = promptSchema.parse(textoReporte);
        return await extraerDatosCasoFlow({ textoReporte: texto });
    } catch (error) {
        console.error('Error al extraer datos del caso:', error);
        if (error instanceof AuthError || error instanceof ZodError) {
            throw toPublicError(error, 'Solicitud inválida.');
        }
        throw new Error('No se pudo extraer la información del caso. Intenta nuevamente.');
    }
}

export async function transformarTareasPasadoAction(idToken: string, texto: string) {
    const base = texto.trim();
    if (!base) return '';

    await authorize(idToken, 'transformar-tareas');
    const textoBase = promptSchema.parse(base);

    try {
        const resultado = await mejorarRedaccionFlow({
            textoBase,
            tipo: 'informe',
            contexto:
                'Reescribe exclusivamente en tiempo pasado, manteniendo el mismo significado. No agregues datos nuevos, no elimines datos, no cambies nombres propios ni cifras. Devuelve solo el texto final.',
        });

        return resultado.textoMejorado.trim();
    } catch {
        return base;
    }
}

export async function generarInformeInstitucionalIAAction(idToken: string, borrador: string) {
    const base = borrador.trim();
    if (!base) return '';

    await authorize(idToken, 'informe-institucional');
    const textoBase = promptSchema.parse(base);

    try {
        const resultado = await mejorarRedaccionFlow({
            textoBase,
            tipo: 'informe',
            contexto:
                'Reescribe este borrador como informe institucional policial en tiempo pasado, manteniendo todos los datos, nombres, horas y cifras exactamente como estan. No inventes informacion ni elimines secciones. Devuelve solo el texto final.',
        });

        return resultado.textoMejorado.trim();
    } catch {
        return base;
    }
}
