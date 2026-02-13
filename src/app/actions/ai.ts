'use server';

import { generateContentDirect } from '@/ai/geminiDirect';

export async function generateContentAction(prompt: string): Promise<string> {
    try {
        const result = await generateContentDirect(prompt);
        return result;
    } catch (error: any) {
        console.error('Server Action Error:', error);
        throw new Error(error.message || 'Error en el servidor de IA');
    }
}
