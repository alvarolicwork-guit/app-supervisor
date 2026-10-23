# Plan detallado de corrección — App Supervisor

**Fecha:** 22/10/2026  
**Base:** [AUDITORIA.md](AUDITORIA.md)  
**Estado:** **aplicado y desplegado** (22/10/2026): correcciones de código, migraciones de datos, reglas e índices en `registro-de-supervisor`.  
**Restricción:** Firebase **Spark** (sin Cloud Functions ni tareas programadas).  
**Objetivo:** cerrar los riesgos de integridad, seguridad y operación detectados, con cambios verificables y reversibles.

## Estado de ejecución

Completado en esta rama:

- C1/C2/C4/C5/A6: normalizador, cierre completo, unidades por ID, `personalFormo`, informe y totales.
- C3: bootstrap de admin por script; flujo del navegador eliminado.
- C6: server actions de IA autenticadas con Identity Toolkit/Firestore REST, validación de tamaño y límite por proceso.
- A1/A8/M9: fechas de extras, Genkit sin throw en import, validación de archivos.
- A2/A4/A5/A7: reglas endurecidas, bloqueo de servicio activo, retención de 9 días, archivado con auditoría.
- A3/M5: activar/desactivar, editar, restablecer contraseña, bloqueo de usuarios sin perfil.
- M1/M2/M6/M7/M8/M10/M11: pestaña imagen deshabilitada, “Ver Detalle” retirado, doble envío, unidades únicas, fecha de apertura, typegen, `firebase.json` sin Hosting.
- B1/B2/B4/B5/B6 y documentación operativa.

Pendiente/limitado por el entorno:

- Paginación por cursor del historial (hoy carga y filtra en cliente).
- Pruebas E2E con Playwright y App Check.
- Revisión de vulnerabilidades transitivas de `npm audit` y salto a React 19.
- `functions/` queda como referencia para un futuro plan Blaze; no se despliega en Spark.

---

## 1. Criterios de éxito

El plan se considera terminado cuando:

1. Ningún servicio cerrado pierde su cierre al releerse y el informe guardado se muestra completo.
2. La vista de unidades funciona para servicios abiertos, cerrados y para el administrador.
3. Los servicios de Jefe Operativo no guardan `NaN` y el informe del supervisor no contiene datos inválidos.
4. Las acciones de IA exigen usuario activo, tienen límites y no exponen errores internos.
5. Las reglas impiden reabrir o alterar un cierre y dejan rastro de las operaciones administrativas.
6. Un administrador puede desactivar, editar y restablecer la contraseña de un supervisor sin usar la consola.
7. Existe una suite reproducible de pruebas de reglas y E2E de los flujos críticos, ejecutada en CI.
8. Las migraciones de datos se ejecutaron con copia de seguridad, modo `dry-run` y reporte de resultados.
9. Los totales de cierre coinciden con los registros o tienen una justificación registrada.
10. `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` pasan en la rama de integración.
11. El despliegue y el rollback están documentados y probados en un proyecto de staging.

---

## 2. Supuestos y decisiones previas

| Tema | Supuesto | Si no se cumple |
|---|---|---|
| Equipo | 1 desarrollador con acceso al proyecto; 2 desarrolladores reducen el calendario aproximadamente a la mitad. | Ajustar el orden: primero P0/P1, luego el resto. |
| Plan Firebase | **Spark confirmado.** No se desplegarán Cloud Functions ni tareas programadas. | Si se necesita una función programada o privilegiada en Firebase, habría que pasar a Blaze; este plan no lo asume. |
| Hosting de Next | Servidor Node propio/VPS o ejecución local para la app; Firebase solo Auth y Firestore. | Si se pretende servir Next con SSR/server actions desde Firebase Hosting, se requiere Functions/Cloud Run (Blaze); revisar la arquitectura antes de la Fase 2. |
| Entorno | Proyecto de staging separado y emulador de Firestore/Auth para pruebas. | Crear staging antes de tocar producción; sin él, no desplegar reglas. |
| Datos | Los documentos actuales son recuperables y el volumen es manejable (cientos/miles, no millones). | Diseñar migraciones por lotes con checkpoint y ejecución nocturna. |
| Alcance | Se corrigen los 34 hallazgos; P0/P1 primero. | Si hay que recortar, mantener P0/P1 y posponer P2/B. |

**Decisiones que conviene confirmar antes de empezar:**

- ¿Se mantiene la ruta legacy `/servicio` o se elimina? (recomendación: eliminar).
- ¿La retención oficial es 9 días desde el cierre? (recomendación: sí, unificar).
- ¿Dónde corre la app Next en producción? (servidor propio/VPS, local o Firebase Hosting). Es la decisión que más afecta a las operaciones privilegiadas y a la IA.
- ¿Se requiere App Check/2FA en esta fase? (recomendación: App Check sí; 2FA se puede posponer).

### 2.1 Restricción vigente: plan Spark

Spark cubre Auth, Firestore, reglas, índices y hosting estático, pero **no permite desplegar Cloud Functions ni tareas programadas**. El plan se adapta así:

| Necesidad | En Spark |
|---|---|
| Crear el primer admin | Script local con Admin SDK y cuenta de servicio; nunca desde el navegador. |
| Desactivar un usuario | Actualizar `users/{uid}.isActive` desde el cliente admin (las reglas lo permiten) y bloquear en la app; para `disabled` en Auth, script local. |
| Eliminar un usuario | Borrar/archivar el perfil desde el cliente admin; la cuenta de Auth se elimina con un script local. |
| Restablecer contraseña | `sendPasswordResetEmail` desde el cliente (el usuario recibe el enlace) o script local con Admin SDK. |
| Archivar y auditar | Transacción del cliente admin + reglas de archivo/auditoría, o server action con Admin SDK si hay servidor Node. |
| Cierre autoritativo de totales | Server action/API con Admin SDK si hay servidor; si no, validación en cliente + revisión del admin. |
| Limpieza programada | Botón “Limpiar vencidos” y script manual; no hay scheduler. |
| Verificar la IA | Server action con Admin SDK (token + perfil activo) si hay servidor Node; sin servidor, usar Identity Toolkit REST o deshabilitar la IA. |
| Desplegar | Solo `firestore:rules` y `firestore:indexes`; no ejecutar `firebase deploy` completo (intentaría Functions/Hosting). |

