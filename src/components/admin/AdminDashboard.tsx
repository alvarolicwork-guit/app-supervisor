'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Users, Shield, FileText, Plus, Loader2, X, Eye, TriangleAlert, Trash2, Archive, Pencil, KeyRound, UserCheck, UserX, History } from 'lucide-react';
import { archivarServicio, type TipoServicioArchivable } from '@/services/archivoService';
import { userService, UserProfile, UserRole } from '@/services/userService';
import { cleanupExpiredSupervisorServicios, getAllServiciosAdmin, ServicioSupervisor } from '@/services/servicioSupervisorService';
import { cleanupExpiredJefeOperativoServicios, getAllServiciosJefeOperativoAdmin } from '@/services/jefeOperativoService';
import type { ServicioJefeOperativo } from '@/types/jefeOperativo';
import { useRouter } from 'next/navigation';
import { InlineAlert, type InlineAlertData } from '@/components/ui/InlineAlert';

export function AdminDashboard() {
    const { logout, userProfile } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'usuarios' | 'servicios'>('dashboard');

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Admin Header */}
            <div className="bg-slate-900 text-white shadow-lg sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 space-y-3 md:space-y-0 md:flex md:justify-between md:items-center">
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

                    <div className="overflow-x-auto">
                    <div className="flex bg-slate-800 rounded-lg p-1 min-w-max">
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
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold">{userProfile?.nombreCompleto}</p>
                            <p className="text-xs text-slate-400">Administrador</p>
                        </div>
                        <a
                            href="/historial"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
                            title="Abrir historial en una nueva ventana"
                        >
                            <History className="w-5 h-5" />
                        </a>
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
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                {activeTab === 'dashboard' && <ResumenTab onChangeTab={setActiveTab} />}
                {activeTab === 'usuarios' && <UsuariosTab />}
                {activeTab === 'servicios' && <ServiciosTab router={router} />}
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

