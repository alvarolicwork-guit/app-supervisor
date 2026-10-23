import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-emerald-600" />
                <p className="text-sm text-slate-600">Cargando...</p>
            </div>
        </div>
    );
}
