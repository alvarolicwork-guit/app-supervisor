// Tipos para Servicios Extraordinarios


export interface PersonalNovedad {
    gradoNombre: string;
}

export interface ObservacionUniforme {
    gradoNombre: string;
    tipo: 'Incorrecto' | 'Sucio/Desarreglado' | 'Incompleto';
}

export interface NovedadesFormacion {
    personalFormo: number;
    personalFalto: {
        cantidad: number;
        lista: PersonalNovedad[];
    };
    personalPermiso: {
        cantidad: number;
        lista: PersonalNovedad[];
    };
    personalAtrasado: {
        cantidad: number;
        lista: PersonalNovedad[];
    };
    observacionesUniforme: ObservacionUniforme[];
}

export interface CasoRelevante {
    id: string;
    tipo: string;
    hora: string;
    lugar: string;
    encargado: string;
    detalle: string;
}

export interface AperturaServicioExtra {
    // Datos del Plan de Operaciones
    nroPlanOperaciones: string;
    personalContemplado: number;
    supervisorGeneral: string;
    jefeOperativo: string;
    lugarFormacion: string;
    horaFormacion: string;
    horaInstalacion: string;
    fechaApertura: Date;

    // Novedades de Formación
    novedadesFormacion: NovedadesFormacion;
}

export interface CierreServicioExtra {
    fechaCierre: Date;
    personalFaltoServicio: PersonalNovedad[];  // Heredado de apertura
    personalAtrasadoServicio: PersonalNovedad[]; // Heredado de apertura + nuevos
    novedades: {
        tipo: 'sin' | 'con';
        casos?: CasoRelevante[];
        observaciones?: string; // Texto de hasta 100 caracteres
    };
}

export interface ServicioExtraordinario {
    id: string;
    estado: 'abierto' | 'cerrado';
    apertura: AperturaServicioExtra;
    cierre?: CierreServicioExtra;
}
