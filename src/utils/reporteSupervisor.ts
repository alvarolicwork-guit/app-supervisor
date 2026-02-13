import { ServicioSupervisor } from '@/services/servicioSupervisorService';

export function generarInformeTexto(
    servicio: ServicioSupervisor,
    datosCierre: { entregaServicio: string; casosRutinarios: number; casosRelevantes: number }
): string {
    const fechaInicio = servicio.apertura.fechaHora;
    const fechaCierre = servicio.cierre?.fechaHora || new Date(); // Use current date if not closed yet (preview)

    // Formatter helpers
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    };

    const getGradoNombre = (info: { grado: string; nombreCompleto: string }) => `${info.grado} ${info.nombreCompleto}`;

    // --- 1. UNIDADES ---
    let textoUnidades = '';
    if (servicio.controlInstalaciones && servicio.controlInstalaciones.length > 0) {
        // Filtrar y ordenar si es necesario. Asumimos orden de llegada.
        // El usuario pide: [Unidades registradas sin novedad o con novedad (debe referir el tipo de novedad personal...)]
        // Vamos a listar todas.
        servicio.controlInstalaciones.forEach((u: any, index) => {
            // Excluir Recinto Penitenciario de esta lista general si se pide aparte, 
            // pero el usuario dice "1. Unidades" y luego "3. Recinto Penitenciario". 
            // Asumiré que Recinto Penitenciario NO va en el punto 1.
            if (u.unidad.includes('PENITENCIARIO') || u.unidad.includes('San Roque')) return;

            const novedadTexto = u.novedades
                ? `CON NOVEDAD: ${u.descripcionNovedad}`
                : 'SIN NOVEDAD';

            // Agregar detalles de personal si hay novedad de personal (aunque la descripción ya debería tenerlo, reforzamos)
            let detallePersonal = '';
            if (u.personal?.estado !== 'sin' && u.personal?.detalles) {
                const d = u.personal.detalles;
                const partes = [];
                if (d.faltantes) partes.push(`Faltantes: ${d.faltantes}`);
                if (d.abandono) partes.push(`Abandono: ${d.abandono}`);
                if (d.arrestados) partes.push(`Arrestados: ${d.arrestados}`);
                if (partes.length > 0) detallePersonal = ` (${partes.join(', ')})`;
            }

            textoUnidades += `   ${String.fromCharCode(97 + index)}) ${u.unidad}: ${novedadTexto}${detallePersonal}\n`;
        });
        if (textoUnidades === '') textoUnidades = '   Sin novedades registradas en otras unidades.\n';
    } else {
        textoUnidades = '   Sin unidades registradas.\n';
    }

    // --- 2. SERVICIOS EXTRAORDINARIOS ---
    let textoServiciosExtra = '';
    if (servicio.serviciosExtraordinarios && servicio.serviciosExtraordinarios.length > 0) {
        servicio.serviciosExtraordinarios.forEach((s: any, index) => {
            // [referir la información de los servicios, Numero de plan de operaciones, nombre del jefe operativo y novedades...]
            const jefe = s.apertura.jefeOperativo
                ? `${s.apertura.jefeOperativo.grado} ${s.apertura.jefeOperativo.nombreCompleto}`
                : 'Sin Jefe Operativo';

            // Construir resumen de novedades
            let novedades = 'Sin novedad';
            if (s.cierre) {
                const partes = [];
                if (s.cierre.novedadesResultados) partes.push(`Resultados: ${s.cierre.novedadesResultados}`);
                // Personal
                if (s.cierre.novedadesPersonal && s.cierre.novedadesPersonal.tipo !== 'sin_novedad') {
                    partes.push(`Personal: ${s.cierre.novedadesPersonal.descripcion}`);
                }
                if (partes.length > 0) novedades = partes.join('. ');
            }

            textoServiciosExtra += `   ${String.fromCharCode(97 + index)}) ${s.apertura.nombreServicio} (Plan: ${s.apertura.numPlan || 'S/N'}). Jefe Op: ${jefe}. Novedades: ${novedades}.\n`;
        });
    } else {
        textoServiciosExtra = '   Sin servicios extraordinarios registrados.\n';
    }

    // --- 3. RECINTO PENITENCIARIO ---
    // Buscar registro de penitenciario
    const penal = servicio.controlInstalaciones?.find((u: any) => u.unidad.includes('PENITENCIARIO') || u.unidad.includes('San Roque'));
    let textoPenal = '';
    if (penal) {
        textoPenal += `   Responsable: ${penal.jefeSeguridad || 'No registrado'}\n`;
        if (penal.poblacionPenal) {
            textoPenal += `   Población Penal Total: ${penal.poblacionPenal.total} (Varones: ${penal.poblacionPenal.varones}, Mujeres: ${penal.poblacionPenal.mujeres})\n`;
            textoPenal += `   Arrestos Domiciliarios: ${penal.poblacionPenal.detencionDomiciliaria || 0}\n`;
        }
        textoPenal += `   Novedades: ${penal.novedades ? penal.descripcionNovedad : 'Sin novedad'}\n`;
        // Agregar novedades texto extra si existe (el campo que agregamos en ResumenTurno si es que lo usan)
        if (penal.novedadesTexto) textoPenal += `   Otras Novedades: ${penal.novedadesTexto}\n`;
    } else {
        textoPenal = '   No se registró control en el Recinto Penitenciario de San Roque.\n';
    }

    // --- 4. DETALLE DEL PERSONAL ---
    // Recopilar de TODOS los registros
    const faltantes: string[] = [];
    const abandonos: string[] = [];

    servicio.controlInstalaciones?.forEach((u: any) => {
        if (u.personal?.detalles?.faltantes) faltantes.push(`${u.unidad}: ${u.personal.detalles.faltantes}`);
        if (u.personal?.detalles?.abandono) abandonos.push(`${u.unidad}: ${u.personal.detalles.abandono}`);
    });

    // También servicios extraordinarios tienen personal?
    servicio.serviciosExtraordinarios?.forEach((s: any) => {
        // La estructura de cierre de servicio extraordinario puede variar, intentamos extraer si existe
        if (s.cierre?.novedadesPersonal?.tipo === 'con_novedad' && s.cierre.novedadesPersonal.descripcion) {
            // Es texto libre, difícil categorizar si fue falta o abandono a menos que parseemos. 
            // Lo agregaremos a faltantes por defecto o una lista general si no es claro.
            // Por ahora, solo control instalaciones tiene estructura clara de faltas/abandonos.
        }
    });

    let textoFaltantes = '   Sin personal faltante.';
    if (faltantes.length > 0) textoFaltantes = faltantes.map(f => `   - ${f}`).join('\n');

    let textoAbandonos = '   Sin abandono de servicio.';
    if (abandonos.length > 0) textoAbandonos = abandonos.map(a => `   - ${a}`).join('\n');


    // --- CONSTRUCCIÓN DEL INFORME FINAL ---
    return `INFORME

AL:	COMANDANTE DEPARTAMENTAL
DEL: 	${getGradoNombre(servicio.apertura.supervisorActual)}
SUPERVISOR GENERAL DE SERVICIOS 
Ref.: 	Informe se novedades del servicio de supervisor general de servicios de la guarnición policial de Chuquisaca de fecha ${formatDate(fechaInicio)}

Señor comandante:

Dando cumplimiento a memorándum ${servicio.apertura.nroMemorandum} en fecha ${formatDate(fechaInicio)} a horas ${formatTime(fechaInicio)}, me hice cargo del servicio de supervisor general de servicios de la guarnición policial de Chuquisaca procediendo al relevo con el ${getGradoNombre(servicio.apertura.supervisorRelevo)}, durante el servicio se registraron las siguientes novedades:

1. Unidades
${textoUnidades}
2. Servicios extraordinarios
${textoServiciosExtra}
3. Recinto Penitenciario de San Roque
${textoPenal}
4. Detalle del Personal
a) Faltantes en sus unidades:
${textoFaltantes}
b) Abandono de servicio:
${textoAbandonos}

Con las novedades registradas en el presente informe a horas ${formatTime(new Date())} procedí al relevo del servicio con el ${datosCierre.entregaServicio} con ${datosCierre.casosRutinarios} casos de rutina y ${datosCierre.casosRelevantes} casos de relevancia.

Sucre, ${formatDate(new Date())}
`;
}
