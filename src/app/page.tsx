'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AbrirServicioModal } from '@/components/supervisor/AbrirServicioModal';
import { getServicioActivo, getServiciosSupervisor, type ServicioSupervisor } from '@/services/servicioSupervisorService';
import { ClipboardList, Plus, Eye, Clock, CheckCircle, User, LogOut, Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading, isAdmin, logout } = useAuth();

  const [servicioActivo, setServicioActivo] = useState<ServicioSupervisor | null>(null);
  const [serviciosAnteriores, setServiciosAnteriores] = useState<ServicioSupervisor[]>([]);
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Redirección si no está autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Cargar datos solo si es supervisor
  useEffect(() => {
    if (user && !isAdmin) {
      cargarServicios();
    }
  }, [user, isAdmin]);

  const cargarServicios = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [activo, todos] = await Promise.all([
        getServicioActivo(user.uid),
        getServiciosSupervisor(user.uid),
      ]);

      setServicioActivo(activo);
      setServiciosAnteriores(todos.filter(s => s.estado === 'cerrado'));
    } catch (error) {
      console.error('Error cargando servicios:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleServicioCreado = (servicioId: string) => {
    setShowAbrirModal(false);
    router.push(`/servicio/${servicioId}`);
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

  // Vista ADMIN
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Vista SUPERVISOR
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
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Supervisor</p>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
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
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Loading Data */}
        {dataLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Cargando tus servicios...</p>
          </div>
        ) : (
          <>
            {/* Servicio Activo */}
            {servicioActivo ? (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-500/20 p-6 animate-in fade-in slide-in-from-top-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-emerald-500/10"></div>

                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                      <span className="bg-emerald-100 text-emerald-700 py-1 px-3 rounded-full text-xs font-bold tracking-wide">SERVICIO EN CURSO</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-gray-900">{servicioActivo.apertura.nroMemorandum}</p>
                      <p className="flex items-center gap-1.5 text-gray-500 text-sm">
                        <Clock className="w-4 h-4" />
                        Iniciado: {formatFecha(servicioActivo.apertura.fechaHora)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/servicio/${servicioActivo.id}`)}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
                  >
                    CONTINUAR →
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center hover:shadow-lg transition-shadow duration-300">
                <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ClipboardList className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Sin Servicio Activo</h2>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">Actualmente no estás supervisando ningún turno. Inicia uno nuevo para comenzar a registrar novedades.</p>
                <button
                  onClick={() => setShowAbrirModal(true)}
                  className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-600/30 inline-flex items-center gap-2 text-base"
                >
                  <Plus className="w-5 h-5" />
                  NUEVO SERVICIO
                </button>
              </div>
            )}

            {/* Servicios Anteriores */}
            {serviciosAnteriores.length > 0 && (
              <div className="pt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 px-1">
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                  Historial Reciente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {serviciosAnteriores.map((servicio) => (
                    <div
                      key={servicio.id}
                      onClick={() => router.push(`/servicio/${servicio.id}`)}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Memorándum</span>
                          <p className="font-bold text-gray-900 text-lg group-hover:text-emerald-600 transition-colors">{servicio.apertura.nroMemorandum}</p>
                        </div>
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-md">
                          Cerrado
                        </span>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-gray-100">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Inicio</span>
                          <span className="font-medium text-gray-900">{formatFecha(servicio.apertura.fechaHora)}</span>
                        </div>
                        {servicio.cierre && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Cierre</span>
                            <span className="font-medium text-gray-900">{formatFecha(servicio.cierre.fechaHora)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Abrir Servicio */}
      {showAbrirModal && (
        <AbrirServicioModal
          onClose={() => setShowAbrirModal(false)}
          onServicioCreado={handleServicioCreado}
        />
      )}
    </div>
  );
}
