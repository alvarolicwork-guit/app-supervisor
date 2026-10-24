const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';
const NUMEROS = '23456789';
const SIMBOLOS = '!@#$%&*';
const TODOS = MAYUSCULAS + MINUSCULAS + NUMEROS + SIMBOLOS;

function elegir(caracteres: string): string {
    const valores = new Uint32Array(1);
    crypto.getRandomValues(valores);
    return caracteres[valores[0] % caracteres.length];
}

/**
 * Genera una contraseña inicial aleatoria con mayúsculas, minúsculas,
 * números y símbolos. Usa crypto.getRandomValues, no Math.random.
 */
export function generarPasswordSegura(longitud = 16): string {
    const base = [
        elegir(MAYUSCULAS),
        elegir(MINUSCULAS),
        elegir(NUMEROS),
        elegir(SIMBOLOS),
    ];

    while (base.length < longitud) {
        base.push(elegir(TODOS));
    }

    for (let i = base.length - 1; i > 0; i -= 1) {
        const valores = new Uint32Array(1);
        crypto.getRandomValues(valores);
        const j = valores[0] % (i + 1);
        [base[i], base[j]] = [base[j], base[i]];
    }

    return base.join('');
}

export function validarPasswordSegura(password: string): string[] {
    const errores: string[] = [];
    if (password.length < 12) errores.push('Debe tener al menos 12 caracteres.');
    if (!/[A-Z]/.test(password)) errores.push('Debe incluir una mayúscula.');
    if (!/[a-z]/.test(password)) errores.push('Debe incluir una minúscula.');
    if (!/[0-9]/.test(password)) errores.push('Debe incluir un número.');
    if (!/[^A-Za-z0-9]/.test(password)) errores.push('Debe incluir un símbolo.');
    return errores;
}
