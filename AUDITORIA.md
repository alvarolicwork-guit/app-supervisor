# Auditoría técnica de la App Supervisor

**Fecha:** 22/10/2026  
**Alcance:** código fuente, configuración, reglas de Firestore, flujos de datos y verificación de compilación.  
**Excluido:** auditoría del proyecto Firebase desplegado (consola, credenciales, datos reales), pruebas de penetración y revisión de infraestructura.

**Nota posterior:** el proyecto se mantiene en Firebase **Spark**. Las recomendaciones que mencionan Cloud Functions se adaptan a scripts locales de Admin SDK o server actions de Next en [PLAN_CORRECCION.md](PLAN_CORRECCION.md). Las correcciones de código de ese plan ya fueron aplicadas y las migraciones, reglas e índices se desplegaron en `registro-de-supervisor` el 22/10/2026.

---

## 1. Veredicto ejecutivo

La aplicación **compila y pasa lint/typecheck**, y el camino feliz (login, apertura de turno, registro de unidades, cierre y reporte) está implementado. Las reglas de Firestore aíslan correctamente los servicios entre supervisores y reservan la administración a usuarios con rol `admin` activo.

Sin embargo, la auditoría encontró **defectos que afectan la integridad del registro histórico y de los informes oficiales**, además de **huecos de seguridad en las funciones de IA** y una **gestión de usuarios incompleta**. Los más graves no son de acceso a datos, sino de **pérdida o corrupción de información al leer/cerrar servicios**:

1. Al reabrir un servicio de supervisor ya cerrado, **se descarta todo el contenido del cierre** y el informe guardado no se muestra.
2. La pestaña **Control de Instalaciones de un servicio cerrado o visto por un admin carga 0 registros**.
3. Los **servicios extraordinarios pueden romper la vista** al formatear fechas que Firestore devuelve como `Timestamp`, no como `Date`.
4. El **primer administrador no se puede crear** con las reglas actuales; el flujo deja además una cuenta de Authentication huérfana.
5. Los servicios de Jefe Operativo guardan **`personalFormo` como `NaN`** porque el campo no existe en la interfaz.
6. El **informe del supervisor** imprime “undefined undefined” en el jefe operativo y omite las novedades reales de los servicios extraordinarios.

**Recomendación:** corregir los seis puntos anteriores antes de usar la app como registro oficial, y añadir autenticación a las acciones de IA. El resto son mejoras de integridad, UX y mantenibilidad.

---

## 2. Método y estado de verificación

