'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Ruta legacy. El panel operativo actual vive en `/` y en `/servicio/[id]`.
 * Se conserva esta entrada solo para redirigir enlaces antiguos.
 */
export default function LegacyServicioPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/');
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm text-slate-600">Redirigiendo al panel principal...</p>
            </div>
        </div>
    );
}
