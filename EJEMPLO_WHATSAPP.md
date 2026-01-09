# Ejemplo de Mensaje WhatsApp para Testing AI

Copia y pega este mensaje en la función de "Auto-completar con IA" para probar:

```
PLAN DE OPERACIONES Nº 1576/2025

DATOS GENERALES
Personal Contemplado: 22
Supervisor General: Tcnl. DEAP Alberto Suarez Plata
Jefe Operativo: May. Juan Carlos Pérez López

FORMACIÓN
Lugar de Formación: Multipropósito
Hora de Formación: 14:00
Hora de Instalación: 14:15

NOVEDADES DE FORMACIÓN
Personal Formó: 22
Personal Faltó: 2
- Sgto. Carlos Mamani Quispe
- Cbte. Luis Torres García

Personal con Permiso: 1
- Sgto. 1º María González Fernández

Personal Pasó: 0

Sin Uniforme: 0
No Observó Horario: 0
```

---

## Campos que debería extraer:

✅ **Plan de Operaciones**:
- Nº Plan: 1576/2025
- Personal Contemplado: 22
- Supervisor General: Tcnl. DEAP Alberto Suarez Plata
- Jefe Operativo: May. Juan Carlos Pérez López
- Lugar: Multipropósito
- Hora Formación: 14:00
- Hora Instalación: 14:15

✅ **Novedades**:
- Personal Formó: 22
- Personal Faltó: 2 (con lista de 2 personas)
- Personal Permiso: 1 (con lista de 1 persona)
- Personal Pasó: 0
