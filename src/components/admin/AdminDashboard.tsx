'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Users, Shield, FileText, Plus, Search, Loader2, CheckCircle, X, Eye } from 'lucide-react';
import { userService, UserProfile } from '@/services/userService';
import { getAllServiciosAdmin, ServicioSupervisor } from '@/services/servicioSupervisorService';
import { useRouter } from 'next/navigation';

export function AdminDashboard() {
    const { logout, userProfile } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'usuarios' | 'servicios'>('dashboard');

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Admin Header */}
            <div className="bg-slate-900 text-white shadow-lg sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold hidden md:block">Panel de Administración</h1>
                            <h1 className="text-lg font-bold md:hidden">Admin</h1>
                            <p className="text-xs text-slate-400 hidden md:block">Control Centralizado</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Inicio
                        </button>
                        <button
                            onClick={() => setActiveTab('usuarios')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'usuarios' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Usuarios
                        </button>
                        <button
                            onClick={() => setActiveTab('servicios')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'servicios' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Servicios
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold">{userProfile?.nombreCompleto}</p>
                            <p className="text-xs text-slate-400">Administrador</p>
                        </div>
                        <button
                            onClick={() => logout()}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {activeTab === 'dashboard' && <ResumenTab onChangeTab={setActiveTab} />}
                {activeTab === 'usuarios' && <UsuariosTab />}
                {activeTab === 'servicios' && <ServiciosTab router={router} />}
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

function ResumenTab({ onChangeTab }: { onChangeTab: (tab: any) => void }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            {/* User Management Card */}
            <div
                onClick={() => onChangeTab('usuarios')}
                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Users className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Acceso Rápido</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800">Gestión de Usuarios</h3>
                <p className="text-slate-500 mt-2">Registrar nuevos supervisores, administrar accesos y perfiles.</p>
                <div className="mt-6 flex items-center text-blue-600 font-semibold text-sm">
                    Ir a Usuarios <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </div>

            {/* Reports Card */}
            <div
                onClick={() => onChangeTab('servicios')}
                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="p-4 bg-purple-50 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <FileText className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Acceso Rápido</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800">Servicios Globales</h3>
                <p className="text-slate-500 mt-2">Monitoreo de todos los servicios cerrados y en curso.</p>
                <div className="mt-6 flex items-center text-purple-600 font-semibold text-sm">
                    Ver Servicios <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </div>
        </div>
    );
}

function UsuariosTab() {
    const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const cargarUsuarios = async () => {
        setLoading(true);
        try {
            const data = await userService.getSupervisores();
            setUsuarios(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Supervisores Registrados</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-blue-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Supervisor
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Registro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {usuarios.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                                        No hay usuarios registrados
                                    </td>
                                </tr>
                            ) : (
                                usuarios.map((user) => (
                                    <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                                                    {user.grado ? user.grado.substring(0, 2) : 'US'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{user.grado} {user.nombreCompleto}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {user.celular || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {user.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.createdAt.toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <RegistroUsuarioModal
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        setShowForm(false);
                        cargarUsuarios();
                    }}
                />
            )}
        </div>
    );
}

function RegistroUsuarioModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [grado, setGrado] = useState('');
    const [nombre, setNombre] = useState('');
    const [celular, setCelular] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await userService.createSupervisorUser(email, password, {
                grado,
                nombreCompleto: nombre,
                celular
            });
            alert('✅ Usuario creado exitosamente');
            onSuccess();
        } catch (error: any) {
            console.error(error);
            alert('❌ Error al crear usuario: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="bg-blue-600 p-6 rounded-t-2xl flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold">Nuevo Supervisor</h2>
                    <button onClick={onClose} className="hover:bg-blue-700 p-2 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Grado</label>
                            <input type="text" required className="w-full px-3 py-2 border rounded-lg" value={grado} onChange={e => setGrado(e.target.value)} placeholder="Ej: Sbtte." />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Celular</label>
                            <input type="tel" className="w-full px-3 py-2 border rounded-lg" value={celular} onChange={e => setCelular(e.target.value)} placeholder="Opcional" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                        <input type="text" required className="w-full px-3 py-2 border rounded-lg" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Juan Perez" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Correo (Usuario)</label>
                        <input type="email" required className="w-full px-3 py-2 border rounded-lg" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@policia.bo" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña Inicial</label>
                        <input type="text" required className="w-full px-3 py-2 border rounded-lg font-mono text-blue-600 bg-blue-50" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50">
                            {loading ? 'Creando...' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ServiciosTab({ router }: { router: any }) {
    const [servicios, setServicios] = useState<ServicioSupervisor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarServicios();
    }, []);

    const cargarServicios = async () => {
        try {
            const data = await getAllServiciosAdmin();
            setServicios(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Servicios Globales</h2>
            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                </div>
            ) : (
                <div className="space-y-4">
                    {servicios.length === 0 ? (
                        <p className="text-center text-slate-500 italic py-8">No hay servicios registrados en el sistema.</p>
                    ) : (
                        servicios.map((servicio) => (
                            <div key={servicio.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${servicio.estado === 'abierto' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                                                {servicio.estado}
                                            </span>
                                            <span className="text-sm text-slate-400">
                                                {servicio.createdAt.toLocaleString()}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">Memo: {servicio.apertura.nroMemorandum}</h3>
                                        <p className="text-sm text-slate-600">
                                            <span className="font-semibold">{servicio.apertura.supervisorActual.grado} {servicio.apertura.supervisorActual.nombreCompleto}</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/servicio/${servicio.id}`)}
                                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
