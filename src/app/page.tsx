'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AbrirServicioModal } from '@/components/supervisor/AbrirServicioModal';
import { getServicioActivo, type ServicioSupervisor } from '@/services/servicioSupervisorService';
import { getServicioJefeOperativoActivo } from '@/services/jefeOperativoService';
import type { ServicioJefeOperativo } from '@/types/jefeOperativo';
import { ClipboardList, Clock, User, LogOut, Loader2, ShieldAlert, History, ExternalLink } from 'lucide-react';
import { AbrirJefeOperativoModal } from '@/components/jefe-operativo/AbrirJefeOperativoModal';
import { AccessBlocked } from '@/components/auth/AccessBlocked';

export default function HomePage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading, isAdmin, logout } = useAuth();

  const [servicioActivo, setServicioActivo] = useState<ServicioSupervisor | null>(null);
  const [jefeOperativoActivo, setJefeOperativoActivo] = useState<ServicioJefeOperativo | null>(null);

  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showAbrirJefeOperativoModal, setShowAbrirJefeOperativoModal] = useState(false);
  
  const [dataLoading, setDataLoading] = useState(true);

  // Redirección si no está autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const cargarServicios = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [activo, activoJefe] = await Promise.all([
        getServicioActivo(user.uid),
        getServicioJefeOperativoActivo(user.uid),
      ]);

      setServicioActivo(activo);
      setJefeOperativoActivo(activoJefe);
    } catch (error) {
      console.error('Error cargando servicios:', error);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  // Cargar datos solo si es supervisor/usuario estándar
  useEffect(() => {
    if (user && !isAdmin) {
      cargarServicios();
    }
  }, [user, isAdmin, cargarServicios]);

  const handleServicioCreado = (servicioId: string) => {
    setShowAbrirModal(false);
    router.push(`/servicio/${servicioId}`);
  };

  const handleJefeOperativoCreado = (servicioId: string) => {
    setShowAbrirJefeOperativoModal(false);
    router.push(`/jefe-operativo/${servicioId}`);
  };

  const formatFecha = (date: Date) => {
    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null; // Redireccionando...

  if (!userProfile) {
    return (
      <AccessBlocked
        title="Perfil no autorizado"
        message="Tu cuenta existe, pero no tiene un perfil asignado en el sistema. Solicita acceso al administrador."
        onLogout={logout}
      />
    );
  }

  if (userProfile.isActive === false) {
    return (
      <AccessBlocked
        title="Usuario desactivado"
        message="Tu perfil está desactivado. Contacta al administrador para restablecer el acceso."
        onLogout={logout}
      />
    );
  }

  // Vista ADMIN
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Vista SUPERVISOR / JEFE OPERATIVO
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                🚔 App Supervisor
              </h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                  <User className="w-4 h-4" />
                  {userProfile?.grado} {userProfile?.nombreCompleto}
                </div>
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Módulo Operativo</p>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <a
                href="/historial"
                target="_blank"
                rel="noopener noreferrer"
                className="sm:hidden p-2 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
                title="Abrir historial en una nueva ventana"
              >
                <History className="w-5 h-5" />
              </a>
              <a
                href="/historial"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
                title="Abrir historial en una nueva ventana"
              >
                <History className="w-4 h-4" />
                <span className="text-xs font-semibold">Historial</span>
              </a>
              <button
                onClick={() => logout()}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 pb-24">

        {/* Loading Data */}
        {dataLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Cargando módulos y servicios...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Historial de Servicios Cerrados</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Consulta, filtra y exporta los servicios de Supervisor y Jefe Operativo.
                  </p>
                </div>
              </div>
              <a
                href="/historial"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir historial
              </a>
            </div>

            {/* --- SECCIÓN SUPERVISOR 24H --- */}
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 px-1 border-l-4 border-emerald-500 pl-3">Módulo Supervisor 24 Hrs</h2>
              {servicioActivo ? (
                <div className="bg-white rounded-2xl shadow-md border-2 border-emerald-500/20 p-6 relative overflow-hidden group hover:border-emerald-500 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10"></div>
                  <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                        <span className="bg-emerald-100 text-emerald-700 py-1 px-3 rounded-full text-[10px] font-bold tracking-wider">SUPERVISOR EN CURSO</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{servicioActivo.apertura.nroMemorandum}</p>
                      <p className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                        <Clock className="w-4 h-4" />
                        Iniciado: {formatFecha(servicioActivo.apertura.fechaHora)}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/servicio/${servicioActivo.id}`)}
                      className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                    >
                      ABRIR DASHBOARD
                    </button>
                  </div>
                </div>
              ) : jefeOperativoActivo ? (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-amber-900">Tienes un servicio de Jefe Operativo activo</h3>
                  <p className="mt-1 text-sm text-amber-700">
                    Ciérralo antes de abrir un turno de supervisor.
                  </p>
                </div>
              ) : (
                <div onClick={() => setShowAbrirModal(true)} className="bg-white/50 border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 transition-all group">
                  <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:bg-emerald-100">
                    <ClipboardList className="w-6 h-6 text-gray-400 group-hover:text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-gray-700 group-hover:text-emerald-700">Toma de Turno Supervisor</h3>
                  <p className="text-sm text-gray-500 mt-1">Inicia un nuevo servicio de 24 horas</p>
                </div>
              )}
            </section>

            {/* --- SECCIÓN JEFE OPERATIVO --- */}
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 px-1 border-l-4 border-indigo-500 pl-3">Módulo Jefe Operativo</h2>
              {jefeOperativoActivo ? (
                <div className="bg-white rounded-2xl shadow-md border-2 border-indigo-500/20 p-6 relative overflow-hidden group hover:border-indigo-500 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10"></div>
                  <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                        <span className="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-[10px] font-bold tracking-wider">OP. EXTRAORDINARIA EN CURSO</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{jefeOperativoActivo.apertura.nroPlanOperaciones || "Sin Plan de Operaciones"}</p>
                      <p className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                        <Clock className="w-4 h-4" />
                        Iniciado: {formatFecha(jefeOperativoActivo.apertura.fechaApertura)}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/jefe-operativo/${jefeOperativoActivo.id}`)}
                      className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20"
                    >
                      ABRIR ESPACIO
                    </button>
                  </div>
                </div>
              ) : servicioActivo ? (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-amber-900">Tienes un turno de supervisor activo</h3>
                  <p className="mt-1 text-sm text-amber-700">
                    Ciérralo antes de abrir un servicio de Jefe Operativo.
                  </p>
                </div>
              ) : (
                <div onClick={() => setShowAbrirJefeOperativoModal(true)} className="bg-white/50 border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 transition-all group">
                  <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:bg-indigo-100">
                    <ShieldAlert className="w-6 h-6 text-gray-400 group-hover:text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-gray-700 group-hover:text-indigo-700">Abrir Servicio Extraordinario</h3>
                  <p className="text-sm text-gray-500 mt-1">Inicia un servicio específico como Jefe Operativo</p>
                </div>
              )}
            </section>

          </div>
        )}
      </div>

      {/* Modals */}
      {showAbrirModal && (
        <AbrirServicioModal
          onClose={() => setShowAbrirModal(false)}
          onServicioCreado={handleServicioCreado}
        />
      )}
      
      {showAbrirJefeOperativoModal && (
        <AbrirJefeOperativoModal
          onClose={() => setShowAbrirJefeOperativoModal(false)}
          onServicioCreado={handleJefeOperativoCreado}
        />
      )}

    </div>
  );
}
