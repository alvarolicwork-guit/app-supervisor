export interface NovedadesPersonalResumen {
    faltas: number;
    abandonos: number;
    arrestos: number;
    permisos: number;
}

interface RegistroConPersonal {
    personal?: {
        detalles?: Partial<{
            faltantes: string[];
            abandono: string[];
            arrestados: string[];
            permisos: string[];
        }>;
    };
}

/**
 * Suma las novedades de personal de todos los registros de unidades.
 * Incluye abandonos y arrestos, que antes no se reflejaban en el resumen.
 */
export function calcularNovedadesPersonal(
    registros: RegistroConPersonal[]
): NovedadesPersonalResumen {
    return registros.reduce<NovedadesPersonalResumen>(
        (acc, registro) => {
            const detalles = registro.personal?.detalles;
            acc.faltas += detalles?.faltantes?.length ?? 0;
            acc.abandonos += detalles?.abandono?.length ?? 0;
            acc.arrestos += detalles?.arrestados?.length ?? 0;
            acc.permisos += detalles?.permisos?.length ?? 0;
            return acc;
        },
        { faltas: 0, abandonos: 0, arrestos: 0, permisos: 0 }
    );
}
