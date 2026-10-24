'use client';

import { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { KeyRound, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/services/userService';
import { validarPasswordSegura } from '@/utils/password';

export function CambioPasswordObligatorio() {
    const { user, logout } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmacion, setConfirmacion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [completado, setCompletado] = useState(false);

    const errores = validarPasswordSegura(password);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!user) {
            setError('La sesión no es válida. Vuelve a iniciar sesión.');
            return;
        }
        if (errores.length > 0) {
            setError(errores[0]);
            return;
        }
        if (password !== confirmacion) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            await updatePassword(user, password);
            await userService.completePasswordChange(user.uid);
            setCompletado(true);
            window.setTimeout(() => window.location.assign('/'), 800);
        } catch (err) {
            const code = err instanceof Error && 'code' in err ? String(err.code) : '';
            if (code.includes('requires-recent-login')) {
                setError('Por seguridad, vuelve a iniciar sesión y cambia la contraseña inmediatamente.');
            } else {
                setError('No se pudo cambiar la contraseña. Intenta nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (completado) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
                <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
                    <ShieldCheck className="mx-auto h-12 w-12 text-emerald-600" />
                    <h1 className="mt-4 text-xl font-bold text-slate-900">Contraseña actualizada</h1>
                    <p className="mt-2 text-sm text-slate-600">Ya puedes ingresar al sistema.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <KeyRound className="h-5 w-5" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Cambio de contraseña obligatorio</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Es tu primer ingreso. Debes reemplazar la contraseña inicial antes de continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="app-label">Nueva contraseña</label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="app-input mt-1.5"
                            placeholder="Mínimo 12 caracteres"
                            required
                        />
                    </div>
                    <div>
                        <label className="app-label">Confirmar contraseña</label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={confirmacion}
                            onChange={(event) => setConfirmacion(event.target.value)}
                            className="app-input mt-1.5"
                            placeholder="Repite la contraseña"
                            required
                        />
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                        <p className="font-semibold text-slate-700">La contraseña debe tener:</p>
                        <ul className="mt-1 space-y-0.5">
                            <li className={password.length >= 12 ? 'text-emerald-700' : ''}>• 12 caracteres como mínimo</li>
                            <li className={/[A-Z]/.test(password) ? 'text-emerald-700' : ''}>• Una mayúscula</li>
                            <li className={/[a-z]/.test(password) ? 'text-emerald-700' : ''}>• Una minúscula</li>
                            <li className={/[0-9]/.test(password) ? 'text-emerald-700' : ''}>• Un número</li>
                            <li className={/[^A-Za-z0-9]/.test(password) ? 'text-emerald-700' : ''}>• Un símbolo</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="app-btn-primary w-full">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        {loading ? 'Actualizando...' : 'Cambiar contraseña'}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => void logout()}
                    className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
                >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
}
