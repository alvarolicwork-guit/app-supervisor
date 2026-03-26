'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History, Loader2, Search, ShieldCheck, Siren, CalendarDays, Download, Printer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAllServiciosAdmin, getServiciosSupervisor, type ServicioSupervisor } from '@/services/servicioSupervisorService';
import { getAllServiciosJefeOperativoAdmin, getHistorialJefeOperativo } from '@/services/jefeOperativoService';
import type { ServicioJefeOperativo } from '@/types/jefeOperativo';

type HistorialItem = {
  id: string;
  tipo: 'SUPERVISOR' | 'JEFE_OPERATIVO';
  titulo: string;
  estado: 'abierto' | 'cerrado';
  inicio?: Date;
  fin?: Date;
  createdAt: Date;
};

function fmt(date?: Date) {
  if (!date) return '--';
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function csvCell(value: string | number) {
  const asString = String(value ?? '');
  return `"${asString.replace(/"/g, '""')}"`;
}

export default function HistorialPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistorialItem[]>([]);
  const [query, setQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'TODOS' | 'SUPERVISOR' | 'JEFE_OPERATIVO'>('TODOS');
  const [periodo, setPeriodo] = useState<'7' | '30' | '90' | 'ALL'>('30');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const cargar = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const [supervisorRaw, jefeRaw] = isAdmin
          ? await Promise.all([getAllServiciosAdmin(), getAllServiciosJefeOperativoAdmin()])
          : await Promise.all([getServiciosSupervisor(user.uid), getHistorialJefeOperativo(user.uid)]);

        const supervisorItems: HistorialItem[] = supervisorRaw.map((s: ServicioSupervisor) => ({
          id: s.id || '',
          tipo: 'SUPERVISOR',
          titulo: s.apertura.nroMemorandum || 'Servicio Supervisor',
          estado: s.estado,
          inicio: s.apertura.fechaHora,
          fin: s.cierre?.fechaHora,
          createdAt: s.createdAt,
        }));

        const jefeItems: HistorialItem[] = jefeRaw.map((s: ServicioJefeOperativo) => ({
          id: s.id || '',
          tipo: 'JEFE_OPERATIVO',
          titulo: s.apertura.nroPlanOperaciones || s.apertura.tipoServicio || 'Servicio Jefe Operativo',
          estado: s.estado,
          inicio: s.apertura.fechaApertura,
          fin: s.cierre?.fechaCierre,
          createdAt: s.createdAt,
        }));

        setItems([...supervisorItems, ...jefeItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      void cargar();
    }
  }, [user, isAdmin]);

  const filtrados = useMemo(() => {
    const now = Date.now();
    const maxDays = periodo === 'ALL' ? null : Number(periodo);

    return items.filter((item) => {
      if (item.estado !== 'cerrado') return false;

      if (tipoFiltro !== 'TODOS' && item.tipo !== tipoFiltro) return false;

      if (maxDays !== null) {
        const diffDays = (now - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > maxDays) return false;
      }

      if (query.trim()) {
        const text = `${item.titulo} ${item.id}`.toLowerCase();
        if (!text.includes(query.toLowerCase())) return false;
      }

      if (desde) {
        const start = new Date(`${desde}T00:00:00`);
        if (item.createdAt < start) return false;
      }

      if (hasta) {
        const end = new Date(`${hasta}T23:59:59`);
        if (item.createdAt > end) return false;
      }

      return true;
    });
  }, [items, tipoFiltro, periodo, query, desde, hasta]);

  const total = filtrados.length;
  const supCount = filtrados.filter((i) => i.tipo === 'SUPERVISOR').length;
  const jefeCount = filtrados.filter((i) => i.tipo === 'JEFE_OPERATIVO').length;

  const exportarCSV = () => {
    if (filtrados.length === 0) return;

    const headers = [
      'tipo',
      'titulo',
      'id',
      'inicio',
      'cierre',
      'creado_en',
    ];

    const rows = filtrados.map((item) => [
      item.tipo,
      item.titulo,
      item.id,
      fmt(item.inicio),
      fmt(item.fin),
      fmt(item.createdAt),
    ]);

    const csv = [
      headers.map(csvCell).join(','),
      ...rows.map((row) => row.map(csvCell).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `historial_operativo_${stamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Volver">
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </button>
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900">Historial Operativo</h1>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="hidden sm:block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Ir al Panel
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Servicios Cerrados</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Supervisor 24h</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{supCount}</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Jefe Operativo</p>
            <p className="mt-1 text-2xl font-bold text-indigo-700">{jefeCount}</p>
          </div>
        </div>

        <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Buscar</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Memorándum, plan o ID"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Módulo</span>
            <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value as 'TODOS' | 'SUPERVISOR' | 'JEFE_OPERATIVO')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="TODOS">Todos</option>
              <option value="SUPERVISOR">Supervisor 24h</option>
              <option value="JEFE_OPERATIVO">Jefe Operativo</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Periodo</span>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value as '7' | '30' | '90' | 'ALL')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="7">Ultimos 7 dias</option>
              <option value="30">Ultimos 30 dias</option>
              <option value="90">Ultimos 90 dias</option>
              <option value="ALL">Todo</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{filtrados.length} resultado(s) listo(s) para auditoria</p>
            <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
              <button
                onClick={exportarCSV}
                disabled={filtrados.length === 0}
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
              <button
                onClick={() => window.print()}
                disabled={filtrados.length === 0}
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Imprimir / PDF
              </button>
            </div>
          </div>
        </div>

        {loading || authLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-600">Cargando historial operativo...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-slate-700">No hay resultados para los filtros actuales.</p>
            <p className="mt-1 text-sm text-slate-500">Prueba cambiar periodo, modulo o busqueda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((item) => {
              const isSupervisor = item.tipo === 'SUPERVISOR';
              const icon = isSupervisor ? <ShieldCheck className="h-4 w-4" /> : <Siren className="h-4 w-4" />;
              const color = isSupervisor
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-indigo-300 bg-indigo-50 text-indigo-700';

              return (
                <button
                  key={`${item.tipo}-${item.id}`}
                  onClick={() => router.push(isSupervisor ? `/servicio/${item.id}` : `/jefe-operativo/${item.id}`)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{isSupervisor ? 'Supervisor 24h' : 'Jefe Operativo'}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{item.titulo}</p>
                      <p className="mt-1 text-xs text-slate-500">ID: {item.id}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold ${color}`}>
                      {icon}
                      Cerrado
                    </span>
                  </div>

                  <div className="grid gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600 md:grid-cols-2">
                    <p>Inicio: <span className="font-medium text-slate-800">{fmt(item.inicio)}</span></p>
                    <p>Cierre: <span className="font-medium text-slate-800">{fmt(item.fin)}</span></p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
