export async function generateContentDirect(prompt: string) {
    const API_KEY = process.env.GOOGLE_AI_API_KEY;

    if (!API_KEY) {
        throw new Error('❌ GOOGLE_AI_API_KEY no está configurada. Crea un archivo .env.local con tu API key.');
    }
    // Modelos disponibles confirmados en el entorno del usuario (Dec 2025)
    const MODELS_TO_TRY = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-pro-latest'];

    let lastError = null;

    for (const model of MODELS_TO_TRY) {
        try {
            console.log(`DirectGemini: Intentando con modelo '${model}'...`);
            const URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

            const payload = {
                contents: [{ parts: [{ text: prompt }] }]
            };

            const response = await fetch(URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`DirectGemini: Falló ${model}:`, errorText);
                throw new Error(`[${model}] ${response.status} ${errorText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Respuesta vacía');

            return text; // ¡Éxito!

        } catch (e) {
            lastError = e;
            // Continuar con el siguiente modelo
        }
    }

    // Si llegamos aquí, ninguno funcionó. Intentemos listar modelos para diagnóstico.
    console.log("DirectGemini: Todos los modelos fallaron. Listando disponibles...");
    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const listResp = await fetch(listUrl);
        if (listResp.ok) {
            const listData = await listResp.json();
            console.log("DirectGemini: Modelos Disponibles en tu cuenta:", JSON.stringify(listData, null, 2));
            throw new Error(`Ningún modelo funcionó. Modelos disponibles: ${listData.models?.map((m: any) => m.name).join(', ') || 'NINGUNO'}`);
        } else {
            const listErr = await listResp.text();
            console.error("DirectGemini: Error al listar modelos:", listErr);
            throw new Error(`Error fatal: No se pueden listar modelos (${listErr}). Revisa tu API KEY.`);
        }
    } catch (listError: any) {
        throw new Error(`Diagnóstico final: ${listError.message}`);
    }
}
