# Operación de App Supervisor

## Arquitectura

- **Next.js 16** con App Router, React 18 y TypeScript.
- **Firebase Spark**: Authentication, Firestore, reglas e índices. **No se despliegan Cloud Functions ni tareas programadas.**
- La app Next debe ejecutarse en un servidor Node (VPS, equipo local o red interna). Firebase Hosting no se usa para SSR/Server Actions en Spark.
- La IA usa Genkit/Google AI desde server actions. La autenticación del servidor se valida con Identity Toolkit y Firestore REST, sin cuenta de servicio.

## Roles

| Rol | Acceso |
|---|---|
| `admin` | Lee todos los perfiles y servicios; crea/edita/activa/desactiva supervisores; archiva servicios; lee auditoría. |
| `supervisor` | Crea y opera sus propios servicios de supervisor y Jefe Operativo; no ve servicios ajenos. |

Un usuario sin documento en `users/{uid}` o con `isActive: false` queda bloqueado en la app y por las reglas.

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

- `NEXT_PUBLIC_FIREBASE_*`: configuración web de Firebase.
- `GOOGLE_AI_API_KEY`: clave de Gemini (solo servidor).

Para scripts administrativos, usar además una cuenta de servicio:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\<usuario>\.secrets\app-supervisor.json"
```

No guardar la cuenta de servicio en el repositorio. Revocarla al terminar.

## Primer administrador

El flujo desde el navegador fue eliminado. Crear el primer admin con:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\cuenta-servicio.json"
$env:ADMIN_EMAIL="admin@ejemplo.com"
$env:ADMIN_PASSWORD="una-clave-segura"
$env:ADMIN_NOMBRE="Nombre Completo"
$env:ADMIN_GRADO="Tcnl."
npm run create-admin
```

El script verifica que no exista otro admin, crea Auth y el perfil, y elimina la cuenta de Auth si falla la escritura del perfil. Para un segundo admin deliberado, usar `node scripts/create-admin.mjs --force`.

## Despliegue

Solo reglas e índices:

```powershell
npm run deploy:rules
npm run deploy:indexes
```

No ejecutar `firebase deploy` completo: en Spark intentaría desplegar Functions/Hosting. El script `npm run deploy` está limitado a reglas e índices.

Antes de desplegar reglas:

1. Copiar las reglas actuales.
2. Ejecutar `npx firebase emulators:exec --only firestore --project registro-de-supervisor "node verify-firestore-rules.mjs"`.
3. Desplegar en staging.
4. Desplegar en producción en ventana de baja actividad.

## Retención y archivado

- Los servicios de supervisor se conservan **9 días desde el cierre**; al cerrar se actualiza `expiresAt`.
- Los servicios de Jefe Operativo también usan 9 días desde el cierre.
- La limpieza es manual desde el panel admin o con script; no hay scheduler en Spark.
- El admin archiva servicios cerrados con un motivo. El documento se copia a `servicios_*_archivados`, se registra en `auditoria` y se elimina el original en una transacción.
- Los documentos eliminados antes de esta versión no se pueden recuperar.

## Desactivar o eliminar una cuenta de Authentication

La app usa `isActive` para bloquear el acceso, pero deshabilitar/eliminar la cuenta de Auth requiere Admin SDK:

```powershell
$env:USER_UID="uid-del-usuario"
$env:USER_ACTIVE="false"
npm run user:set-active

$env:USER_UID="uid-del-usuario"
npm run user:delete -- --confirm
```

`user:delete` archiva el perfil en `users_archivados` y elimina la cuenta de Auth. Sin `--confirm` solo muestra el modo dry-run. Revisar siempre el UID antes de ejecutar.

## Migraciones

La forma más simple es ejecutar el asistente y arrastrar el JSON de la cuenta de servicio cuando lo pida:

```powershell
.\scripts\preparar-migraciones.cmd
```

El asistente valida la clave, compara el proyecto con `.firebaserc`, ejecuta la auditoría, crea un backup local en `backups/` y corre los cuatro dry-runs. **No aplica cambios.**

Después de revisar los reportes, para aplicar las migraciones (escribe `APLICAR` cuando lo pida):

```powershell
.\scripts\aplicar-migraciones.cmd
```

Ese segundo asistente vuelve a hacer backup, aplica las cuatro migraciones y ejecuta una auditoría final. No despliega reglas ni índices.

También se pueden ejecutar manualmente. Todas las migraciones son `dry-run` por defecto y requieren `--apply` para escribir:

```powershell
npm run migrate:audit
npm run backup
npm run migrate:personal-formo
npm run migrate:expires-at
npm run migrate:active-locks
npm run migrate:audit-fields
```

- `migrate:audit`: reporta cuentas Auth sin perfil, perfiles sin Auth, servicios abiertos duplicados y cierres incompletos.
- `migrate:personal-formo`: corrige `NaN` en servicios de Jefe Operativo y extraordinarios.
- `migrate:expires-at`: recalcula la retención de servicios de supervisor cerrados.
- `migrate:active-locks`: crea bloqueos para servicios abiertos; reporta duplicados.
- `migrate:audit-fields`: completa `updatedAt`/`updatedBy` en documentos antiguos.

Antes de `--apply`, exportar la colección afectada. Revisar el reporte y ejecutar primero en staging.

## Pruebas

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:rules
npm run build
```

`test:rules` requiere Java y el emulador de Firestore; no toca el proyecto real.

Las pruebas unitarias cubren normalización de cierres/fechas y el informe del supervisor. Las pruebas de reglas usan el emulador de Firestore.

## Dependencias

- Next.js **16.4.2** (actualización de seguridad).
- React 18: Next 16 lo admite, pero advierte que la compatibilidad se retirará en Next 17. Planificar React 19.
- `npm audit` reporta vulnerabilidades transitivas en `firebase-admin`, Genkit y utilidades de Google Cloud. No todas son explotables desde la app, pero conviene revisarlas antes de exponer el servidor a Internet y actualizar de forma controlada.

## Limitaciones conocidas

- Sin Cloud Functions ni scheduler: la limpieza de vencidos es manual.
- La desactivación en la app usa `isActive`; deshabilitar/eliminar la cuenta de Authentication requiere un script con Admin SDK.
- El archivado y la auditoría desde el cliente dependen del rol admin y de las reglas; para una garantía más fuerte se necesita un servidor Node con Admin SDK.
- El historial aún no tiene paginación por cursor; carga los servicios del usuario/admin y filtra en cliente.
- El panel admin muestra y archiva servicios de supervisor; los de Jefe Operativo se consultan desde el historial.
- La IA tiene un límite por proceso (20 solicitudes/minuto). Si se escala horizontalmente, sustituir por un contador en Firestore o App Check.
- No hay pruebas E2E con Playwright ni pipeline de CI en este repositorio.
