import { ServicioSupervisor } from '@/services/servicioSupervisorService';

export function generarInformeTexto(
    servicio: ServicioSupervisor,
    datosCierre: { entregaServicio: string; casosRutinarios: number; casosRelevantes: number }
): string {
    const fechaInicio = servicio.apertura.fechaHora;
    // const fechaCierre = servicio.cierre?.fechaHora || new Date(); 

    // Formatter helpers
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    };

    const getGradoNombre = (info: { grado: string; nombreCompleto: string }) => `${info.grado} ${info.nombreCompleto}`;

    // --- SECCIÓN I: UNIDADES SUPERVISADAS ---
    // Objetivo: Listar unidades. Si hay novedades, detallarlas.
    // Estructura pedida:
    // [Unidades supervisadas durante el servicio Ejemplo: 1. FELCC CENTRAL 2. POFOMA 3. RECINTO PENITENCIARIO DE SAN ROQUE.]
    // [Referir si se encuentran con novedad o sin novedad del “personal” ejemplo: 1. Faltaron al servicio - Sgto. David Mamani...]
    // [Referir “ con novedad” o “sin Novedad” de “casos de relevancia”...]

    const unidades = servicio.controlInstalaciones || [];

    // 1. Lista General de Unidades Supervisadas
    const listaNombresUnidades = unitsToList(unidades);

    // 2. Detalle de Novedades por Unidad (Solo si existen)
    let detalleNovedadesUnidades = '';

    // Filtrar unidades con novedad real (Personal o Casos Relevantes)
    // Nota: "Sin Novedad" general se omite en el detalle, solo se listan las novedades.
    // Si el usuario quiere EXPLICITAMENTE "Sin Novedad" para cada unidad, el prompt dice:
    // "Referir si se encuentran con novedad o sin novedad del personal... referir con novedad o sin novedad de casos..."
    // Pero el ejemplo muestra SOLO las novedades: "1. Faltaron... 2. Abandonaron..."
    // Interpretación Magistral:
    // Listar TODAS las unidades supervisadas en un párrafo.
    // Luego, en párrafos aparte, listar SOLO las novedades encontradas. Si no hay, poner "Sin novedades de relevancia ni personal."

    const unidadesConNovedadPersonal = unidades.filter(u => u.personal?.estado === 'con');
    const unidadesConCasos = unidades.filter(u => u.servicio?.relevantes && u.servicio.relevantes.length > 0);
    const unidadesConPenal = unidades.filter(u => u.poblacionPenal); // Penal tiene su propia sección, pero puede tener novedades de personal.

    let textoNovedadesPersonal = '';
    if (unidadesConNovedadPersonal.length > 0) {
        textoNovedadesPersonal += 'Novedades del Personal:\n';
        unidadesConNovedadPersonal.forEach((u, i) => {
            const d = u.personal.detalles;
            const partes = [];
            if (d.faltantes && d.faltantes.length > 0) partes.push(`Faltaron al servicio: ${d.faltantes.join(', ')}`);
            if (d.abandono && d.abandono.length > 0) partes.push(`Abandonaron el servicio: ${d.abandono.join(', ')}`);
            if (d.arrestados && d.arrestados.length > 0) partes.push(`Cumplió Arresto: ${d.arrestados.join(', ')}`);
            if (d.permisos && d.permisos.length > 0) partes.push(`Con Permiso: ${d.permisos.join(', ')}`);

            if (partes.length > 0) {
                textoNovedadesPersonal += `   - ${u.unidad}: ${partes.join('. ')}.\n`;
            }
        });
    } else {
        textoNovedadesPersonal = '   - Personal: Sin novedad.\n';
    }

    let textoNovedadesCasos = '';
    if (unidadesConCasos.length > 0) {
        textoNovedadesCasos += 'Casos de Relevancia Atendidos:\n';
        unidadesConCasos.forEach(u => {
            u.servicio.relevantes.forEach((c: any) => {
                textoNovedadesCasos += `   - ${u.unidad}: ${c.tipo} a hrs ${c.hora}. ${c.detalle} (Encargado: ${c.encargado}).\n`;
            });
        });
    } else {
        textoNovedadesCasos = '   - Casos de Relevancia: Sin novedad.\n';
    }

    // --- SECCIÓN II: SERVICIOS EXTRAORDINARIOS ---
    let textoServiciosExtra = '';
    if (servicio.serviciosExtraordinarios && servicio.serviciosExtraordinarios.length > 0) {
        servicio.serviciosExtraordinarios.forEach((s: any, index) => {
            const plan = s.apertura.numPlan || 'S/N';
            const jefe = s.apertura.jefeOperativo
                ? `${s.apertura.jefeOperativo.grado} ${s.apertura.jefeOperativo.nombreCompleto}`
                : 'Sin Jefe Operativo';

            // Novedades
            let novedades = 'Sin novedad de importancia';
            // Buscamos novedades especificas
            /*
             [referir novedades del personal atrasados, faltantes y novedades del uso de uniforme]
             El objeto CierreServicioExtra podría tener novedadesPersonal.
            */
            if (s.cierre?.novedadesPersonal?.tipo !== 'sin_novedad' && s.cierre?.novedadesPersonal?.descripcion) {
                novedades = s.cierre.novedadesPersonal.descripcion;
            }
            // Tambien resultados
            if (s.cierre?.novedadesResultados) {
                novedades += `. Resultados: ${s.cierre.novedadesResultados}`;
            }

            textoServiciosExtra += `${index + 1}. Servicio "${s.apertura.nombreServicio}" (Plan de Op. N° ${plan}), a cargo del ${jefe}. Novedades: ${novedades}.\n`;
        });
    } else {
        textoServiciosExtra = 'Sin servicios extraordinarios registrados.\n';
    }

    // --- SECCIÓN III: RECINTO PENITENCIARIO SAN ROQUE ---
    let textoPenal = '';
    const penal = servicio.controlInstalaciones?.find((u: any) => u.unidad.includes('PENITENCIARIO') || u.unidad.includes('San Roque') || u.unidad.includes('RECINTO'));

    if (penal) {
        // [Grado y Nombre del jefe de seguridad]
        const jefeSeg = penal.jefeSeguridad ? penal.jefeSeguridad : 'No registrado';

        textoPenal += `Jefe de Seguridad: ${jefeSeg}\n`;

        if (penal.poblacionPenal) {
            textoPenal += `Población Penal: ${penal.poblacionPenal.total} privados de libertad.\n`;
            textoPenal += `Arrestos Domiciliarios: ${penal.poblacionPenal.detencionDomiciliaria || 0}.\n`;
        }

        // [Novedades registradas para esa instalación]
        const novPenal = penal.novedadesTexto || penal.descripcionNovedad || 'Sin novedades de relevancia.';
        textoPenal += `Novedades: ${novPenal}\n`;

    } else {
        textoPenal = 'No se registró control en el Recinto Penitenciario.\n';
    }

    // --- SECCIÓN IV: DETALLE DEL PERSONAL (RESUMEN) ---
    /*
    Resumen donde solo deben registrarse los nombres de las novedades del personal separados por 
    a) Faltantes en sus unidades y 
    b) Abandono de servicio 
    */
    const resumenFaltantes: string[] = [];
    const resumenAbandono: string[] = [];

    unidades.forEach((u: any) => {
        if (u.personal?.detalles?.faltantes && u.personal.detalles.faltantes.length > 0) {
            u.personal.detalles.faltantes.forEach((f: string) => resumenFaltantes.push(`${f} (${u.unidad})`));
        }
        if (u.personal?.detalles?.abandono && u.personal.detalles.abandono.length > 0) {
            u.personal.detalles.abandono.forEach((a: string) => resumenAbandono.push(`${a} (${u.unidad})`));
        }
    });

    let textoResumenFaltantes = 'Sin personal faltante.';
    if (resumenFaltantes.length > 0) {
        textoResumenFaltantes = resumenFaltantes.join(', ');
    }

    let textoResumenAbandonos = 'Sin abandono de servicio.';
    if (resumenAbandono.length > 0) {
        textoResumenAbandonos = resumenAbandono.join(', ');
    }

    // --- CONSTRUCCIÓN FINAL DEL INFORME ---
    return `INFORME

AL:	COMANDANTE DEPARTAMENTAL
DEL: 	${getGradoNombre(servicio.apertura.supervisorActual)}
SUPERVISOR GENERAL DE SERVICIOS 
Ref.: 	Informe de novedades del servicio de supervisor general de servicios de la guarnición policial de Chuquisaca de fecha ${formatDate(fechaInicio)}

Señor comandante

Dando cumplimiento a memorándum ${servicio.apertura.nroMemorandum} en fecha ${formatDate(fechaInicio)} a horas ${formatTime(fechaInicio)}, me hice cargo del servicio de supervisor general de servicios de la guarnición policial de Chuquisaca procediendo al relevo con el ${getGradoNombre(servicio.apertura.supervisorRelevo)} con las novedades del turno saliente, durante el servicio se registraron las siguientes novedades:

I. Unidades Supervisadas.
Se realizó el control y supervisión de las siguientes unidades: ${listaNombresUnidades}.

${textoNovedadesPersonal}
${textoNovedadesCasos}

II. Servicios extraordinarios
${textoServiciosExtra}

III. Recinto penitenciario de San Roque
${textoPenal}

IV. Detalle del Personal
Este es un resumen de las novedades del personal:

a) Faltantes en sus unidades
${textoResumenFaltantes}

b) Abandono de servicio
${textoResumenAbandonos}

Con las novedades registradas en el presente informe a horas ${new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} procedí al relevo del servicio con el ${datosCierre.entregaServicio} con ${datosCierre.casosRutinarios} casos registrados de rutina y ${datosCierre.casosRelevantes} de relevancia.

Sucre, ${formatDate(new Date())}
`;
}

// Helper para listar unidades "1. FELCC 2. POFOMA..."
function unitsToList(unidades: any[]): string {
    if (unidades.length === 0) return 'Ninguna unidad registrada';
    return unidades.map((u, i) => `${i + 1}. ${u.unidad}`).join('  ');
}