| Comprobación | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run typecheck` | ✅ Sin errores |
| `npm run build` | ✅ Next.js 16.1.1, 8 rutas generadas |
| `git diff` de archivos rastreados | ✅ Sin cambios (la auditoría no modificó código) |
| Revisión de reglas e índices | ✅ Leída; cobertura de pruebas limitada |
| Ejecución contra Firebase real | ⚠️ No realizada |
| Pruebas automatizadas | ⚠️ Solo script manual de reglas, cobertura parcial |

El build se ejecutó inicialmente con un `EPERM` del sandbox al escribir `.next/trace`. Se diagnosticaron y repararon los permisos de Windows de `.next`; después el build pasó con acceso ampliado. **No es un defecto de la aplicación**; el detalle y el rollback están en el anexo.

---

## 3. Resumen de hallazgos

| ID | Severidad | Área | Hallazgo |
|---|---|---|---|
| C1 | Crítica | Historial | Al leer un servicio cerrado se descarta `cierre` completo |
| C2 | Crítica | Historial | `UnidadesControl` carga por servicio activo, no por ID |
| C3 | Crítica | Autenticación | El bootstrap del primer admin falla con las reglas actuales |
| C4 | Crítica | Datos | `personalFormo` se guarda como `NaN` |
| C5 | Crítica | Informes | Informe del supervisor con “undefined undefined” y sin novedades de extras |
| C6 | Crítica | Seguridad/IA | Server actions de IA sin autenticación ni límites |
| A1 | Alta | Datos/UI | Timestamps de servicios extraordinarios no se convierten a `Date` |
| A2 | Alta | Integridad | Las reglas permiten reabrir/alterar cierres y expiraciones |
| A3 | Alta | Usuarios | No se puede desactivar, editar ni resetear contraseñas |
| A4 | Alta | Integridad | Se pueden abrir varios servicios activos a la vez |
| A5 | Alta | Retención | Expiración inconsistente (7 vs 9 días) y servicios abiertos sin limpieza |
| A6 | Alta | Informes | Totales de cierre manuales, no derivados de los registros |
| A7 | Alta | Auditoría | Eliminación física de registros sin trazabilidad |
| A8 | Alta | Despliegue | `flows.ts` lanza al importar si falta la API key |
| M1 | Media | IA | Pestaña Imagen no implementada; auto-completar de cierre no extrae casos |
| M2 | Media | UX | “Ver Detalle” de servicios extraordinarios no muestra detalle |
| M3 | Media | Admin | El panel admin no ve ni gestiona servicios de Jefe Operativo |
| M4 | Media | Historial | Sin paginación, sin manejo de errores y sin filtro por responsable |
| M5 | Media | Sesión | Usuario sin perfil o inactivo queda en una UI vacía sin explicación |
| M6 | Media | UX | Doble envío y cierres no idempotentes |
| M7 | Media | Datos | Resumen de turno cuenta duplicados y puede romperse con datos antiguos |
| M8 | Media | Datos | Fecha de apertura del Jefe Operativo no editable |
| M9 | Media | IA | Sin validación de tamaño/MIME; errores técnicos al cliente |
| M10 | Media | CI | `next-env.d.ts` depende de `.next` generado |
| M11 | Media | Despliegue | Configuración de Firebase Hosting a revisar |
| M12 | Media | Calidad | Sin tests automatizados ni CI; script de reglas parcial |
| M13 | Media | Documentación | `.ai` desactualizado y contradictorio |
| M14 | Media | Mantenimiento | Dependencias sin uso y ESLint permisivo |
| B1 | Baja | Código | Ruta `/servicio` legacy con módulos que no persisten |
| B2 | Baja | UX | Contraseña inicial visible y sin política de complejidad |
| B3 | Baja | Seguridad | Sin App Check, 2FA ni cabeceras de seguridad |
| B4 | Baja | Calidad | Sin `error.tsx`, `not-found.tsx` ni `loading.tsx` |
| B5 | Baja | Higiene | Logs y artefactos sin ignorar; `.acl-audit` nuevo |
| B6 | Baja | Marca | Metadatos “Novedades Policiales” vs UI “App Supervisor” |

---

## 4. Hallazgos críticos

### C1. El cierre se descarta al leer un servicio cerrado

**Evidencia:**
- [`src/services/servicioSupervisorService.ts:138-140`](src/services/servicioSupervisorService.ts#L138-L140)
- [`src/services/servicioSupervisorService.ts:167-169`](src/services/servicioSupervisorService.ts#L167-L169)
- [`src/services/servicioSupervisorService.ts:280-282`](src/services/servicioSupervisorService.ts#L280-L282)
- [`src/app/servicio/[id]/page.tsx:267-276`](src/app/servicio/%5Bid%5D/page.tsx#L267-L276)

Las tres funciones de lectura construyen:

```ts
cierre: data.cierre ? {
    fechaHora: data.cierre.fechaHora.toDate(),
} : undefined,
```

Es decir, conservan **solo `fechaHora`** y descartan `entregaServicio`, `casosRutinarios`, `casosRelevantes` e `informeFinal`. En la vista de reporte, `servicio.cierre?.informeFinal` queda `undefined` y se muestra el mensaje de “versión anterior del sistema”, aunque el informe sí esté guardado en Firestore. Los contadores de casos también aparecen en 0.

**Impacto:** el registro histórico y el informe oficial del supervisor no se pueden consultar al reabrir el servicio. El dato existe, pero la aplicación lo oculta. Es el hallazgo más grave para la auditabilidad.

**Recomendación:** normalizar preservando el objeto completo:

```ts
cierre: data.cierre
  ? { ...data.cierre, fechaHora: data.cierre.fechaHora.toDate() }
  : undefined,
