'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileTabbar } from '@/components/layout/MobileTabbar';
import { UnidadesControl } from '@/components/supervisor/UnidadesControl';
import { ServiciosExtra } from '@/components/supervisor/ServiciosExtra';
import { OperativosMOP } from '@/components/supervisor/OperativosMOP';
import { CierreTurnoModal } from '@/components/supervisor/CierreTurnoModal';
import { getServicioActivo, cerrarServicioSupervisor, ServicioSupervisor } from '@/services/servicioSupervisorService';
import { LogOut, FileText, CheckCircle2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

export default function ServicioPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'resumen' | 'unidades' | 'extra' | 'mop'>('unidades');
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [servicioData, setServicioData] = useState<ServicioSupervisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [showReporte, setShowReporte] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadService(user.uid);
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  async function loadService(uid: string) {
    try {
      const servicio = await getServicioActivo(uid);
      if (servicio && servicio.id) {
        setServicioId(servicio.id);
        setServicioData(servicio);
        if (servicio.estado === 'cerrado') {
          setShowReporte(true);
        }
      }
    } catch (error) {
      console.error("Error loading service:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleCerrarTurno = async (datos: { entregaServicio: string; casosRutinarios: number; casosRelevantes: number }) => {
    if (!servicioId || !servicioData) return;

    try {
      await cerrarServicioSupervisor(servicioId, datos);
      const updatedService = {
        ...servicioData,
        estado: 'cerrado' as const,
        cierre: {
          fechaHora: new Date(),
          ...datos
        }
      };
      setServicioData(updatedService);
      setShowCierreModal(false);
      setShowReporte(true);
    } catch (error) {
      console.error("Error closing service:", error);
      alert("Error al cerrar el turno. Intente nuevamente.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showReporte && servicioData) {
    return (
      <ReporteView servicio={servicioData} onVolver={() => window.location.reload()} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto min-h-screen">
        <header className="flex justify-between items-center mb-6 md:mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {activeTab === 'resumen' && 'Resumen del Turno'}
              {activeTab === 'unidades' && 'Control de Unidades'}
              {activeTab === 'extra' && 'Servicios Extraordinarios'}
              {activeTab === 'mop' && 'Operativos de Orden y Seguridad'}
            </h2>
            <p className="text-gray-500 text-xs md:text-sm mt-1">
              {new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <div className={`text-white px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium shadow-sm flex items-center gap-2 ${servicioId ? 'bg-blue-600' : 'bg-gray-400'}`}>
              <span className={`w-2 h-2 rounded-full ${servicioId ? 'bg-green-400 animate-pulse' : 'bg-gray-200'}`}></span>
              <span className="hidden md:inline">{servicioId ? 'Turno Activo' : 'Sin Turno'}</span>
              <span className="md:hidden">{servicioId ? 'Activo' : 'Inactivo'}</span>
            </div>

            {servicioId && (
              <button
                onClick={() => setShowCierreModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Finalizar Turno</span>
              </button>
            )}
          </div>
        </header>

        <div className="max-w-5xl mx-auto space-y-6">
          {activeTab === 'resumen' && <PanelResumen />}
          <div className={activeTab === 'unidades' ? 'block' : 'hidden'}>
            {servicioId ? (
              <UnidadesControl servicioId={servicioId} />
            ) : (
              <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed">
                No hay un servicio de supervisor activo. Inicie turno para gestionar unidades.
              </div>
            )}
          </div>
          <div className={activeTab === 'extra' ? 'block' : 'hidden'}>
            <ServiciosExtra />
          </div>
          <div className={activeTab === 'mop' ? 'block' : 'hidden'}>
            <OperativosMOP />
          </div>
        </div>
      </main>

      <MobileTabbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {showCierreModal && (
        <CierreTurnoModal
          onClose={() => setShowCierreModal(false)}
          onContinuar={handleCerrarTurno}
        />
      )}
    </div>
  );
}

function PanelResumen() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-gray-500 text-sm font-medium">Novedades Registradas</div>
        <div className="text-4xl font-bold text-gray-900 mt-2">0</div>
        <div className="text-green-600 text-xs mt-1 font-medium">Todas sincronizadas</div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-gray-500 text-sm font-medium">Personal Supervisado</div>
        <div className="text-4xl font-bold text-gray-900 mt-2">0</div>
      </div>
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white">
        <div className="text-blue-100 text-sm font-medium">Asistente IA</div>
        <div className="mt-3 text-lg font-semibold">"Todo tranquilo por ahora, mi mayor."</div>
        <button className="mt-4 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
          Ver análisis
        </button>
      </div>
    </div>
  );
}

function ReporteView({ servicio, onVolver }: { servicio: ServicioSupervisor; onVolver: () => void }) {
  // Generate simple text report for copy/paste
  const generarTextoReporte = () => {
    let texto = `REPORTE DE SERVICIO DE SUPERVISOR\n`;
    texto += `--------------------------------\n`;
    texto += `Fecha: ${servicio.createdAt.toLocaleDateString()}\n`;
    texto += `Supervisor Saliente: ${servicio.apertura.supervisorActual.grado} ${servicio.apertura.supervisorActual.nombreCompleto}\n`;
    texto += `Entregado a: ${servicio.cierre?.entregaServicio || 'N/A'}\n\n`;

    texto += `RESUMEN ESTADÍSTICO\n`;
    texto += `- Casos Rutinarios: ${servicio.cierre?.casosRutinarios || 0}\n`;
    texto += `- Casos Relevantes: ${servicio.cierre?.casosRelevantes || 0}\n\n`;

    texto += `CONTROL DE UNIDADES (${servicio.controlInstalaciones?.length || 0})\n`;
    servicio.controlInstalaciones?.forEach((u: any, i: number) => {
      texto += `${i + 1}. ${u.unidad}: ${u.novedades ? 'Con Novedad' : 'Sin Novedad'}\n`;
      if (u.novedades) texto += `   Detalle: ${u.descripcionNovedad}\n`;
    });
    texto += `\n`;

    texto += `SERVICIOS EXTRAORDINARIOS\n`;
    // Assuming we have this data populated in the future, currently empty array usually
    if (!servicio.serviciosExtraordinarios || servicio.serviciosExtraordinarios.length === 0) {
      texto += `Sin servicios extraordinarios registrados.\n`;
    } else {
      servicio.serviciosExtraordinarios.forEach((s: any, i: number) => {
        texto += `${i + 1}. ${s.nombreEvent || 'Evento'}\n`;
      });
    }

    return texto;
  };

  const copiarPortapapeles = () => {
    navigator.clipboard.writeText(generarTextoReporte());
    alert("Reporte copiado al portapapeles");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-green-600 p-6 text-white text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-100" />
          <h1 className="text-2xl font-bold">Servicio Completado</h1>
          <p className="opacity-90 mt-2">
            {servicio.cierre?.fechaHora.toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="block text-gray-500 text-xs uppercase tracking-wider font-bold">Total Casos</span>
                <span className="block text-3xl font-extrabold text-blue-900 mt-1">
                  {(servicio.cierre?.casosRutinarios || 0) + (servicio.cierre?.casosRelevantes || 0)}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="block text-gray-500 text-xs uppercase tracking-wider font-bold">Unidades</span>
                <span className="block text-3xl font-extrabold text-indigo-900 mt-1">
                  {servicio.controlInstalaciones?.length || 0}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Vista Previa del Reporte
              </h3>
              <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap font-mono text-gray-600 h-64">
                {generarTextoReporte()}
              </pre>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button onClick={onVolver} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            Volver al Inicio
          </button>
          <button onClick={copiarPortapapeles} className="flex-1 py-3 px-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-lg">
            Copiar Informe
          </button>
        </div>
      </div>
    </div>
  );
}
