import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <FileQuestion className="h-7 w-7" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Página no encontrada</h1>
                <p className="mt-2 text-sm text-slate-600">
                    La ruta solicitada no existe o el registro fue archivado.
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                    Volver al panel
                </Link>
            </div>
        </div>
    );
}