```

Aplicarlo en `getServicioActivo`, `getServiciosSupervisor`, `getAllServiciosAdmin` y `getServicioById`, idealmente mediante un único normalizador compartido.

---

### C2. El control de instalaciones histórico siempre carga vacío

**Evidencia:** [`src/components/supervisor/UnidadesControl.tsx:83-99`](src/components/supervisor/UnidadesControl.tsx#L83-L99)

```ts
const servicio = await getServicioActivo(user.uid);
if (servicio && servicio.id === servicioId) {
    setRegistrosSesion(servicio.controlInstalaciones || []);
}
```

`getServicioActivo` consulta **solo servicios con `estado == 'abierto'` y `uidSupervisor == user.uid`**. Por tanto:

- Un supervisor que abre un servicio **cerrado** obtiene `null` y ve 0 registros.
- Un **admin** que abre cualquier servicio consulta por su propio UID, no por el del supervisor, y también ve 0.
- Aunque el servicio esté abierto, si el UID no coincide, no carga.

**Impacto:** la vista de auditoría de unidades no sirve para servicios históricos ni para el administrador. El reporte final sí usa `servicio.controlInstalaciones`, pero la pestaña de control queda vacía.

**Recomendación:** cargar por ID con `getServicioById(servicioId)` (o recibir los registros como prop desde `servicio/[id]`), sin depender del servicio activo ni del UID del visitante. Las reglas ya impiden leer servicios ajenos, así que el cliente puede solicitarlo directamente.

---

### C3. El bootstrap del primer administrador está roto y deja una cuenta huérfana

**Evidencia:**
- [`src/app/login/page.tsx:71-82`](src/app/login/page.tsx#L71-L82)
- [`src/services/userService.ts:40-48`](src/services/userService.ts#L40-L48)
- [`firestore.rules:97-101`](firestore.rules#L97-L101)

El flujo crea el usuario en Firebase Authentication y, con esa misma sesión, intenta escribir `users/{uid}` con `role: 'admin'`. La regla de creación exige:

```
allow create: if isAdmin() && isValidUserCreate(userId);
```

`isAdmin()` requiere que ya exista un documento `users/{uid}` con rol admin. Como el documento es justamente el que se está creando, la condición es falsa y Firestore responde `permission-denied`. El usuario queda autenticado en Auth, sin perfil, y la app queda en un estado sin rol. No hay `signOut` ni compensación.

**Impacto:** el procedimiento de instalación inicial no funciona; si se habilita la variable de desarrollo, el administrador ve un error y la cuenta queda creada a medias. Si las reglas no estuvieran desplegadas, el flujo sería además un riesgo de escalada de privilegios.

**Recomendación:** eliminar el flujo del cliente. Crear el primer admin con Firebase Admin SDK/Cloud Function o desde la consola, y documentarlo. Si se mantiene una vía de bootstrap, debe usar una condición de “primer usuario” verificada en servidor y cerrar la sesión si falla la creación del perfil.

---

### C4. `personalFormo` se guarda como `NaN`

**Evidencia:** [`src/components/servicios-extraordinarios/AperturaForm.tsx:92`](src/components/servicios-extraordinarios/AperturaForm.tsx#L92), [`src/components/servicios-extraordinarios/AperturaForm.tsx:244-269`](src/components/servicios-extraordinarios/AperturaForm.tsx#L244-L269)

El estado `personalFormo` se inicializa como `''`, se usa en `parseInt(personalFormo)` y **no existe ningún input en el formulario para completarlo**. El resultado es `NaN`, que se envía en `novedadesFormacion.personalFormo` al abrir un servicio de Jefe Operativo o un servicio extraordinario.

**Impacto:** el dato “personal que formó” queda corrupto o la escritura falla según el SDK. Cualquier reporte o cálculo que lo use mostrará `NaN` o un valor inválido.

**Recomendación:** usar `Number(personalFormo) || 0` y, si el dato es necesario, añadir el campo al formulario. Si no se usa, eliminarlo del payload y del tipo.

---

### C5. El informe del supervisor imprime datos incorrectos y omite novedades

**Evidencia:** [`src/utils/reporteSupervisor.ts:78-96`](src/utils/reporteSupervisor.ts#L78-L96)

```ts
const jefe = s.apertura.jefeOperativo
    ? `${s.apertura.jefeOperativo.grado} ${s.apertura.jefeOperativo.nombreCompleto}`
    : 'Sin Jefe Operativo';
