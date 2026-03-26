'use server';

import { generateContentDirect } from '@/ai/geminiDirect';

export async function generateContentAction(prompt: string, fileData?: { base64: string, mimeType: string }): Promise<string> {
    try {
        const result = await generateContentDirect(prompt, fileData);
        return result;
    } catch (error: any) {
        console.error('Server Action Error:', error);
        throw new Error(error.message || 'Error en el servidor de IA');
    }
}
