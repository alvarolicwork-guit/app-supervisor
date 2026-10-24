export interface CasosRutina {
    decsInstalados: number;
    infraccionesTransito: number;
    infraccionesLey259: number;
    faltasContravenciones: number;
    delitosAtendidos: number;
    violenciaFamiliar: number;
    auxilioPersonas: number;
}

export const CASOS_RUTINA_DEFECTO: CasosRutina = {
    decsInstalados: 0,
    infraccionesTransito: 0,
    infraccionesLey259: 0,
    faltasContravenciones: 0,
    delitosAtendidos: 0,
    violenciaFamiliar: 0,
    auxilioPersonas: 0,
};

export const CAMPOS_CASOS_RUTINA: Array<{
    key: keyof CasosRutina;
    label: string;
    reporte: string;
}> = [
    {
        key: 'decsInstalados',
        label: 'DECs instalados',
        reporte: 'DECs instalados (Dispositivos Electrónicos de Control)',
    },
    {
        key: 'infraccionesTransito',
        label: 'Infracciones de tránsito',
        reporte: 'Infracciones de tránsito (boletas impartidas)',
    },
    {
        key: 'infraccionesLey259',
        label: 'Infracciones a la Ley 259',
        reporte: 'Infracciones a la Ley 259',
    },
    {
        key: 'faltasContravenciones',
        label: 'Faltas y contravenciones',
        reporte: 'Faltas y contravenciones policiales',
    },
    {
        key: 'delitosAtendidos',
        label: 'Delitos atendidos',
        reporte: 'Delitos atendidos',
    },
    {
        key: 'violenciaFamiliar',
        label: 'Violencia familiar (Ley 1178)',
        reporte: 'Violencia familiar (Ley 1178)',
    },
    {
        key: 'auxilioPersonas',
        label: 'Auxilio a personas',
        reporte: 'Auxilio a personas heridas o desvalidas',
    },
];

export function normalizarCasosRutina(value?: Partial<CasosRutina> | null): CasosRutina {
    return CAMPOS_CASOS_RUTINA.reduce<CasosRutina>((acc, campo) => {
        const cantidad = Number(value?.[campo.key] ?? 0);
        acc[campo.key] = Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 0;
        return acc;
    }, { ...CASOS_RUTINA_DEFECTO });
}

export function totalCasosRutina(value?: Partial<CasosRutina> | null): number {
    const casos = normalizarCasosRutina(value);
    return CAMPOS_CASOS_RUTINA.reduce((acc, campo) => acc + casos[campo.key], 0);
}

/**
 * Devuelve solo las categorías con cantidad mayor a cero. Los contadores en 0
 * se omiten de los reportes, según la política definida.
 */
export function lineasCasosRutina(value?: Partial<CasosRutina> | null): string[] {
    const casos = normalizarCasosRutina(value);
    return CAMPOS_CASOS_RUTINA
        .filter((campo) => casos[campo.key] > 0)
        .map((campo) => `${campo.reporte}: ${casos[campo.key]}`);
}

export function textoCasosRutina(
    value?: Partial<CasosRutina> | null,
    separador = '; '
): string {
    return lineasCasosRutina(value).join(separador);
}