function ResumenTab({ onChangeTab }: { onChangeTab: (tab: 'dashboard' | 'usuarios' | 'servicios') => void }) {
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
    const { userProfile } = useAuth();
    const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [notice, setNotice] = useState<InlineAlertData | null>(null);
    const [actionId, setActionId] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editGrado, setEditGrado] = useState('');
    const [editNombre, setEditNombre] = useState('');
    const [editCelular, setEditCelular] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [pendingArchiveUser, setPendingArchiveUser] = useState<UserProfile | null>(null);
    const [motivoUsuario, setMotivoUsuario] = useState('');
    const [archivandoUsuario, setArchivandoUsuario] = useState<string | null>(null);

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const cargarUsuarios = async () => {
        setLoading(true);
        try {
            const data = await userService.getUsuarios();
            setUsuarios(data);
        } catch (e) {
            console.error(e);
            setNotice({ type: 'error', message: 'No se pudieron cargar los usuarios.' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (usuario: UserProfile) => {
        setActionId(usuario.uid);
        try {
            await userService.setUserActive(usuario.uid, !usuario.isActive);
            setNotice({
                type: 'success',
                message: `Usuario ${usuario.isActive ? 'desactivado' : 'activado'} correctamente.`,
            });
            await cargarUsuarios();
        } catch (error) {
            console.error(error);
            setNotice({
                type: 'error',
                message: `No se pudo cambiar el estado: ${error instanceof Error ? error.message : 'error desconocido'}`,
            });
        } finally {
            setActionId(null);
        }
    };

    const handleResetPassword = async (usuario: UserProfile) => {
        setActionId(usuario.uid);
        try {
            await userService.sendPasswordReset(usuario.email);
            setNotice({
                type: 'success',
                message: `Se envió un correo de restablecimiento a ${usuario.email}.`,
            });
        } catch (error) {
            console.error(error);
            setNotice({
                type: 'error',
                message: 'No se pudo enviar el correo de restablecimiento.',
            });
        } finally {
            setActionId(null);
        }
    };

    const abrirEdicion = (usuario: UserProfile) => {
        setEditingUser(usuario);
        setEditGrado(usuario.grado || '');
        setEditNombre(usuario.nombreCompleto || '');
        setEditCelular(usuario.celular || '');
    };

    const guardarEdicion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setSavingEdit(true);
        try {
            await userService.updateSupervisorProfile(editingUser.uid, {
                grado: editGrado.trim(),
                nombreCompleto: editNombre.trim(),
                celular: editCelular.trim(),
            });
            setNotice({ type: 'success', message: 'Perfil actualizado correctamente.' });
            setEditingUser(null);
            await cargarUsuarios();
        } catch (error) {
            console.error(error);
            setNotice({
                type: 'error',
                message: `No se pudo actualizar el perfil: ${error instanceof Error ? error.message : 'error desconocido'}`,
            });
        } finally {
            setSavingEdit(false);
        }
    };

    const handleArchiveUser = async () => {
        if (!pendingArchiveUser) return;

        setArchivandoUsuario(pendingArchiveUser.uid);
        try {
            await userService.archiveUserProfile(pendingArchiveUser.uid, motivoUsuario);
            setNotice({
                type: 'success',
                message: 'Perfil archivado. La cuenta de Authentication debe eliminarse con el script si corresponde.',
            });
            setPendingArchiveUser(null);
            setMotivoUsuario('');
            await cargarUsuarios();
        } catch (error) {
            console.error(error);
            setNotice({
                type: 'error',
                message: `No se pudo archivar el perfil: ${error instanceof Error ? error.message : 'error desconocido'}`,
            });
        } finally {
            setArchivandoUsuario(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800">Usuarios Registrados</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-blue-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Usuario
                </button>
            </div>

            {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Registro</th>
                                <th className="sticky right-0 z-10 bg-slate-50 px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.15)]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {usuarios.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
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
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>
                                                {user.role === 'admin' ? 'Administrador' : 'Supervisor'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {user.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.createdAt.toLocaleDateString()}
                                        </td>
                                        <td className="sticky right-0 z-10 bg-white px-3 py-4 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)]">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => abrirEdicion(user)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                    title="Editar perfil"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => void handleToggleActive(user)}
                                                    disabled={actionId === user.uid}
                                                    className={`p-2 rounded-lg disabled:opacity-50 ${user.isActive ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                    title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                                                >
                                                    {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => void handleResetPassword(user)}
                                                    disabled={actionId === user.uid}
                                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50"
                                                    title="Enviar correo de restablecimiento"
                                                >
                                                    <KeyRound className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setMotivoUsuario('');
                                                        setPendingArchiveUser(user);
                                                    }}
                                                    disabled={actionId === user.uid || user.uid === userProfile?.uid}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                                    title="Archivar perfil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>
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

            {pendingArchiveUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-red-700 p-5 rounded-t-2xl flex justify-between items-center text-white">
                            <h2 className="text-lg font-bold">Archivar perfil</h2>
                            <button onClick={() => setPendingArchiveUser(null)} className="p-2 hover:bg-white/10 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">
                                Se archivará el perfil de{' '}
                                <strong>{pendingArchiveUser.grado} {pendingArchiveUser.nombreCompleto}</strong>{' '}
                                y se eliminará de la colección de usuarios. La cuenta de Authentication no se
                                elimina; para eso usa <code className="text-xs">npm run user:delete</code>.
                            </p>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Motivo</label>
                                <textarea
                                    value={motivoUsuario}
                                    onChange={(e) => setMotivoUsuario(e.target.value.slice(0, 300))}
                                    rows={3}
                                    maxLength={300}
                                    placeholder="Ej: retiro, duplicado, corrección..."
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                                <p className="text-right text-[10px] text-slate-400">{motivoUsuario.length}/300</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPendingArchiveUser(null)}
                                    className="flex-1 py-3 border rounded-xl font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => void handleArchiveUser()}
                                    disabled={motivoUsuario.trim().length < 3 || archivandoUsuario !== null}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
                                >
                                    {archivandoUsuario ? 'Archivando...' : 'Archivar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editingUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-slate-900 p-5 rounded-t-2xl flex justify-between items-center text-white">
                            <h2 className="text-lg font-bold">Editar Usuario</h2>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={guardarEdicion} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Grado</label>
                                <input
                                    type="text"
                                    required
                                    value={editGrado}
                                    onChange={(e) => setEditGrado(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre completo</label>
                                <input
                                    type="text"
                                    required
                                    value={editNombre}
                                    onChange={(e) => setEditNombre(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Celular</label>
                                <input
                                    type="tel"
                                    value={editCelular}
                                    onChange={(e) => setEditCelular(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="Opcional"
                                />
                            </div>
                            <p className="text-xs text-slate-500">Correo: {editingUser.email}</p>
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-3 border rounded-xl font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {savingEdit ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
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
    const [role, setRole] = useState<UserRole>('supervisor');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<InlineAlertData | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await userService.createUser(
                email,
                password,
                {
                    grado,
                    nombreCompleto: nombre,
                    celular,
                },
                role
            );
            setNotice({
                type: 'success',
                message: `Usuario ${role === 'admin' ? 'administrador' : 'supervisor'} creado exitosamente.`,
            });
            onSuccess();
        } catch (error) {
            console.error(error);
            setNotice({
                type: 'error',
                message: `Error al crear usuario: ${error instanceof Error ? error.message : 'error desconocido'}`,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="bg-blue-600 p-6 rounded-t-2xl flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold">Nuevo Usuario</h2>
                    <button onClick={onClose} className="hover:bg-blue-700 p-2 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}

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
                        <label className="block text-sm font-bold text-gray-700 mb-1">Rol</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full px-3 py-2 border rounded-lg bg-white"
                        >
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Correo (Usuario)</label>
                        <input type="email" required className="w-full px-3 py-2 border rounded-lg" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@policia.bo" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña Inicial</label>
                        <input type="password" required minLength={6} className="w-full px-3 py-2 border rounded-lg font-mono text-blue-600 bg-blue-50" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
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


function ServiciosTab({ router }: { router: ReturnType<typeof useRouter> }) {
    const [servicios, setServicios] = useState<ServicioSupervisor[]>([]);
    const [jefes, setJefes] = useState<ServicioJefeOperativo[]>([]);
    const [loading, setLoading] = useState(true);
    const [archivandoId, setArchivandoId] = useState<string | null>(null);
    const [notice, setNotice] = useState<InlineAlertData | null>(null);
    const [pendingArchive, setPendingArchive] = useState<{
        tipo: TipoServicioArchivable;
        id: string;
    } | null>(null);
    const [motivoArchivo, setMotivoArchivo] = useState('');
    const [cleaningExpired, setCleaningExpired] = useState(false);

    useEffect(() => {
        cargarServicios();
    }, []);

    const cargarServicios = async () => {
        try {
            const [data, jefesData] = await Promise.all([
                getAllServiciosAdmin(),
                getAllServiciosJefeOperativoAdmin(),
            ]);
            setServicios(data);
            setJefes(jefesData);
        } catch (e) {
            console.error(e);
            setNotice({ type: 'error', message: 'No se pudieron cargar los servicios.' });
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async (tipo: TipoServicioArchivable, id: string) => {
        setArchivandoId(id);
        try {
            await archivarServicio(tipo, id, motivoArchivo);

            if (tipo === 'supervisor') {
                setServicios(prev => prev.filter(s => s.id !== id));
            } else {
                setJefes(prev => prev.filter(s => s.id !== id));
            }

            setNotice({ type: 'success', message: 'Servicio archivado correctamente.' });
            setPendingArchive(null);
            setMotivoArchivo('');
        } catch (error) {
            console.error(error);
            setNotice({
                type: 'error',
                message: `Error al archivar: ${error instanceof Error ? error.message : 'error desconocido'}`,
            });
        } finally {
            setArchivandoId(null);
        }
    };

    const handleCleanupExpired = async () => {
        setCleaningExpired(true);
        try {
            const [deletedSupervisor, deletedJefe] = await Promise.all([
                cleanupExpiredSupervisorServicios(),
                cleanupExpiredJefeOperativoServicios(),
            ]);

            await cargarServicios();

            setNotice({
                type: 'success',
                message: `Limpieza completada. Eliminados: Supervisor ${deletedSupervisor}, Jefe Operativo ${deletedJefe}.`,
            });
        } catch (error) {
            console.error(error);
            setNotice({
                type: 'error',
                message: `No se pudo completar la limpieza: ${error instanceof Error ? error.message : 'error desconocido'}`,
            });
        } finally {
            setCleaningExpired(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-slate-800">Servicios Globales</h2>
                <button
                    onClick={handleCleanupExpired}
                    disabled={cleaningExpired}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Elimina servicios cerrados vencidos (fallback Spark)"
                >
                    {cleaningExpired ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Limpiar vencidos (9 días)
                </button>
            </div>
            {notice && <InlineAlert notice={notice} onClose={() => setNotice(null)} />}
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
                            <div key={servicio.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all group/item">
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

                                    <div className="flex items-center gap-2">
                                        {/* Archivar (Solo para cerrados) */}
                                        {servicio.estado === 'cerrado' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (servicio.id) {
                                                        setMotivoArchivo('');
                                                        setPendingArchive({ tipo: 'supervisor', id: servicio.id });
                                                    }
                                                }}
                                                disabled={archivandoId === servicio.id}
                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                title="Archivar registro"
                                            >
                                                {archivandoId === servicio.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Archive className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => router.push(`/servicio/${servicio.id}`)}
                                            className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Ver
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <div className="mt-10">
                <h3 className="mb-3 text-lg font-bold text-slate-800">Servicios de Jefe Operativo</h3>
                {jefes.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white py-6 text-center text-sm italic text-slate-500">
                        No hay servicios de Jefe Operativo registrados.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {jefes.map((jefe) => (
                            <div key={jefe.id} className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="mb-1 flex items-center gap-2">
                                            <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${jefe.estado === 'abierto' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {jefe.estado}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {jefe.createdAt.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="font-bold text-slate-900">
                                            {jefe.apertura.nroPlanOperaciones || 'Sin plan de operaciones'}
                                        </p>
                                        {(jefe.apertura.turnoEtiqueta || jefe.apertura.turno) && (
                                            <p className="text-xs font-semibold text-indigo-600">
                                                {jefe.apertura.turnoEtiqueta || jefe.apertura.turno}
                                                {jefe.apertura.horarioTurno ? ` · ${jefe.apertura.horarioTurno}` : ''}
                                            </p>
                                        )}
                                        <p className="text-sm text-slate-600">
                                            {jefe.apertura.tipoServicio || 'Sin tipo de servicio'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Jefe: {jefe.apertura.jefeOperativo || 'Sin registro'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {jefe.estado === 'cerrado' && jefe.id && (
                                            <button
                                                onClick={() => {
                                                    setMotivoArchivo('');
                                                    setPendingArchive({ tipo: 'jefe', id: jefe.id as string });
                                                }}
                                                disabled={archivandoId === jefe.id}
                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                                title="Archivar registro"
                                            >
                                                {archivandoId === jefe.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Archive className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => router.push(`/jefe-operativo/${jefe.id}`)}
                                            className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-100"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Ver
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {pendingArchive && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 md:p-6 shadow-xl">
                        <div className="mb-3 flex items-center gap-2 text-amber-700">
                            <TriangleAlert className="h-5 w-5" />
                            <h3 className="font-bold">Archivar registro</h3>
                        </div>
                        <p className="mb-4 text-sm text-slate-600">
                            El registro se moverá al archivo y quedará disponible para auditoría. No se
                            elimina definitivamente.
                        </p>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Motivo del archivado
                        </label>
                        <textarea
                            value={motivoArchivo}
                            onChange={(e) => setMotivoArchivo(e.target.value.slice(0, 300))}
                            rows={3}
                            maxLength={300}
                            placeholder="Ej: cierre de gestión, duplicado, corrección..."
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                        <p className="mt-1 text-right text-[10px] text-slate-400">
                            {motivoArchivo.length}/300
                        </p>
                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={() => {
                                    setPendingArchive(null);
                                    setMotivoArchivo('');
                                }}
                                className="flex-1 rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => void handleArchive(pendingArchive.tipo, pendingArchive.id)}
                                disabled={motivoArchivo.trim().length < 3 || archivandoId !== null}
                                className="flex-1 rounded-xl bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Archivar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
