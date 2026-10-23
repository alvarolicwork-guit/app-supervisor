import { z } from 'zod';

export const promptSchema = z
    .string()
    .trim()
    .min(1, 'El texto no puede estar vacío.')
    .max(20_000, 'El texto es demasiado largo (máximo 20.000 caracteres).');

export const contextSchema = z
    .string()
    .trim()
    .max(1_000, 'El contexto es demasiado largo (máximo 1.000 caracteres).')
    .optional();

export const fileDataSchema = z
    .object({
        base64: z
            .string()
            .min(1)
            .max(4_500_000, 'El archivo es demasiado grande (máximo aproximado 3 MB).'),
        mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
    })
    .optional();
