export type UserRole = 'admin' | 'supervisor';

export interface AuthenticatedUser {
    uid: string;
    email?: string;
    role: UserRole;
    isActive: true;
}

export class AuthError extends Error {
    readonly status: number;

    constructor(message: string, status = 401) {
        super(message);
        this.name = 'AuthError';
        this.status = status;
    }
}

interface IdentityToolkitUser {
    localId?: string;
    email?: string;
    disabled?: boolean;
}

interface FirestoreRestDocument {
    fields?: {
        role?: { stringValue?: string };
        isActive?: { booleanValue?: boolean };
        email?: { stringValue?: string };
    };
}

function getConfig(): { apiKey: string; projectId: string } {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!apiKey || !projectId) {
        throw new AuthError('La autenticación del servidor no está configurada.', 503);
    }

    return { apiKey, projectId };
}

async function lookupAccount(idToken: string, apiKey: string): Promise<IdentityToolkitUser> {
    let response: Response;

    try {
        response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
                cache: 'no-store',
            }
        );
    } catch {
        throw new AuthError('No se pudo verificar la sesión. Revisa la conexión.', 503);
    }

    if (!response.ok) {
        throw new AuthError('Sesión inválida o expirada. Vuelve a iniciar sesión.', 401);
    }

    const data = (await response.json()) as { users?: IdentityToolkitUser[] };
    const account = data.users?.[0];

    if (!account?.localId) {
        throw new AuthError('Sesión inválida o expirada. Vuelve a iniciar sesión.', 401);
    }

    if (account.disabled) {
        throw new AuthError('El usuario está desactivado.', 403);
    }

    return account;
}

async function loadProfile(
    uid: string,
    idToken: string,
    projectId: string
): Promise<FirestoreRestDocument['fields']> {
    let response: Response;

    try {
        response = await fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
            {
                headers: { Authorization: `Bearer ${idToken}` },
                cache: 'no-store',
            }
        );
    } catch {
        throw new AuthError('No se pudo verificar el perfil del usuario.', 503);
    }

    if (response.status === 404) {
        throw new AuthError('El usuario no tiene un perfil autorizado.', 403);
    }

    if (!response.ok) {
        throw new AuthError('No se pudo verificar el perfil del usuario.', 503);
    }

    const document = (await response.json()) as FirestoreRestDocument;
    return document.fields;
}

/**
 * Verifica el ID token con Identity Toolkit y lee el perfil con Firestore REST.
 * No requiere cuenta de servicio ni Cloud Functions; funciona en Spark.
 * Las reglas de Firestore se aplican con el token del usuario.
 */
export async function requireActiveUser(
    idToken: string,
    roles?: UserRole[]
): Promise<AuthenticatedUser> {
    if (!idToken || typeof idToken !== 'string') {
        throw new AuthError('Sesión requerida.', 401);
    }

    const { apiKey, projectId } = getConfig();
    const account = await lookupAccount(idToken, apiKey);
    const uid = account.localId as string;
    const fields = await loadProfile(uid, idToken, projectId);

    if (fields?.isActive?.booleanValue !== true) {
        throw new AuthError('El usuario está desactivado o no tiene un perfil activo.', 403);
    }

    const role = fields.role?.stringValue;

    if (role !== 'admin' && role !== 'supervisor') {
        throw new AuthError('El usuario no tiene un rol autorizado.', 403);
    }

    if (roles && !roles.includes(role)) {
        throw new AuthError('No tienes permisos para esta operación.', 403);
    }

    return {
        uid,
        email: account.email || fields.email?.stringValue,
        role,
        isActive: true,
    };
}
