# Guía Arquitectónica: Integración Moodle con React y PostgreSQL

Este documento detalla la estrategia de integración ("Opción 1: Moodle como Servidor de Autenticación") para conectar el frontend actual (React + Vite + TanStack Router) y el backend (Node.js/Express + Prisma + PostgreSQL) con una instalación existente de Moodle.

## Principio Principal
El objetivo es **mantener la velocidad, diseño y fluidez del sistema actual**, utilizando a Moodle únicamente como la "fuente de la verdad" para validación de usuarios e inscripciones, pero leyendo toda la información operativa desde la base de datos local de PostgreSQL.

---

### 1. Modificación del Login en el Backend (`authController.ts`)
Actualmente la validación ocurre localmente usando bcrypt. Con Moodle, el flujo será:

1. **Recibir Credenciales:** El backend recibe el `username` (o correo) y la `password` desde React.
2. **Consultar a Moodle:** Desde el backend de Node, se hace un `fetch` a los Web Services de Moodle (ej. `https://moodle.institucion.edu/login/token.php`).
3. **Verificación:** Si Moodle responde con un error, se devuelve `401 Unauthorized`. Si responde con un Token, **el login es válido**.
4. **Sincronización "Just-In-Time" (JIT):** 
   - Se busca el usuario en Postgres (`prisma.user.findUnique`). 
   - Si no existe, se hace un `prisma.user.create()` para registrarlo localmente usando los datos de Moodle, asignando una contraseña hash aleatoria.
5. **Generar JWT Local:** Se genera el Token JWT habitual del backend y se envía a React. El frontend (`AuthContext.tsx`) no nota ningún cambio.

---

### 2. Ajustes en la Base de Datos (`schema.prisma`)
Se agregarán campos de referencia a los modelos actuales para vincularlos con Moodle:

```prisma
model User {
  id           String       @id @default(uuid())
  moodleId     Int?         @unique // Para enlazar con Moodle
  username     String       @unique
  // ... resto de campos (email, role, etc)
}

model Course {
  id           String       @id
  moodleId     Int?         @unique // Para sincronizar cursos
  title        String
  // ... resto de campos visuales (color, iconos, etc)
}
```

---

### 3. Sincronización del Catálogo de Cursos (`courseController.ts`)
Como Moodle no maneja elementos de diseño (colores hex, iconos de Lucide), los cursos se clonarán a Postgres:

1. Se crea un proceso (cron job o botón en panel de Admin) que llame a la API de Moodle (`core_course_get_courses`).
2. Se procesa el JSON recibido.
3. Se hace un `prisma.course.upsert()`:
   - Si el curso (por `moodleId`) existe, se actualizan los datos base.
   - Si es nuevo, se crea en Postgres con colores por defecto.
4. Los administradores pueden luego editar visualmente (colores, iconos) estos cursos directamente desde el panel de React.

---

### 4. Mostrar los Cursos del Usuario (`perfil.tsx`)
Para la pestaña "Mis Cursos":

1. Tras iniciar sesión (o al refrescar), el backend hace una petición a la API de Moodle (`core_enrol_get_users_courses`).
2. Se recibe la lista de IDs de cursos en los que el alumno está inscrito.
3. El backend actualiza la tabla `Enrollment` en Postgres (`prisma.enrollment.create`/`delete`) para que sea un espejo de Moodle.
4. Cuando React pide los cursos a `/api/courses/my-courses`, el backend lee de Postgres, asegurando una carga casi instantánea.

---

## Ventajas de esta Arquitectura
- **Velocidad Extrema:** La lectura directa desde Postgres permite que las animaciones de Framer Motion y TanStack Router mantengan su fluidez sin esperar las típicas latencias de Moodle.
- **Personalización Visual:** Al mantener la base de datos local como proxy, conservamos el soporte para propiedades CSS, colores e iconos que Moodle no puede almacenar de forma nativa.
- **Cero Riesgos:** La integración actúa en modo de "solo lectura" y validación (API externa), sin alterar ni comprometer la instalación ni base de datos original de Moodle.

---

> [!CAUTION]
> ## Requisitos de Acceso a Moodle (¡CRÍTICO!)
> **NO necesitas acceso directo al servidor ni a su base de datos.** Nunca intentes enlazar tablas directamente.
> 
> Todo se gestiona de manera externa y segura vía HTTP/HTTPS. Lo **ÚNICO** que necesitas pedirle al administrador del servidor Moodle es:
> 
> 1. Que **habilite los "Web Services"** en su panel de administración.
> 2. Que **habilite el protocolo REST**.
> 3. Que te genere y entregue un **"Token de acceso"** con permisos de Web Services para leer cursos y validar usuarios.
> 
> Tu backend en Node.js simplemente enviará mensajes a la URL pública de su Moodle utilizando este Token. Ambos sistemas pueden estar en servidores o países distintos y funcionarán perfectamente.