**Consecuencia de seguridad:** sin Cloud Functions, la auditoría y el archivado hechos desde el cliente dependen de que el administrador sea confiable y de que las reglas impidan escrituras fuera de lo permitido. Para una garantía más fuerte se necesita un servidor Node con Admin SDK (no necesariamente Blaze) o pasar a Blaze.

---

## 3. Estrategia de ejecución

- **Ramas:** una rama por fase (`fix/fase-1-integridad`, `fix/fase-2-auth`, …); PR pequeño con revisión y checklist.
- **Cambios compatibles primero:** añadir campos y funciones nuevas antes de endurecer reglas; desplegar la app que escribe los campos nuevos; después las reglas estrictas.
- **Sin migraciones destructivas:** primero `dry-run`, luego aplicación por lotes, con backup y reporte.
- **Pruebas desde la fase 1:** no dejar la suite para el final; cada corrección incluye su prueba.
- **Feature flags:** para la UI de archivado y para el nuevo flujo de IA, si se quiere desplegar por partes.
- **Un solo responsable de reglas:** los cambios de `firestore.rules` se revisan y despliegan juntos, con prueba en emulador.

---

## 4. Mapa de fases

| Fase | Contenido | Hallazgos | Depende de | Esfuerzo orientativo |
|---|---|---|---|---|
| 0 | Preparación, backups, staging, línea base | — | — | 0,5 día |
| 1 | Integridad del historial y los informes | C1, C2, C4, C5, A6 | Fase 0 | 3 días |
| 2 | Autenticación, bootstrap y acciones de IA | C3, C6 | Fase 1 | 3 días |
| 3 | Normalización y robustez | A1, A8, M9 | Fase 1 | 1,5 días |
| 4 | Reglas, concurrencia, retención y auditoría | A2, A4, A5, A7 | Fase 2 | 3 días |
| 5 | Gestión de usuarios y panel admin | A3, M3, M4, M5 | Fase 2, Fase 4 | 3 días |
| 6 | UX, producto y mantenimiento | M1, M2, M6–M8, M10–M14, B1–B6 | Fases 1–5 | 3 días |
| 7 | Migración de datos existentes | C4, A4, A5, usuarios huérfanos | Fases 1–5 | 2 días |
| 8 | Verificación final, despliegue y rollback | Todos | Todas | 1,5 días |

**Total orientativo:** 20–21 días de una persona; 2–3 semanas con dos personas. No incluye tiempo de aprobación ni ventanas de despliegue.

---

## 5. Fase 0 — Preparación

| ID | Tarea | Entregable |
|---|---|---|
| 0.1 | Crear rama de integración y etiquetar el estado actual (`git tag pre-correcciones`). | Rama y tag. |
| 0.2 | Exportar Firestore y copiar `firestore.rules`, `firestore.indexes.json` y `firebase.json`; `functions/` se conserva como referencia, pero no se despliega en Spark. | Backup en almacenamiento seguro. |
| 0.3 | Crear/validar proyecto de staging con Auth y Firestore; Functions no se usan en Spark. | Staging operativo. |
| 0.4 | Sembrar datos de prueba: admin activo, supervisor activo, supervisor inactivo, servicio abierto, servicio cerrado con cierre completo, servicio con extras, servicio con `personalFormo` inválido. | Script `scripts/seed-emulator.mjs` o similar. |
| 0.5 | Ejecutar línea base: `lint`, `typecheck`, `build`, script de reglas. | Reporte de línea base. |
| 0.6 | Documentar credenciales/entornos sin incluirlas en el repo (`.env.local`, cuenta de servicio de Admin SDK). | Guía de entorno. |
| 0.7 | Configurar Vitest (o el runner elegido) y el script `npm run test`, con una prueba de humo. | Runner y script funcionando antes de la Fase 1. |

**Criterio de salida:** staging reproducible y backup verificado (restaurar una copia en staging).

---

## 6. Fase 1 — Integridad del historial y los informes (P0/P1)

### 6.1 Normalizador único de servicios

**Problema:** cada función de lectura reconstruye el objeto a mano y descarta campos.

**Diseño:**

- Crear `src/services/normalizers.ts` con:
  - `toDateSafe(value, fallback?)` (reutilizar el de `jefeOperativoService`).
  - `normalizarServicioSupervisor(id, data): ServicioSupervisor`.
  - `normalizarServicioExtra(value): ServicioExtraordinario` (convierte `fechaApertura`/`fechaCierre`).
- El normalizador debe:
  - conservar `...data.cierre` y convertir `fechaHora`;
  - conservar `controlInstalaciones` y `serviciosExtraordinarios` normalizados;
  - tolerar `createdAt`/`expiresAt` nulos o ausentes con un fallback;
  - no lanzar si falta un campo; devolver valores seguros.

**Tareas:**

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 1.1 | Crear normalizadores y pruebas unitarias. | `src/services/normalizers.ts`, `src/services/normalizers.test.ts` | Casos: cierre completo, cierre ausente, `createdAt` nulo, extras con Timestamp. |
| 1.2 | Usar el normalizador en `getServicioActivo`, `getServiciosSupervisor`, `getAllServiciosAdmin` y `getServicioById`. | `src/services/servicioSupervisorService.ts` | El informe guardado se ve al reabrir; los contadores no son 0. |
| 1.3 | Usar el normalizador de extras en la lectura y retirar el formateo directo de Timestamps. | `servicioSupervisorService.ts`, `ListaServicios.tsx` | La pestaña de extras no lanza con un documento real. |

