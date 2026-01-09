'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Shield, Key, Mail, Loader2, AlertTriangle, X } from 'lucide-react';
import { userService } from '@/services/userService';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Dev Modal State
    const [showDevModal, setShowDevModal] = useState(false);
    const [devEmail, setDevEmail] = useState('');
    const [devPass, setDevPass] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') {
                setError('Correo o contraseña incorrectos');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Demasiados intentos fallidos. Intente más tarde.');
            } else {
                setError('Error al iniciar sesión: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * FUNCIÓN TEMPORAL PARA CREAR EL PRIMER ADMIN
     */
    const handleFirstAdminSetup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!devEmail || !devPass) {
            alert('Completa ambos campos');
            return;
        }

        if (devPass.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            // 1. Crear usuario en Auth
            const userCredential = await createUserWithEmailAndPassword(auth, devEmail, devPass);
            const user = userCredential.user;

            // 2. Crear perfil Admin en Firestore
            await userService.createUserProfile(user.uid, {
                email: devEmail,
                role: 'admin',
                nombreCompleto: 'Administrador Sistema',
                grado: 'Admin',
                isActive: true,
                createdAt: new Date()
            });

            alert('✅ Usuario Administrador creado exitosamente. Ahora inicia sesión.');
            setEmail(devEmail);
            setPassword('');
            setShowDevModal(false);
        } catch (error: any) {
            alert('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                    <div className="text-center mb-8">
                        <div className="inline-flex p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg mb-4">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">App Supervisor</h1>
                        <p className="text-slate-400">Sistema de Control y Novedades</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-12 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                    placeholder="nombre@ejemplo.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Contraseña</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white px-12 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>

                    {/* Developer Tool for First Admin */}
                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <button
                            onClick={() => setShowDevModal(true)}
                            className="text-xs text-slate-600 hover:text-slate-400 transition-colors underline cursor-pointer"
                        >
                            ¿Configuración inicial? (Dev Only)
                        </button>
                    </div>
                </div>
            </div>

            {/* DEV SETUP MODAL */}
            {showDevModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Crear Primer Administrador</h3>
                            <button onClick={() => setShowDevModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleFirstAdminSetup} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Email Admin</label>
                                <input
                                    type="email"
                                    required
                                    value={devEmail}
                                    onChange={e => setDevEmail(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="admin@sistema.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Password</label>
                                <input
                                    type="text"
                                    required
                                    value={devPass}
                                    onChange={e => setDevPass(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="min 6 chars"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDevModal(false)}
                                    className="flex-1 py-2 text-slate-400 hover:text-white transition-colors border border-slate-600 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors"
                                >
                                    Crear Admin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
