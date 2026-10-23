'use server';

import { ZodError } from 'zod';
import { generateContentDirect } from '@/ai/geminiDirect';
import { fileDataSchema, promptSchema } from '@/lib/aiValidation';
import { enforceRateLimit } from '@/lib/rateLimit';
import { AuthError, requireActiveUser } from '@/lib/serverAuth';

export async function generateContentAction(
    idToken: string,
    prompt: string,
    fileData?: { base64: string; mimeType: string }
): Promise<string> {
    try {
        const user = await requireActiveUser(idToken);
        const safePrompt = promptSchema.parse(prompt);
        const safeFile = fileDataSchema.parse(fileData);

        await enforceRateLimit(user.uid, 'generate');
        return await generateContentDirect(safePrompt, safeFile);
    } catch (error) {
        console.error('Server Action Error:', error);

        if (error instanceof AuthError) {
            throw new Error(error.message);
        }
        if (error instanceof ZodError) {
            throw new Error(error.issues[0]?.message || 'Solicitud inválida.');
        }
        throw new Error('No se pudo procesar la solicitud con IA. Intenta nuevamente.');
    }
}