### 6.2 Unidades por ID

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 1.4 | Añadir prop opcional `registrosIniciales` a `UnidadesControl`; si no se pasa, cargar con `getServicioById(servicioId)`. | `src/components/supervisor/UnidadesControl.tsx` | Servicio abierto, cerrado y vista admin muestran sus registros. |
| 1.5 | Pasar `servicio.controlInstalaciones` desde `servicio/[id]` para evitar una lectura extra. | `src/app/servicio/[id]/page.tsx` | Sin parpadeo ni doble carga. |

### 6.3 `personalFormo`

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 1.6 | Añadir el campo “Personal que formó” al formulario (stepper) y usarlo. Si no se quiere exponer, eliminarlo del payload y del tipo. | `src/components/servicios-extraordinarios/AperturaForm.tsx`, `src/types/servicioExtraordinario.ts` | No se guarda `NaN`; el valor es un número ≥ 0. |
| 1.7 | Cambiar `parseInt(personalFormo)` por `Number(personalFormo) || 0`. | `AperturaForm.tsx` | Prueba con campo vacío → 0. |

### 6.4 Informe del supervisor

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 1.8 | Usar `s.apertura.jefeOperativo` como string; tolerar datos antiguos que lo guarden como `{ grado, nombreCompleto }`; eliminar el acceso directo `.grado/.nombreCompleto`. | `src/utils/reporteSupervisor.ts` | El informe muestra el nombre, no “undefined undefined”, con datos nuevos y antiguos. |
| 1.9 | Mapear `s.cierre.novedades.casos` y `s.cierre.novedades.observaciones`; eliminar `novedadesPersonal`/`novedadesResultados`. | `reporteSupervisor.ts` | El informe incluye los casos reales del servicio extraordinario. |
| 1.10 | Prueba de regresión con un servicio cerrado con dos casos y un extra. | `reporteSupervisor.test.ts` | El texto contiene los casos y el jefe correcto. |

### 6.5 Totales de cierre (A6)

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 1.11 | Calcular rutinarios y relevantes desde `controlInstalaciones` y prellenar el modal de cierre con el detalle por unidad. | `CierreTurnoModal.tsx`, `servicio/[id]/page.tsx` | El supervisor ve los totales reales antes de cerrar. |
| 1.12 | Si ajusta los totales, exigir justificación y guardarla (`cierre.ajusteTotales`, `cierre.justificacionAjuste`); validar que no sean negativos. | `CierreTurnoModal.tsx`, `servicioSupervisorService.ts` | No se cierra con negativos; todo ajuste queda registrado. |
| 1.13 | Validar la coherencia al cerrar; dejar el recálculo autoritativo para la Fase 4 (server action con Admin SDK, o validación en cliente si no hay servidor). | `servicioSupervisorService.ts`, `src/app/actions/admin.ts` (Fase 4) | Una discrepancia sin justificar se advierte y no se pierde. |

**Criterio de salida de la fase:** un servicio cerrado, abierto y visto por admin muestra toda su información; los informes no contienen `undefined` ni `NaN`; los totales coinciden con los registros o tienen justificación; pruebas unitarias en verde.

---

## 7. Fase 2 — Autenticación, bootstrap y acciones de IA (P0)

### 7.1 Bootstrap del primer administrador (C3)

**Decisión recomendada:** eliminar el flujo del cliente y crear el primer admin con un script de operador.

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 2.1 | Eliminar `handleFirstAdminSetup`, el modal y `allowDevAdminSetup` de la pantalla de login. | `src/app/login/page.tsx`, `.env.example` | No hay vía de creación de admin desde el navegador. |
| 2.2 | Crear `scripts/create-admin.mjs` con `firebase-admin`: recibe email, contraseña y nombre; crea Auth + `users/{uid}` con rol admin; valida que no exista otro admin. | `scripts/create-admin.mjs`, `README`/`docs/operacion.md` | Un operador puede crear el primer admin sin debilitar reglas. |
| 2.3 | Documentar el procedimiento y el requisito de credenciales (nunca en el repo). | `docs/operacion.md` | Procedimiento reproducible en staging. |
| 2.4 | Si se quiere una vía web para administradores ya existentes, implementarla como server action/API de Next con Admin SDK, verificación de admin y auditoría; el **primer** admin siempre se crea con el script local. En Spark no hay Cloud Functions. | `src/app/actions/admin.ts`, `scripts/create-admin.mjs` | Solo se puede ejecutar una vez y queda registrado. |

**No hacer:** cambiar `allow create: if isAdmin()` por `if isSignedIn()` para que “funcione”; eso permitiría a cualquier usuario crearse un perfil admin.

### 7.2 Proteger las server actions de IA (C6)

**Diseño:**

- Añadir `firebase-admin` como dependencia de servidor.
- Crear `src/lib/serverAuth.ts`:
  - `verifyIdToken(idToken)` con `getAuth().verifyIdToken`.
  - `requireActiveUser(idToken, roles?)`: lee `users/{uid}` con Admin SDK y exige `isActive === true` y rol permitido.
