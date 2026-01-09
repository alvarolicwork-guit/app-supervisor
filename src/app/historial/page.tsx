'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History } from 'lucide-react';

function fmtTime(ts: string) {
  try {
    return new Date(ts).toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return ts;
  }
}

interface StoredService {
  service: {
    id: string;
    fecha_apertura: string;
    fecha_cierre: string;
    memorandum?: string;
  };
  installations: { id: string }[];
  events: { id: string }[];
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<StoredService[]>([]);

  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem('nv-policiales-demo-v2') || '{}');
      setHistory(state.serviceHistory || []);
    } catch {
      setHistory([]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div className="flex items-center gap-3">
              <History className="w-8 h-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Historial de Servicios
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {history.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white rounded-lg shadow">
              <History className="w-12 h-12 text-gray-400 mx-auto" />
              <h2 className="mt-4 text-xl font-medium text-gray-700">
                No hay servicios completados.
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Los servicios cerrados aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul role="list" className="divide-y divide-gray-200">
                {history.map((item) => (
                  <li key={item.service.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          Servicio #{item.service.id.slice(-6)} (Mem:{' '}
                          {item.service.memorandum || 'N/A'})
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Cerrado
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <strong>Inicio:</strong>
                            <span className="ml-1">
                              {fmtTime(item.service.fecha_apertura)}
                            </span>
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <strong>Cierre:</strong>
                            <span className="ml-1">
                              {fmtTime(item.service.fecha_cierre)}
                            </span>
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p><strong>Instalaciones:</strong> {item.installations.length}</p>
                          <p className="ml-4"><strong>Servicios:</strong> {item.events.length}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