```

En el tipo [`AperturaServicioExtra`](src/types/servicioExtraordinario.ts#L36-L53), `jefeOperativo` es un **string**, no un objeto. El resultado es `undefined undefined`. Además, el informe busca `s.cierre?.novedadesPersonal` y `s.cierre?.novedadesResultados`, campos que **no existen** en [`CierreServicioExtra`](src/types/servicioExtraordinario.ts#L55-L68): las novedades reales están en `s.cierre.novedades.casos` y `s.cierre.novedades.observaciones`. Por eso siempre imprime “Sin novedad de importancia”.

**Impacto:** el informe institucional del supervisor —el documento que se eleva al Comando— contiene un nombre inválido y omite los casos relevantes de los servicios extraordinarios.

**Recomendación:** usar `s.apertura.jefeOperativo` directamente y mapear `s.cierre.novedades.casos`/`observaciones`. Añadir una prueba de regresión con un servicio extraordinario cerrado con casos.

---

### C6. Las acciones de IA no exigen autenticación ni tienen límites

**Evidencia:**
- [`src/app/actions/ai.ts:5-12`](src/app/actions/ai.ts#L5-L12)
- [`src/app/actions.ts:5-28`](src/app/actions.ts#L5-L28)
- [`src/ai/geminiDirect.ts:30-44`](src/ai/geminiDirect.ts#L30-L44)

Las server actions `generateContentAction`, `extraerDatosCasoAction` y `mejorarTextoAction` no comprueban sesión, rol, tamaño de entrada ni tasa de uso. Next.js protege las server actions con comprobaciones de origen, pero **no con autenticación**: el identificador de la acción viaja en el bundle del cliente y puede invocarse directamente. Cualquier visitante puede consumir la cuota de `GOOGLE_AI_API_KEY`, enviar textos o PDFs grandes y provocar costos o denegación de servicio. Además, `generateContentAction` devuelve `error.message` del proveedor al cliente.

**Impacto:** abuso económico y exposición de detalles internos. En una app policial, también permite enviar contenido no autorizado a un servicio externo.

**Recomendación:** verificar el ID token de Firebase en cada acción (Firebase Admin SDK o una Cloud Function), exigir rol activo, limitar longitud/tamaño y MIME, aplicar rate limiting y devolver errores genéricos. Considerar mover la llamada a Gemini a una Cloud Function con App Check.

---

## 5. Hallazgos altos

### A1. Fechas de servicios extraordinarios sin normalizar

**Evidencia:**
- [`src/services/servicioExtraordinarioService.ts:24-31`](src/services/servicioExtraordinarioService.ts#L24-L31)
- [`src/services/servicioExtraordinarioService.ts:60-64`](src/services/servicioExtraordinarioService.ts#L60-L64)
- [`src/components/servicios-extraordinarios/ListaServicios.tsx:25-33`](src/components/servicios-extraordinarios/ListaServicios.tsx#L25-L33)
- [`src/components/servicios-extraordinarios/ListaServicios.tsx:89`](src/components/servicios-extraordinarios/ListaServicios.tsx#L89), [`147`](src/components/servicios-extraordinarios/ListaServicios.tsx#L147)

Se guardan `fechaApertura` y `fechaCierre` como `Timestamp`, pero al leer el documento supervisor no se convierten: `getServicioById` hace spread de `data.serviciosExtraordinarios` sin normalizar. `ListaServicios.formatFecha` recibe ese valor y lo pasa a `Intl.DateTimeFormat.format`, que espera un `Date`. Con el comportamiento estándar de Firestore (Timestamp), el formateador no recibe una fecha válida y produce `RangeError: Invalid time value` (o una fecha inválida según el motor), rompiendo la pestaña de servicios extraordinarios.

**Impacto:** la pestaña puede quedar inutilizable en cuanto exista un servicio extraordinario. Es necesario reproducirlo con un documento real, pero el defecto de normalización es claro.

**Recomendación:** normalizar cada elemento de `serviciosExtraordinarios` al leer (`fechaApertura`/`fechaCierre` a `Date`) o usar un helper `toDateSafe` como el de `jefeOperativoService`. Añadir un tipo de lectura separado del tipo de escritura.

---

### A2. Las reglas no protegen la integridad del cierre

**Evidencia:** [`firestore.rules:71-75`](firestore.rules#L71-L75), [`firestore.rules:92-95`](firestore.rules#L92-L95), [`firestore.rules:108-109`](firestore.rules#L108-L109), [`firestore.rules:117-118`](firestore.rules#L117-L118)

Las actualizaciones solo validan que no cambien `uid`, `createdAt` y `apertura`. No validan:

- que `estado` solo pase de `abierto` a `cerrado` y no al revés;
- que `cierre` sea inmutable una vez cerrado;
- que `expiresAt` no se altere;
- que `cierre.fechaHora`/`fechaCierre` sean coherentes.

Un supervisor con acceso al SDK puede reabrir su servicio, sobrescribir el informe o extender la retención. La UI no lo hace, pero las reglas son la frontera de seguridad.

**Impacto:** un registro oficial puede modificarse después del cierre sin dejar rastro. Es un riesgo de integridad y de auditoría.

**Recomendación:** validar transiciones y campos inmutables en las reglas; añadir `updatedAt`, `updatedBy`, `closedAt` y un registro de auditoría. Para operaciones sensibles (borrar, reabrir, corregir), usar Cloud Functions con Admin SDK y trazabilidad.

---

### A3. Gestión de usuarios incompleta

**Evidencia:** [`src/components/admin/AdminDashboard.tsx:126-228`](src/components/admin/AdminDashboard.tsx#L126-L228), [`src/services/userService.ts:72-111`](src/services/userService.ts#L72-L111), [`firestore.rules:101`](firestore.rules#L101)

El panel solo lista y crea supervisores. No permite:

- desactivar (`isActive: false`) aunque las reglas ya lo usan;
- editar grado, nombre, celular o correo;
- restablecer contraseña o forzar cambio;
- eliminar la cuenta de Authentication junto con el perfil.

Si se borra el documento `users/{uid}` desde la consola, la cuenta de Auth sigue activa y puede iniciar sesión, aunque las reglas le negarán los datos. No hay `sendPasswordResetEmail` ni `updatePassword` en el código.

**Impacto:** un supervisor que deja el servicio no puede ser desactivado desde la app; la gestión depende de la consola. Además, las contraseñas iniciales no se pueden cambiar por el usuario.

**Recomendación:** añadir acciones de desactivar/activar, editar perfil, restablecer contraseña y eliminar cuenta (Admin SDK/Cloud Function). Bloquear el acceso si `isActive` es falso y mostrar un mensaje claro.

---

### A4. Se pueden abrir varios servicios activos

**Evidencia:** [`src/services/servicioSupervisorService.ts:41-78`](src/services/servicioSupervisorService.ts#L41-L78), [`src/services/servicioSupervisorService.ts:83-95`](src/services/servicioSupervisorService.ts#L83-L95), [`src/app/page.tsx:173-204`](src/app/page.tsx#L173-L204)

`abrirServicioSupervisor` no comprueba si ya existe un servicio abierto para el UID. `getServicioActivo` toma el más reciente (`snapshot.docs[0]`), de modo que los demás quedan inaccesibles desde el panel y solo se pueden encontrar en Firestore. Lo mismo ocurre con Jefe Operativo.

**Impacto:** duplicidad de turnos, datos repartidos en varios documentos y reportes incompletos.

**Recomendación:** comprobar y crear en una transacción, o mantener un documento de “servicio activo” por usuario. Si se detecta más de uno, ofrecer una pantalla de resolución.

---

### A5. Retención inconsistente y servicios abiertos sin limpieza

**Evidencia:** [`src/services/servicioSupervisorService.ts:51-53`](src/services/servicioSupervisorService.ts#L51-L53), [`src/services/servicioSupervisorService.ts:179-197`](src/services/servicioSupervisorService.ts#L179-L197), [`src/services/jefeOperativoService.ts:176-190`](src/services/jefeOperativoService.ts#L176-L190), [`src/components/admin/AdminDashboard.tsx:387`](src/components/admin/AdminDashboard.tsx#L387)

- El supervisor calcula `expiresAt = fechaHora + 7 días` al abrir y **no lo actualiza al cerrar**.
- El Jefe Operativo calcula `expiresAt = cierre + 9 días`.
- El botón del admin dice “Limpiar vencidos (9 días)”, pero para supervisores el borrado ocurre a los 7 días desde la apertura (o antes, si la fecha ingresada es retroactiva).
- La limpieza solo borra `estado == 'cerrado'`; un servicio abierto olvidado nunca se limpia.

**Impacto:** pérdida de historial antes de lo esperado, o acumulación indefinida de servicios abiertos. La etiqueta de la UI no coincide con la regla real.

**Recomendación:** unificar la retención (por ejemplo, 9 días desde el cierre) y actualizar `expiresAt` al cerrar. Añadir una alerta/cierre automático para servicios abiertos con más de X horas.

---

### A6. Los totales del cierre no se derivan de los registros

**Evidencia:** [`src/components/supervisor/CierreTurnoModal.tsx:20-27`](src/components/supervisor/CierreTurnoModal.tsx#L20-L27), [`src/app/servicio/[id]/page.tsx:75-85`](src/app/servicio/%5Bid%5D/page.tsx#L75-L85), [`src/utils/reporteSupervisor.ts:169-204`](src/utils/reporteSupervisor.ts#L169-L204)

El supervisor escribe a mano `casosRutinarios` y `casosRelevantes`. No se calculan a partir de `controlInstalaciones` ni se validan contra los casos registrados. El informe final y la vista de reporte usan esos números.

**Impacto:** el informe puede contradecir los registros de unidades. Para un documento oficial, la inconsistencia es difícil de detectar y de defender.

**Recomendación:** calcular los totales desde los registros (con opción de ajuste justificado) o mostrar una comparación y bloquear el cierre si no coinciden.

---

### A7. Eliminación física sin auditoría

**Evidencia:** [`src/components/admin/AdminDashboard.tsx:330-349`](src/components/admin/AdminDashboard.tsx#L330-L349), [`src/components/admin/AdminDashboard.tsx:420-436`](src/components/admin/AdminDashboard.tsx#L420-L436), [`firestore.rules:110`](firestore.rules#L110)

El admin puede borrar permanentemente un servicio cerrado con un clic y un modal de confirmación. No hay borrado lógico, papelera, motivo ni registro de quién eliminó qué.

**Impacto:** pérdida irreversible de registros operativos; no hay trazabilidad para una auditoría interna o judicial.

**Recomendación:** implementar archivado/borrado lógico (`deletedAt`, `deletedBy`, `reason`) y conservar el documento. Reservar el borrado físico para una tarea administrativa auditada.

---

### A8. `flows.ts` puede tumbar el build si falta la API key

**Evidencia:** [`src/ai/flows.ts:4-9`](src/ai/flows.ts#L4-L9)

El módulo lanza una excepción en el ámbito superior si `GOOGLE_AI_API_KEY` no está definida. Aunque la app sea principalmente cliente, las server actions y los componentes que las importan pueden provocar la evaluación del módulo durante el build o el arranque del servidor. En un CI sin la variable, el build puede fallar con un error de configuración en lugar de degradar la función de IA.

**Impacto:** despliegues frágiles; la app completa depende de una variable opcional para compilar.

**Recomendación:** inicializar Genkit de forma perezosa dentro de la acción y devolver un error controlado si falta la clave; no lanzar al importar.

---

## 6. Hallazgos medios

### M1. La IA de imágenes y el auto-completar de cierre están incompletos

**Evidencia:** [`src/services/aiExtractionService.ts:178-182`](src/services/aiExtractionService.ts#L178-L182), [`src/components/servicios-extraordinarios/CierreForm.tsx:113-145`](src/components/servicios-extraordinarios/CierreForm.tsx#L113-L145)

- La pestaña “Foto / Imagen” está visible y permite seleccionar un archivo, pero `extractFromImage` siempre lanza “próximamente”.
- En el cierre, `handleAIExtraction` busca `data.casosRelevantes` o `data.casos`, pero `extractFromText` solo devuelve `Partial<AperturaServicioExtra>`; esos campos nunca llegan. El botón “Auto-completar Novedades con IA” no extrae casos ni observaciones.

**Recomendación:** ocultar/deshabilitar la pestaña de imagen hasta implementarla y ampliar el contrato de extracción para devolver casos de cierre; o retirar el botón del cierre.

### M2. “Ver Detalle” de servicios extraordinarios no muestra detalle

**Evidencia:** [`src/app/servicio/[id]/page.tsx:406-412`](src/app/servicio/%5Bid%5D/page.tsx#L406-L412), [`src/components/servicios-extraordinarios/ListaServicios.tsx:94-99`](src/components/servicios-extraordinarios/ListaServicios.tsx#L94-L99)

`onVerDetalle` solo publica un aviso “Detalle solicitado para: {id}”. No hay vista de detalle del servicio extraordinario ni de su cierre.

**Recomendación:** implementar un modal/vista de detalle o eliminar el botón para no prometer una función inexistente.

### M3. El admin no ve ni gestiona servicios de Jefe Operativo

**Evidencia:** [`src/components/admin/AdminDashboard.tsx:307-451`](src/components/admin/AdminDashboard.tsx#L307-L451)

“Servicios Globales” usa `getAllServiciosAdmin` (colección `servicios_supervisor`) y renderiza solo ese tipo. Los servicios de `servicios_jefe_operativo` solo aparecen en `/historial` y no se pueden eliminar desde el panel. El texto de la tarjeta promete “todos los servicios cerrados y en curso”.

**Recomendación:** unificar ambos tipos en la pestaña, con filtro y acciones coherentes; o renombrar la sección para reflejar su alcance real.

### M4. Historial sin paginación, sin errores y sin responsable

**Evidencia:** [`src/app/historial/page.tsx:55-94`](src/app/historial/page.tsx#L55-L94)

El historial carga **todos** los servicios (admin) o todos los del usuario, sin `limit` ni paginación, y filtra en cliente. El `try` no tiene `catch`: si una consulta falla, la promesa se rechaza y la lista queda vacía sin mensaje. Tampoco muestra el supervisor/jefe responsable ni permite filtrar por él.

**Recomendación:** paginar por cursor, añadir `catch` con alerta, incluir responsable y filtros por usuario/estado. Para auditoría, exportar también casos y unidades.

### M5. Usuario sin perfil o inactivo queda en una UI vacía

**Evidencia:** [`src/context/AuthContext.tsx:36-52`](src/context/AuthContext.tsx#L36-L52), [`src/app/page.tsx:59-63`](src/app/page.tsx#L59-L63)

Si el usuario existe en Auth pero no tiene documento `users` (o está inactivo), `userProfile` queda `null`; `isAdmin` e `isSupervisor` son falsos. La Home muestra la UI de supervisor, intenta cargar servicios y las reglas responden `permission-denied`; no hay redirección ni mensaje. El usuario no entiende por qué no puede operar.

**Recomendación:** si hay sesión pero no hay perfil activo, mostrar una pantalla de “usuario no autorizado” con opción de cerrar sesión; no renderizar el panel operativo.

### M6. Doble envío y cierres no idempotentes

**Evidencia:** [`src/components/supervisor/FormularioUnidad.tsx:170-195`](src/components/supervisor/FormularioUnidad.tsx#L170-L195), [`src/components/supervisor/FormularioUnidad.tsx:422-428`](src/components/supervisor/FormularioUnidad.tsx#L422-L428), [`src/components/supervisor/CierreTurnoModal.tsx:20-27`](src/components/supervisor/CierreTurnoModal.tsx#L20-L27), [`src/services/servicioSupervisorService.ts:179-197`](src/services/servicioSupervisorService.ts#L179-L197)

`FormularioUnidad.handleSave` no es `async`, no espera `onSave` y no deshabilita el botón; un doble clic puede agregar dos registros. `CierreTurnoModal` no tiene estado de carga. `cerrarServicioSupervisor` no verifica que el servicio siga abierto ni usa transacción: dos cierres sobrescriben el informe.

**Recomendación:** estado `isSubmitting` en todos los formularios, transacción con verificación de estado y claves de idempotencia.

### M7. Resumen de turno cuenta duplicados y puede romperse con datos antiguos

**Evidencia:** [`src/components/supervisor/ResumenTurno.tsx:45-51`](src/components/supervisor/ResumenTurno.tsx#L45-L51), [`src/components/supervisor/UnidadesControl.tsx:107-119`](src/components/supervisor/UnidadesControl.tsx#L107-L119), [`src/components/supervisor/UnidadesControl.tsx:229`](src/components/supervisor/UnidadesControl.tsx#L229), [`src/components/supervisor/UnidadesControl.tsx:301-305`](src/components/supervisor/UnidadesControl.tsx#L301-L305)

`unidadesSupervisadas = registros.length` cuenta registros, no unidades únicas; se puede registrar la misma unidad varias veces y el progreso se distorsiona. Además, `r.personal.detalles...` no usa optional chaining: un registro antiguo o incompleto puede lanzar y romper el resumen.

**Recomendación:** contar por `unidad` única, impedir duplicados (o permitir edición) y normalizar los registros antes de calcular.

### M8. Fecha de apertura del Jefe Operativo no editable

**Evidencia:** [`src/components/servicios-extraordinarios/AperturaForm.tsx:256`](src/components/servicios-extraordinarios/AperturaForm.tsx#L256)

`fechaApertura: new Date()` usa el reloj del dispositivo. No hay campo para indicar la fecha/hora real del servicio. Si el plan se carga al día siguiente, el reporte muestra la fecha de carga, no la del operativo. El supervisor sí puede elegir fecha/hora; el Jefe Operativo no.

**Recomendación:** añadir un campo `datetime-local` con valor por defecto actual y validar que no sea futuro/pasado según la regla de negocio.

### M9. Sin validación de tamaño/MIME y errores técnicos al cliente

**Evidencia:** [`src/components/servicios-extraordinarios/AIExtractionModal.tsx:79-85`](src/components/servicios-extraordinarios/AIExtractionModal.tsx#L79-L85), [`src/components/servicios-extraordinarios/AIExtractionModal.tsx:164-195`](src/components/servicios-extraordinarios/AIExtractionModal.tsx#L164-L195), [`src/app/actions/ai.ts:9-12`](src/app/actions/ai.ts#L9-L12)

El selector acepta `.pdf`/`image/*` sin comprobar tamaño ni MIME real; el archivo se convierte a base64 en memoria y se envía a la server action. El texto “máx 10MB” solo aparece en la pestaña de imagen, no se aplica. Los errores del proveedor se devuelven con `error.message`.

**Recomendación:** validar tamaño (por ejemplo, 10 MB), tipo MIME y extensión; rechazar antes de leer; devolver un mensaje genérico y registrar el detalle solo en servidor.

### M10. `next-env.d.ts` depende de `.next` generado

**Evidencia:** [`next-env.d.ts:3`](next-env.d.ts#L3)

El archivo importa `./.next/types/routes.d.ts`. En un clon limpio, `npm run typecheck` antes de `next build` puede fallar porque ese archivo no existe. Next lo regenera al compilar/dev, pero el script de typecheck no lo hace.

**Recomendación:** ejecutar `next typegen` antes de `tsc` en CI o documentar el orden `build → typecheck`. No editar `next-env.d.ts` a mano.

### M11. Configuración de Firebase Hosting a revisar

**Evidencia:** [`firebase.json:5-11`](firebase.json#L5-L11)

La configuración combina `"source": "."`, `"public": "public"` y `"frameworksBackend": {}`. Para Next.js con Firebase Frameworks, la configuración recomendada suele usar `source` y `frameworksBackend` (con región), sin `public`. Tener ambos puede hacer que el despliegue sirva la carpeta estática en lugar de la app o falle según la versión de Firebase CLI. No se desplegó, así que no está confirmado.

**Recomendación:** validar con `firebase deploy --only hosting --dry-run` en un proyecto de prueba y seguir la guía oficial de Firebase para Next.js.

### M12. Sin tests automatizados ni CI

**Evidencia:** [`package.json:5-15`](package.json#L5-L15), [`verify-firestore-rules.mjs:95-167`](verify-firestore-rules.mjs#L95-L167)

Solo existe un script manual de reglas. No cubre:
- bootstrap del primer admin;
- creación/actualización de usuarios;
- inmutabilidad de `apertura` en Jefe Operativo;
- transiciones de estado y protección de `cierre`;
- ningún flujo de UI.

No hay `test` en `package.json`, ni pipeline de CI.

**Recomendación:** añadir pruebas de reglas para los casos anteriores y E2E de los flujos críticos (apertura, registro, cierre, reporte). Ejecutar lint/typecheck/build en CI.

### M13. `.ai` desactualizado y contradictorio

**Evidencia:** [`.ai/memory.md:8-18`](.ai/memory.md#L8-L18), [`.ai/context.md:11-12`](.ai/context.md#L11-L12)

La memoria dice “Next.js 15 / React 19”, `src/lib/firestore.ts` y `src/app/api/*`, que no existen en el estado actual (Next 16.1.1, React 18.3.1, servicios en `src/services`). También dice “No hay reglas Firestore configuradas en firebase.json”, cuando ya existen. Un agente o desarrollador que confíe en esa memoria tomará decisiones equivocadas.

**Recomendación:** actualizar `.ai` o eliminarlo; si se mantiene, validar sus afirmaciones contra el código en cada sesión.

### M14. Dependencias sin uso y ESLint permisivo

**Evidencia:** [`package.json:17-58`](package.json#L17-L58), [`eslint.config.mjs:9-15`](eslint.config.mjs#L9-L15)

No se encontraron importaciones de `recharts`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, `embla-carousel-react`, los paquetes Radix, `class-variance-authority`, `clsx`, `tailwind-merge`, `dotenv` ni `@genkit-ai/next`. ESLint desactiva `no-explicit-any`, `prefer-const`, `no-require-imports` y `set-state-in-effect`; el código abusa de `any` en los servicios (`controlInstalaciones: any[]`, `serviciosExtraordinarios: any[]`, varios `catch (e: any)`).

**Recomendación:** eliminar dependencias no usadas y reactivar reglas gradualmente, empezando por `no-explicit-any` en servicios y tipos.

---

## 7. Hallazgos bajos e higiene

| ID | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|
| B1 | La ruta `/servicio` es legacy: usa `ServiciosExtra` y `OperativosMOP`, que solo hacen `console.log`/estado local y no persisten; el “Asistente IA” está hardcodeado (“Todo tranquilo por ahora”). No está enlazada desde el panel actual, pero es accesible. | [`src/app/servicio/page.tsx:130-145`](src/app/servicio/page.tsx#L130-L145), [`src/components/supervisor/ServiciosExtra.tsx:62-66`](src/components/supervisor/ServiciosExtra.tsx#L62-L66) | Eliminar la ruta y los componentes legacy, o conectarlos a Firestore. |
| B2 | La contraseña inicial se muestra en texto claro y no hay política de complejidad ni cambio obligatorio. | [`src/components/admin/AdminDashboard.tsx:290-291`](src/components/admin/AdminDashboard.tsx#L290-L291) | Usar `type="password"` con opción de revelar, generar contraseñas temporales y forzar cambio. |
| B3 | No hay App Check, 2FA, cabeceras de seguridad (CSP/HSTS) ni restricción de dominio de correo. | `firebase.ts`, `next.config.ts` | Evaluar App Check y cabeceras en Hosting; documentar el modelo de amenazas. |
| B4 | No hay `error.tsx`, `not-found.tsx` ni `loading.tsx`; los errores se manejan con `console.error` y listas vacías. | `src/app/` | Añadir límites de error y estados de carga/empty consistentes. |
| B5 | Logs y artefactos sin ignorar: `dev*.log`, `temp_dev_output.txt`, `tsconfig.tsbuildinfo`, `pglite-debug.log`; la auditoría creó `.acl-audit`. | raíz del repo | Añadir a `.gitignore`; conservar `.acl-audit` solo hasta validar el build y luego eliminarlo. |
| B6 | Metadata “Novedades Policiales” y UI “App Supervisor”; no hay manifest/PWA. | [`src/app/layout.tsx:12-15`](src/app/layout.tsx#L12-L15) | Unificar marca y valorar PWA para uso en campo. |

---

## 8. Plan de acción sugerido

### Semana 1 — integridad del registro
1. Corregir C1 (preservar `cierre` completo) y añadir una prueba de lectura de un servicio cerrado.
2. Corregir C2 (cargar unidades por ID) y verificar la vista de admin.
3. Corregir C4 (`personalFormo`) y C5 (informe del supervisor).
4. Resolver C3: eliminar el bootstrap del cliente o implementarlo con Admin SDK; documentar el alta inicial.
5. Normalizar fechas de servicios extraordinarios (A1) y añadir una prueba con un documento real.

### Semana 2 — seguridad e integridad
6. Autenticar y limitar las server actions de IA (C6); validar tamaño/MIME (M9).
7. Endurecer reglas: transiciones de estado, inmutabilidad de `cierre`, `expiresAt` (A2).
8. Añadir desactivar/editar/resetear usuarios (A3) y bloquear usuarios sin perfil (M5).
9. Evitar servicios abiertos duplicados (A4) y unificar retención (A5).
10. Calcular/validar totales de cierre (A6) y sustituir el borrado físico por archivado (A7).

### Después — producto y mantenibilidad
11. Historial paginado, con errores visibles, responsable y filtros (M4).
12. Completar o retirar funciones de IA y “Ver Detalle” (M1, M2).
13. Unificar servicios de supervisor y Jefe Operativo en el panel admin (M3).
14. Tests de reglas + E2E + CI (M12); limpiar `.ai` y dependencias (M13, M14).
15. Revisar despliegue de Hosting (M11) y higiene del repo (B5).

---

## 9. Anexo: verificación técnica y permisos

### Comandos ejecutados

```text
npm run lint       → OK, sin salida
npm run typecheck  → OK, sin salida
npm run build      → OK, Next.js 16.1.1
```

Rutas generadas: `/`, `/historial`, `/login`, `/servicio`, `/servicio/[id]`, `/jefe-operativo/[id]`, `/icon.svg`, `/_not-found`.

### Incidencia de permisos

El primer `npm run build` falló con:

```text
EPERM: operation not permitted, open '...\.next\trace'
```

No era un error del código: el sandbox no podía escribir en `.next`. Se ejecutó el diagnóstico de permisos de Windows sobre `.next`; se añadió una entrada de control total para el usuario actual y se verificó. El build se completó después con acceso ampliado.

- Backups y reporte: `.acl-audit/`
- Rollback: el script indicado en `.acl-audit/acl-backup-*.json.ps1` (ver el reporte para el comando exacto).
- No se modificó ningún archivo rastreado por Git (`git diff` vacío).

### Limitaciones

- No se ejecutó la app contra un proyecto Firebase real; los defectos de fechas y de lectura de cierre se dedujeron del código y deben reproducirse con datos reales.
- No se verificó el estado desplegado de reglas, índices, Functions ni Hosting.
- No se hizo análisis de dependencias (`npm audit`) ni pruebas de penetración.
- No se evaluó el rendimiento con volúmenes reales de documentos.