- Las acciones reciben `idToken` como primer argumento (o leen una cookie de sesión). Recomendación: token explícito para no añadir un flujo de cookies.
- Validar con Zod: `prompt` máximo 20.000 caracteres; `fileData.base64` máximo ~10 MB; MIME en `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- Devolver errores genéricos; registrar el detalle en servidor.
- Rate limit: contador por UID en `rate_limits/{uid}` con ventana de 1 minuto y límite configurable; en serverless, no usar memoria.
- Evaluar App Check para defensa en profundidad.

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 2.5 | Implementar `serverAuth` y pruebas unitarias con tokens simulados. | `src/lib/serverAuth.ts`, `src/lib/serverAuth.test.ts` | Sin token → 401; usuario inactivo → 403; rol incorrecto → 403. |
| 2.6 | Actualizar `generateContentAction`, `extraerDatosCasoAction`, `mejorarTextoAction`, `transformarTareasPasadoAction` y `generarInformeInstitucionalIAAction`. | `src/app/actions/ai.ts`, `src/app/actions.ts` | Todas exigen token y validan entrada. |
| 2.7 | Actualizar las llamadas del cliente para obtener `await user.getIdToken()` y pasarlo. | `FormularioUnidad.tsx`, `NovedadForm.tsx`, `AIExtractionModal.tsx`, `jefe-operativo/[id]/page.tsx` | Los flujos siguen funcionando con sesión; sin sesión fallan con mensaje claro. |
| 2.8 | Implementar rate limit y límites de tamaño; probar 429/413. | `src/lib/rateLimit.ts`, `src/lib/validation.ts` | Un usuario no puede saturar la cuota; el archivo grande se rechaza antes de leer. |
| 2.9 | Sanitizar errores: no devolver `error.message` del proveedor. | `actions/ai.ts`, `geminiDirect.ts` | El cliente recibe un mensaje genérico; el detalle queda en logs. |

**Riesgo:** `firebase-admin` en el runtime de Next. Validar en staging que la cuenta de servicio funciona. En Spark no hay Cloud Functions: si el servidor no puede usar Admin SDK, verificar el token con Identity Toolkit REST y leer el perfil con Firestore REST, o mantener la IA deshabilitada.

**Límite importante:** si la app se sirve como sitio estático (sin runtime Node), las server actions no existen. En ese escenario la IA no se puede proteger en servidor y habría que retirarla o moverla a un servicio externo; no es el objetivo de este plan.

**Criterio de salida:** una llamada anónima a la acción de IA es rechazada; una llamada autenticada funciona; el archivo de 50 MB se rechaza sin consumir la API.

---

## 8. Fase 3 — Normalización y robustez (P1)

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 3.1 | Normalizar fechas de extras en todos los puntos de lectura; usar `toDateSafe`. | `servicioSupervisorService.ts`, `normalizers.ts`, `ListaServicios.tsx` | Prueba con Timestamp real; no hay `RangeError`. |
| 3.2 | Inicialización perezosa de Genkit; error controlado si falta la clave. | `src/ai/flows.ts` | El build no falla sin `GOOGLE_AI_API_KEY`; la acción devuelve un error de configuración. |
| 3.3 | Validar tamaño/MIME en el modal antes de `FileReader`; mensaje específico. | `AIExtractionModal.tsx`, `aiExtractionService.ts` | Un PDF de 20 MB se rechaza sin leerlo. |
| 3.4 | Sustituir `console.error` de rutas críticas por un logger mínimo y mensajes de UI. | `src/app/**`, `src/services/**` | El usuario ve un error; el detalle no se filtra. |

---

## 9. Fase 4 — Reglas, concurrencia, retención y auditoría (P1)

### 9.1 Endurecer reglas (A2)

**Cambios propuestos:**

- `servicios_supervisor` y `servicios_jefe_operativo`:
  - Un supervisor solo puede actualizar mientras `estado == 'abierto'`.
  - La transición permitida es `abierto → cerrado`; no se puede volver a abrir.
  - `apertura`, `uid`, `createdAt` son inmutables.
  - Al cerrar, `cierre` debe ser un mapa con `fechaHora` timestamp; `expiresAt` debe ser timestamp y posterior al cierre.
  - Una vez `estado == 'cerrado'`, el supervisor no puede modificar `cierre` ni `expiresAt`; solo un admin mediante server action auditada o script local.
  - Toda actualización de supervisor debe incluir `updatedAt` y `updatedBy == request.auth.uid`.
- `users`: el admin no puede cambiarse el rol a sí mismo ni desactivarse si es el último admin activo; validar en server action/script.
- `servicios_activos/{uid}` (nueva colección): lectura propia/admin; creación solo si `uid == request.auth.uid`; borrado propio/admin; sin updates libres.
- `auditoria/{id}`: solo lectura admin; escritura solo Admin SDK (denegar cliente).
- `servicios_*_archivados/{id}`: solo lectura admin; escritura solo Admin SDK.

**Orden de despliegue para no romper la app:**

1. La app empieza a escribir `updatedAt`/`updatedBy`.
2. Se despliegan reglas tolerantes (permiten documentos antiguos sin esos campos).
3. Se ejecuta el backfill de `updatedAt`/`updatedBy`.
4. Se despliegan las reglas estrictas.

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 4.1 | Escribir reglas nuevas y pruebas de reglas para transiciones, inmutabilidad y roles. | `firestore.rules`, `verify-firestore-rules.mjs` o `tests/rules/` | Todos los casos pasan en el emulador. |
| 4.2 | Añadir `updatedAt`/`updatedBy` a todas las escrituras de servicio. | `servicioSupervisorService.ts`, `jefeOperativoService.ts`, `servicioExtraordinarioService.ts` | Cada update los incluye. |
| 4.3 | Ejecutar el backfill de `updatedAt`/`updatedBy`; desplegar reglas tolerantes en staging y luego estrictas. | staging/producción, `scripts/backfill-audit-fields.mjs` | El backfill termina antes de las reglas estrictas; la app sigue operando durante la transición. |

### 9.2 Servicio activo único (A4)

**Diseño:** documento bloqueo `servicios_activos/{uid}` con `{ uid, tipo, servicioId, createdAt }`.

- Abrir: transacción que lee el bloqueo; si existe, error “Ya tienes un servicio activo”; si no, crea el servicio y el bloqueo.
- Cerrar: transacción que actualiza el servicio y elimina el bloqueo si `servicioId` coincide.
- Si el bloqueo queda huérfano (servicio borrado), una función de reparación lo limpia.

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 4.4 | Implementar apertura/cierre transaccional con bloqueo. | `servicioSupervisorService.ts`, `jefeOperativoService.ts` | Dos aperturas simultáneas: una pasa, la otra recibe error claro. |
| 4.5 | Backfill de bloqueos para servicios abiertos existentes; resolver duplicados manualmente. | `scripts/backfill-active-locks.mjs` | Un bloqueo por UID; los duplicados quedan reportados. |
| 4.6 | Reglas para `servicios_activos`. | `firestore.rules` | Solo el dueño/admin puede crear/borrar; no se puede apuntar a un servicio ajeno. |

### 9.3 Retención (A5)

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 4.7 | Definir `RETENCION_DIAS = 9`; al cerrar supervisor, `expiresAt = cierre.fechaHora + 9 días`. | `servicioSupervisorService.ts` | Un servicio cerrado se conserva 9 días desde el cierre. |
| 4.8 | Corregir la etiqueta del botón y el mensaje de limpieza. | `AdminDashboard.tsx` | La UI dice “9 días desde el cierre”. |
| 4.9 | Detectar servicios abiertos con más de 24 h; reportarlos al admin, no borrarlos automáticamente. | `scripts/audit-stale-open.mjs` (no hay scheduler en Spark) | El admin ve una lista y decide. |
| 4.10 | Backfill de `expiresAt` para servicios cerrados existentes. | `scripts/backfill-expires-at.mjs` | `dry-run` reporta cuántos cambian; aplicar solo tras revisar. |

### 9.4 Archivado y auditoría (A7)

**Diseño (Spark):** no se borra sin archivar.

- **Preferido si hay servidor Node:** server action/API `archivarServicio({ tipo, id, motivo })` con Admin SDK:
  - verifica que el llamante sea admin activo;
  - copia el documento a `servicios_supervisor_archivados/{id}` o `servicios_jefe_operativo_archivados/{id}` con `archivedAt`, `archivedBy`, `motivo`;
  - elimina el original en la misma transacción;
  - escribe `auditoria/{id}` con acción, actor, objetivo y motivo.
- **Sin servidor:** transacción del cliente admin: lee el original, crea el documento de archivo, crea la entrada de auditoría y borra el original. Las reglas permiten `create` en archivo/auditoría y `delete` del original solo a admin; archivo/auditoría no admiten `update` ni `delete`.
- UI: botón “Archivar” en lugar de “Eliminar”, con motivo obligatorio.
- Reglas: las colecciones de archivo/auditoría solo las lee un admin; un supervisor no puede leerlas ni escribirlas.

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 4.11 | Implementar `archivarServicio` y `auditoria` (server action con Admin SDK o transacción cliente admin). | `src/services/archivoService.ts`, `src/app/actions/admin.ts` (si hay servidor) | Un admin archiva; el documento aparece en archivo y en auditoría. |
| 4.12 | Reemplazar `deleteServicio` en la UI. | `AdminDashboard.tsx` | No hay borrado sin archivo ni motivo. |
| 4.13 | Reglas de archivo/auditoría. | `firestore.rules` | Un supervisor no puede leer ni escribir archivos; un admin sí lee y crea; no se actualiza ni borra la auditoría. |

**Nota:** los documentos ya eliminados antes de esta fase no se pueden recuperar; documentarlo.

### 9.5 Cierre autoritativo de supervisor (A6)

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 4.14 | Mover el cierre de supervisor a un server action/API con Admin SDK que lea `controlInstalaciones`, recalcule los totales, registre la discrepancia y escriba `cierre`/`expiresAt` en una transacción. | `src/app/actions/admin.ts`, `servicioSupervisorService.ts` | Un cliente no puede falsificar los totales; el cierre queda auditado. |

En Spark no hay Cloud Functions. Si la app corre en un servidor Node con Admin SDK, 4.14 es viable; si no, se sustituye por validación en cliente y revisión posterior del admin, y se documenta la limitación.

---

## 10. Fase 5 — Usuarios y panel admin (P1)

### 10.1 Operaciones de usuario (A3)

**Diseño (Spark):** no hay Cloud Functions. Se usan server actions/API con Admin SDK si la app corre en un servidor Node; si no, se combinan reglas de Firestore y scripts locales.

| Operación | En Spark |
|---|---|
| `adminSetUserActive` | El admin actualiza `users/{uid}.isActive` desde el cliente (las reglas lo permiten) y la app cierra la sesión si está inactivo; `disabled` en Auth requiere un script local con Admin SDK. |
| `adminUpdateUserProfile` | El admin actualiza grado, nombre y celular desde el cliente; las reglas validan que no cambie rol, email, uid ni `createdAt`. |
| `adminResetPassword` | `sendPasswordResetEmail` desde el cliente (el usuario recibe el enlace) o script local con Admin SDK si se quiere generar el enlace. |
| `adminDeleteUser` | El admin archiva/borra el perfil en Firestore; la cuenta de Auth se elimina con un script local. Impedir borrar al último admin en la UI y en el script. |

Las operaciones de servidor verifican que el llamante sea admin activo; las de cliente dependen de las reglas. Las que tocan Auth se ejecutan con script local y quedan registradas en `auditoria`. En Spark, el restablecimiento desde la UI envía el correo al usuario; si se requiere que el admin entregue un enlace, se usa el script local con Admin SDK.

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 5.1 | Implementar las operaciones y sus pruebas (server actions si hay servidor; si no, cliente + scripts). | `src/app/actions/admin.ts`, `src/services/userAdminService.ts`, `scripts/admin-users.mjs`, `tests/admin/` | Un no-admin recibe `permission-denied`; un admin completa la operación. |
| 5.2 | Añadir acciones en `UsuariosTab`: activar/desactivar, editar, restablecer contraseña, eliminar. | `AdminDashboard.tsx` | La tabla refleja el estado y las acciones piden confirmación. |
| 5.3 | Validar `isActive` en el arranque de la app y cerrar sesión si está inactivo. | `AuthContext.tsx` | Un usuario desactivado no puede operar. |
| 5.4 | Impedir que el último admin se desactive o se elimine. | `src/app/actions/admin.ts`, `scripts/admin-users.mjs`, `firestore.rules` | La operación se rechaza con mensaje claro. |

### 10.2 Panel admin unificado (M3)

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 5.5 | Mostrar servicios de Supervisor y Jefe Operativo en la misma pestaña, con filtro y tipo. | `AdminDashboard.tsx` | El admin ve ambos tipos y puede abrir/archivar cada uno. |
| 5.6 | Incluir el responsable (grado/nombre) y el tipo en la tarjeta. | `AdminDashboard.tsx` | La lista es útil para auditoría. |

### 10.3 Historial (M4)

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 5.7 | Paginar con `limit(20)` + `startAfter`; añadir “Cargar más”. | `historial/page.tsx` | No se cargan todos los documentos. |
| 5.8 | Añadir `catch` con alerta y estado vacío diferenciado de error. | `historial/page.tsx` | Una falla de red muestra un mensaje, no una lista vacía. |
| 5.9 | Mostrar responsable y permitir filtrar por él. | `historial/page.tsx` | El admin puede acotar por supervisor/jefe. |

### 10.4 Sesión sin perfil (M5)

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 5.10 | Crear `AuthGate` o una pantalla de “usuario no autorizado” si hay sesión sin perfil activo. | `src/context/AuthContext.tsx`, `src/app/page.tsx` | No se renderiza el panel operativo; hay opción de cerrar sesión. |

---

## 11. Fase 6 — UX, producto y mantenimiento (P2/B)

| ID | Tarea | Archivos | Aceptación |
|---|---|---|---|
| 6.1 | Ocultar/deshabilitar la pestaña Imagen hasta implementarla; o implementar OCR. | `AIExtractionModal.tsx`, `aiExtractionService.ts` | No se ofrece una función que siempre falla. |
| 6.2 | Ampliar la extracción de cierre para devolver `casosRelevantes` y `observaciones`; o retirar el botón del cierre. | `aiExtractionService.ts`, `CierreForm.tsx` | El botón produce datos o no existe. |
| 6.3 | Implementar el detalle del servicio extraordinario o quitar “Ver Detalle”. | `ListaServicios.tsx`, `servicio/[id]/page.tsx` | El botón hace lo que promete. |
| 6.4 | Añadir `isSubmitting` a `FormularioUnidad` y `CierreTurnoModal`; deshabilitar botones. | `FormularioUnidad.tsx`, `CierreTurnoModal.tsx` | Doble clic no duplica registros. |
| 6.5 | Cerrar con transacción e idempotencia; verificar estado abierto. | `servicioSupervisorService.ts` | Dos cierres simultáneos: uno gana, el otro recibe error. |
| 6.6 | Contar unidades únicas; impedir duplicados o permitir edición; optional chaining. | `ResumenTurno.tsx`, `UnidadesControl.tsx` | El progreso no supera el total; datos antiguos no rompen. |
| 6.7 | Añadir fecha/hora de apertura al Jefe Operativo. | `AperturaForm.tsx` | El reporte usa la fecha real del servicio. |
| 6.8 | `next typegen` antes de `tsc` (si la versión lo soporta; si no, documentar `build → typecheck`). | `package.json` | `npm run typecheck` funciona en clon limpio. |
| 6.9 | Validar `firebase.json` en staging; si Next corre fuera de Firebase, dejar solo Firestore (reglas/índices) y no desplegar Hosting/Functions. | `firebase.json` | El despliegue no intenta servir Next desde Hosting en Spark. |
| 6.10 | Añadir Playwright y CI con lint, typecheck, test, build y reglas; ampliar la suite de Vitest configurada en 0.7. | `package.json`, `.github/workflows/ci.yml`, `playwright.config.ts` | Pipeline verde en cada PR. |
| 6.11 | Actualizar `.ai` o eliminarlo; documentar arquitectura, roles, despliegue y retención. | `.ai/`, `docs/` | La documentación coincide con el código. |
| 6.12 | Eliminar dependencias sin uso; reactivar reglas ESLint gradualmente. | `package.json`, `eslint.config.mjs` | Build y lint verdes; menos `any`. |
| 6.13 | Eliminar la ruta `/servicio` legacy y sus componentes. | `src/app/servicio/page.tsx`, `ServiciosExtra.tsx`, `OperativosMOP.tsx`, `NovedadForm.tsx`, `ConfiguracionSupervisor.tsx`, `firestoreService.ts` | No hay rutas ni código muerto. |
| 6.14 | Contraseña inicial oculta + generación temporal + cambio obligatorio. | `AdminDashboard.tsx` | No se muestra en texto claro por defecto. |
| 6.15 | Evaluar App Check, 2FA y cabeceras de seguridad. | Firebase/Next config | Decisión documentada. |
| 6.16 | Añadir `error.tsx`, `not-found.tsx`, `loading.tsx`. | `src/app/` | Errores y cargas tienen UI consistente. |
| 6.17 | Ignorar logs/artefactos; limpiar `.acl-audit` cuando el build esté validado. | `.gitignore` | `git status` limpio salvo cambios intencionales. |
| 6.18 | Unificar marca y valorar manifest PWA. | `layout.tsx`, `public/` | Nombre coherente; PWA opcional. |
| 6.19 | Ajustar scripts de despliegue a Spark: `deploy:rules`, `deploy:indexes`; no ejecutar `firebase deploy` completo ni desplegar Functions/Hosting sin verificar. | `package.json`, `firebase.json`, `docs/operacion.md` | El despliegue no intenta Functions ni Hosting; solo reglas/índices. |

---

## 12. Fase 7 — Migración de datos existentes

Todas las migraciones se ejecutan con `firebase-admin`, credenciales fuera del repo, modo `dry-run` por defecto y `--apply` explícito. Cada script escribe un reporte CSV/JSON con IDs y cambios.

| ID | Migración | Script | Regla |
|---|---|---|---|
| 7.1 | `personalFormo` inválido → `0` (o valor calculado solo si es determinista). | `scripts/fix-personal-formo.mjs` | Escanear `servicios_jefe_operativo` y `servicios_supervisor.serviciosExtraordinarios[]`; no consultar `NaN` por igualdad; reportar cuántos. |
| 7.2 | `expiresAt` de servicios de supervisor cerrados → `cierre.fechaHora + 9 días`. | `scripts/backfill-expires-at.mjs` | Solo cerrados con cierre válido; no tocar abiertos. |
| 7.3 | Bloqueos `servicios_activos` para servicios abiertos. | `scripts/backfill-active-locks.mjs` | Si hay duplicados, no crear bloqueo; reportar para resolución manual. |
| 7.4 | Verificación final de `updatedAt`/`updatedBy` (el backfill se ejecuta en 4.3); reparar faltantes. | `scripts/backfill-audit-fields.mjs` | Usar `createdAt` y `uidSupervisor`/`uidJefe` como valores iniciales; no inventar usuarios. |
| 7.5 | Cuentas de Auth sin perfil y perfiles sin Auth. | `scripts/audit-orphan-users.mjs` | Reportar; no borrar automáticamente. Revisión manual. |
| 7.6 | Servicios duplicados abiertos por UID. | `scripts/audit-duplicate-open.mjs` | Reportar; decidir cuál conservar. |
| 7.7 | Documentos con `cierre` incompleto (si existen). | `scripts/audit-incomplete-cierres.mjs` | Reportar; no reconstruir datos inexistentes. |

**Orden:** el backfill de 4.3 se ejecuta antes de las reglas estrictas; 7.1–7.3 antes de la limpieza; 7.4 es la verificación final de esos campos; 7.5/7.6 en paralelo, con revisión manual. Antes de cada `--apply`, exportar la colección afectada.

---

## 13. Plan de pruebas

### 13.1 Unitarias (Vitest)

- `normalizers`: cierre completo/ausente, `createdAt` nulo, Timestamps, extras, datos legacy.
- `reporteSupervisor`: jefe string, casos, observaciones, servicio sin extras.
- `serverAuth`: sin token, token inválido, usuario inactivo, rol incorrecto.
- `validators`: tamaño, MIME, prompt vacío/largo.
- `rateLimit`: ventana y límite.

### 13.2 Reglas (emulador)

- Admin lee cualquier perfil; supervisor solo el suyo.
- Supervisor no lee servicios ajenos.
- Supervisor crea su servicio; no puede crear para otro UID.
- Supervisor actualiza mientras está abierto; no puede reabrir ni cambiar `cierre` cerrado.
- Admin puede archivar; supervisor no.
- `servicios_activos`: solo el dueño/admin; no se puede apuntar a un servicio ajeno.
- `auditoria`/archivo: solo admin lee; cliente no escribe.

Ejecutar con `firebase emulators:exec --only firestore "npm run test:rules"`.

### 13.3 E2E (Playwright + emulador)

1. Login de admin → panel → crear supervisor → desactivar → el supervisor no puede entrar.
2. Login de supervisor → abrir turno → registrar unidad → recargar → los datos siguen.
3. Cerrar turno → recargar → el informe y los contadores se conservan.
4. Admin abre el servicio cerrado → ve unidades, cierre e informe.
5. Abrir Jefe Operativo → verificar que `personalFormo` es numérico → cerrar → generar reporte → no contiene `undefined`/`NaN`.
6. Crear servicio extraordinario → recargar → la pestaña no rompe.
7. Invocar una acción de IA sin sesión → rechazo; con sesión → funciona.

### 13.4 Manuales

- Móvil (Android/iOS) y escritorio.
- Modo offline/recarga: los datos no desaparecen.
- Mensajes de error de red y permisos.
- Impresión/PDF del informe.

---

## 14. Despliegue y rollback

### 14.1 Orden de despliegue

1. **Reglas aditivas e índices** para las nuevas colecciones (`servicios_activos`, archivo, auditoría) y campos.
2. **App** (y server actions, si hay servidor Node) que escribe `updatedAt`/`updatedBy`, usa bloqueos y muestra la nueva UI.
3. **Migraciones** con `dry-run` y luego `--apply`.
4. **Reglas estrictas** después de verificar que la app escribe los campos nuevos.
5. **Limpieza** de la ruta legacy y dependencias (PR separado).

No se despliegan Cloud Functions ni se ejecuta `firebase deploy` completo en Spark. Usar `firebase deploy --only firestore:rules,firestore:indexes`.

### 14.2 Rollback

- App: volver a la versión anterior en el servidor Node/VPS (o en el hosting que se use).
- Reglas: `firebase deploy --only firestore:rules` con el archivo anterior (guardado en Fase 0).
- Datos: restaurar la exportación; las migraciones deben ser reversibles o aditivas.
- Si una regla estricta bloquea producción: volver a la versión tolerante y corregir la app antes de reintentar.
- No hay Functions que revertir; si se usó un script de Auth, documentar los UID afectados para restaurarlos.

### 14.3 Ventana y comunicación

- Desplegar en horario de baja actividad.
- Avisar a supervisores si hay cierre de sesión o cambios de contraseña.
- Mantener un canal de soporte para las primeras 24 h.

---

## 15. Cronograma orientativo

| Semana | Foco | Entregable |
|---|---|---|
| 1 | Fases 0–1 | Historial, unidades, `personalFormo` e informes corregidos; pruebas unitarias. |
| 2 | Fase 2 | IA autenticada; bootstrap por script; pruebas de auth. |
| 3 | Fases 3–4 | Normalización, reglas, bloqueo de servicio activo, retención, archivado. |
| 4 | Fases 5–6 | Usuarios, panel admin, historial, UX y limpieza. |
| 5 | Fases 7–8 | Migraciones, E2E, CI, staging, despliegue y rollback. |

Con dos desarrolladores, las fases 3–6 pueden solaparse y reducir el calendario a 2–3 semanas.

---

## 16. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Reglas nuevas bloquean escrituras legítimas | Media | Alto | Staging, reglas tolerantes primero, pruebas de reglas, rollback preparado. |
| Migración altera datos válidos | Media | Alto | `dry-run`, backup, reporte, ejecución por lotes, revisión manual. |
| `firebase-admin` no funciona en el runtime de Next | Media | Medio | Validar en staging; alternativa: Identity Toolkit REST + Firestore REST, o scripts locales. |
| Rate limit en memoria no sirve en serverless | Alta | Medio | Usar Firestore/App Check; no confiar en memoria. |
| Limitaciones de Spark (sin Functions ni scheduler) | Alta | Medio | Limpieza manual/script, archivado cliente o server action, sin tareas programadas; documentar y revisar si alguna necesidad crítica exige Blaze. |
| Next SSR/server actions no se pueden alojar en Firebase Hosting Spark | Media | Alto | Definir el servidor Node/VPS antes de la Fase 2; no desplegar `hosting` en Spark sin verificar. |
| Cambios de Auth dejan sesiones huérfanas | Media | Medio | `isActive` + reglas + cierre de sesión en la app; `disabled` de Auth vía script local; comunicar. |
| Alcance crece y retrasa P0 | Alta | Alto | Congelar P2/B hasta cerrar P0/P1. |
| Emulador no representa producción | Media | Medio | Pruebas en staging con datos anonimizados. |

---

## 17. Definición de terminado

- [ ] C1–C6 cerrados con pruebas.
- [ ] A1–A8 cerrados o con decisión documentada.
- [ ] Reglas estrictas desplegadas y probadas.
- [ ] Migraciones aplicadas con reporte y backup.
- [ ] Panel admin permite desactivar/editar/resetear/archivar.
- [ ] Historial paginado y con errores visibles.
- [ ] IA autenticada, limitada y con errores genéricos.
- [ ] Suite unitaria, de reglas y E2E en CI.
- [ ] Documentación (`.ai`, operación, retención, roles, hosting) actualizada.
- [ ] Staging validado y rollback probado.
- [ ] `lint`, `typecheck`, `test`, `build` en verde.
- [ ] Sin `undefined`, `NaN` ni cierres vacíos en los informes.
- [ ] Despliegue compatible con Spark: solo reglas/índices; sin dependencia de Cloud Functions.
- [ ] Hosting de Next definido y documentado (servidor Node/VPS o limitación asumida).

---

## 18. Matriz de trazabilidad (P0/P1)

| Hallazgo | Tareas del plan | Fase |
|---|---|---|
| C1 | 1.1–1.3 | 1 |
| C2 | 1.4–1.5 | 1 |
| C3 | 2.1–2.4 | 2 |
| C4 | 1.6–1.7 | 1 |
| C5 | 1.8–1.10 | 1 |
| C6 | 2.5–2.9 | 2 |
| A1 | 1.3, 3.1 | 1 y 3 |
| A2 | 4.1–4.3 | 4 |
| A3 | 5.1–5.4 | 5 |
| A4 | 4.4–4.6 | 4 |
| A5 | 4.7–4.10 | 4 |
| A6 | 1.11–1.13 | 1 y 4 |
| A7 | 4.11–4.13 | 4 |
| A8 | 3.2 | 3 |
| M1–M14 | 5.5–5.10 y 6.1–6.18 | 5 y 6 |
| B1–B6 | 6.13–6.18 | 6 |

Los hallazgos P0/P1 tienen al menos una tarea y una prueba asociada. Los P2/B se concentran en la Fase 6.

---

## 19. Anexo: secuencia sugerida de PRs

1. `fix/normalizers` — normalizador + pruebas (C1, A1).
2. `fix/unidades-por-id` — C2.
3. `fix/personal-formo` — C4.
4. `fix/totales-cierre` — A6.
5. `fix/informe-supervisor` — C5.
6. `fix/bootstrap-admin` — C3 (script + eliminación del flujo cliente).
7. `feat/ai-auth` — C6, M9.
8. `feat/rules-integrity` — A2.
9. `feat/active-service-lock` — A4.
10. `feat/retention` — A5.
11. `feat/archive-audit` — A7.
12. `feat/user-admin` — A3.
13. `feat/admin-unificado` — M3, M4, M5.
14. `chore/ux-cleanup` — M1, M2, M6–M8, M10–M14, B1–B6.
15. `chore/data-migrations` — Fase 7.
16. `chore/ci-e2e` — Fase 6.10 y 8.

Cada PR debe incluir: descripción del cambio, evidencia de prueba, impacto en datos/reglas, plan de rollback y checklist de aceptación.
