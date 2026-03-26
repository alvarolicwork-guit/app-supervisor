'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { abrirServicioJefeOperativo } from '@/services/jefeOperativoService';
import { AperturaForm } from '@/components/servicios-extraordinarios/AperturaForm';
import { AperturaServicioExtra } from '@/types/servicioExtraordinario';

interface AbrirJefeOperativoModalProps {
  onClose: () => void;
  onServicioCreado: (id: string) => void;
}

export function AbrirJefeOperativoModal({ onClose, onServicioCreado }: AbrirJefeOperativoModalProps) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (data: AperturaServicioExtra) => {
    if (!user) return;
    try {
      const id = await abrirServicioJefeOperativo(user.uid, data);
      onServicioCreado(id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al crear servicio operativo');
      throw err; // Lanzar para que AperturaForm desactive el 'isSubmitting'
    }
  };

  return (
    <>
      <AperturaForm onSave={handleSave} onCancel={onClose} tipoUsuario="jefe" />
      {error && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg z-[60] text-sm font-medium animate-in slide-in-from-bottom-5">
          {error}
        </div>
      )}
    </>
  );
}
