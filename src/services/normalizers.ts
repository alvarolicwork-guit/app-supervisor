import type {
  AperturaServicioExtra,
  CasoRelevante,
  CierreServicioExtra,
  ObservacionUniforme,
  PersonalNovedad,
  ServicioExtraordinario,
} from '@/types/servicioExtraordinario';
import type { ServicioSupervisor } from './servicioSupervisorService';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

/**
 * Convierte fechas de Firestore (Timestamp), strings o números a Date.
 * Nunca lanza: si el valor no es convertible, devuelve el fallback o la fecha actual.
 */
export function toDateSafe(value: unknown, fallback?: Date): Date {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback ?? new Date() : value;
  }

  if (isRecord(value) && typeof value.toDate === 'function') {
    try {
      const converted = (value.toDate as () => Date)();
      if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
        return converted;
      }
    } catch {
      // Ignorar y probar las otras representaciones.
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback ?? new Date();
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Normaliza un servicio extraordinario embebido en un servicio de supervisor.
 * Firestore devuelve Timestamp en fechaApertura/fechaCierre; la UI espera Date.
 */
export function normalizarServicioExtra(value: unknown): ServicioExtraordinario | null {
  if (!isRecord(value)) return null;

  const aperturaRaw = isRecord(value.apertura) ? value.apertura : {};
  const novedadesRaw = isRecord(aperturaRaw.novedadesFormacion)
    ? aperturaRaw.novedadesFormacion
    : {};
  const personalFaltoRaw = isRecord(novedadesRaw.personalFalto) ? novedadesRaw.personalFalto : {};
  const personalPermisoRaw = isRecord(novedadesRaw.personalPermiso) ? novedadesRaw.personalPermiso : {};

  const apertura: AperturaServicioExtra = {
    ...(aperturaRaw as unknown as AperturaServicioExtra),
    nroPlanOperaciones: String(aperturaRaw.nroPlanOperaciones ?? ''),
    tipoServicio: String(aperturaRaw.tipoServicio ?? ''),
    personalContemplado: asNumber(aperturaRaw.personalContemplado),
    motosContempladas: asNumber(aperturaRaw.motosContempladas),
    vehiculosContemplados: asNumber(aperturaRaw.vehiculosContemplados),
    supervisorGeneral: String(aperturaRaw.supervisorGeneral ?? ''),
    jefeOperativo: String(aperturaRaw.jefeOperativo ?? ''),
    lugarFormacion: String(aperturaRaw.lugarFormacion ?? ''),
    horaFormacion: String(aperturaRaw.horaFormacion ?? ''),
    horaInstalacion: String(aperturaRaw.horaInstalacion ?? ''),
    tareas: typeof aperturaRaw.tareas === 'string' ? aperturaRaw.tareas : '',
    fechaApertura: toDateSafe(aperturaRaw.fechaApertura),
    novedadesFormacion: {
      personalFormo: asNumber(novedadesRaw.personalFormo),
      personalFalto: {
        cantidad: asNumber(personalFaltoRaw.cantidad),
        lista: asArray<PersonalNovedad>(personalFaltoRaw.lista),
      },
      personalPermiso: {
        cantidad: asNumber(personalPermisoRaw.cantidad),
        lista: asArray<PersonalNovedad>(personalPermisoRaw.lista),
      },
      observacionesUniforme: asArray<ObservacionUniforme>(novedadesRaw.observacionesUniforme),
    },
  };

  let cierre: CierreServicioExtra | undefined;
  if (isRecord(value.cierre)) {
    const cierreRaw = value.cierre;
    const novedadesCierre = isRecord(cierreRaw.novedades) ? cierreRaw.novedades : {};
    cierre = {
      ...(cierreRaw as unknown as CierreServicioExtra),
      fechaCierre: toDateSafe(cierreRaw.fechaCierre),
      personalFaltoServicio: asArray<PersonalNovedad>(cierreRaw.personalFaltoServicio),
      personalIncorporadoTarde: asArray<PersonalNovedad>(cierreRaw.personalIncorporadoTarde),
      tareasEjecutadas:
        typeof cierreRaw.tareasEjecutadas === 'string' ? cierreRaw.tareasEjecutadas : '',
      reporteWhatsappFinal:
        typeof cierreRaw.reporteWhatsappFinal === 'string' ? cierreRaw.reporteWhatsappFinal : '',
      informeInstitucionalFinal:
        typeof cierreRaw.informeInstitucionalFinal === 'string'
          ? cierreRaw.informeInstitucionalFinal
          : '',
      novedades: {
        tipo: novedadesCierre.tipo === 'con' ? 'con' : 'sin',
        casos: asArray<CasoRelevante>(novedadesCierre.casos),
        observaciones:
          typeof novedadesCierre.observaciones === 'string' ? novedadesCierre.observaciones : '',
      },
    };
  }

  return {
    id: String(value.id ?? ''),
    estado: value.estado === 'cerrado' ? 'cerrado' : 'abierto',
    apertura,
    cierre,
  };
}

/**
 * Normaliza un documento de servicios_supervisor.
 * Conserva el cierre completo (entrega, casos, informe) y convierte todas las fechas.
 */
export function normalizarServicioSupervisor(
  id: string,
  value: unknown
): ServicioSupervisor {
  const raw = isRecord(value) ? value : {};
  const aperturaRaw = isRecord(raw.apertura) ? raw.apertura : {};
  const aperturaFecha = toDateSafe(aperturaRaw.fechaHora);
  const createdAt = toDateSafe(raw.createdAt, aperturaFecha);
  const expiresAt = toDateSafe(
    raw.expiresAt,
    new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
  );

  const supervisorActualRaw = isRecord(aperturaRaw.supervisorActual)
    ? aperturaRaw.supervisorActual
    : {};
  const supervisorRelevoRaw = isRecord(aperturaRaw.supervisorRelevo)
    ? aperturaRaw.supervisorRelevo
    : {};

  const cierre = isRecord(raw.cierre)
    ? {
        ...(raw.cierre as unknown as NonNullable<ServicioSupervisor['cierre']>),
        fechaHora: toDateSafe(raw.cierre.fechaHora),
      }
    : undefined;

  return {
    ...(raw as unknown as ServicioSupervisor),
    id,
    estado: raw.estado === 'cerrado' ? 'cerrado' : 'abierto',
    apertura: {
      ...(aperturaRaw as unknown as ServicioSupervisor['apertura']),
      nroMemorandum: String(aperturaRaw.nroMemorandum ?? ''),
      fechaHora: aperturaFecha,
      supervisorActual: {
        grado: String(supervisorActualRaw.grado ?? ''),
        nombreCompleto: String(supervisorActualRaw.nombreCompleto ?? ''),
      },
      supervisorRelevo: {
        grado: String(supervisorRelevoRaw.grado ?? ''),
        nombreCompleto: String(supervisorRelevoRaw.nombreCompleto ?? ''),
      },
    },
    controlInstalaciones: asArray(raw.controlInstalaciones),
    serviciosExtraordinarios: asArray(raw.serviciosExtraordinarios)
      .map(normalizarServicioExtra)
      .filter((servicio): servicio is ServicioExtraordinario => servicio !== null),
    cierre,
    createdAt,
    expiresAt,
  } as ServicioSupervisor;
}
