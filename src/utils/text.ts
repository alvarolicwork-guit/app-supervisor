const GRADOS = new Set([
    'tcnl', 'cnl', 'my', 'may', 'cap', 'tte', 'sbtte', 'sgto', 'sargento',
    'cbo', 'cabo', 'sld', 'soldado', 'of', 'subof', 'insp', 'inspector',
    'com', 'comandante', 'subcom', 'det', 'agte', 'gral', 'brig', 'dr',
    'dra', 'lic', 'ing', 'abg', 'sr', 'sra', 'srta', 'pdte', 'sec', 'pol',
]);

const ACRONIMOS = new Set([
    'DEAP', 'FELCC', 'FELCV', 'FELCN', 'DIPROVE', 'INTERPOL', 'POFOMA', 'FELCDA',
    'UTOP', 'PAC', 'UTEPII', 'BSFE', 'EPI', 'MOP', 'GACIP', 'GIT', 'SIT',
    'UCO', 'DACI', 'DIPROVE', 'SEIC', 'SCIP', 'CIPC', 'DELTA', 'PRC',
]);

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do']);

function capitalizarPalabra(palabra: string, indice: number): string {
    if (!palabra) return palabra;
    if (palabra.toUpperCase() === 'N.N.') return 'N.N.';

    const match = palabra.match(/^([¿¡"'(]*)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)([.,;:)]*)$/);
    if (!match) return palabra;

    const [, prefijo, nucleo, sufijo] = match;
    const clave = nucleo.toLowerCase();
    const mayuscula = nucleo.toUpperCase();

    if (ACRONIMOS.has(mayuscula)) return `${prefijo}${mayuscula}${sufijo}`;
    if (GRADOS.has(clave)) {
        return `${prefijo}${clave.charAt(0).toUpperCase()}${clave.slice(1)}${sufijo}`;
    }
    if (indice > 0 && PARTICULAS.has(clave)) {
        return `${prefijo}${clave}${sufijo}`;
    }

    return `${prefijo}${clave.charAt(0).toUpperCase()}${clave.slice(1)}${sufijo}`;
}

/**
 * Normaliza grados y nombres: "sgto. JUAN perez" -> "Sgto. Juan Perez".
 * Conserva acrónimos institucionales (DEAP, FELCC, etc.) y partículas.
 */
export function normalizarNombre(valor: string): string {
    return valor
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map((palabra, indice) =>
            palabra
                .split('-')
                .map((parte) => capitalizarPalabra(parte, indice))
                .join('-')
        )
        .join(' ');
}
