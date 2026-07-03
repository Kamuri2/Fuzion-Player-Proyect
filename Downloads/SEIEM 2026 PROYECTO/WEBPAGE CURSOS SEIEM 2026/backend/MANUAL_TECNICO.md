# Manual Técnico para Administradores de TI (SEIEM)

Este documento fue creado para el futuro técnico, ingeniero o administrador de sistemas que se encargue de mantener este servidor. 
El código de este backend (Node.js + Express) fue escrito buscando la máxima simplicidad para que sea fácil de mantener y modificar.

## 1. Estructura Básica del Backend
- **`src/index.ts`**: Es el archivo principal que arranca el servidor. Aquí se conectan todas las rutas.
- **`src/routes/`**: Define las URLs de la API (ej. `/api/auth/login`).
- **`src/controllers/`**: Contiene la lógica real. Si necesitas cambiar cómo se guarda un curso o cómo se lee el disco duro, busca aquí.
- **`src/middlewares/`**: Funciones que se ejecutan "en medio". Por ejemplo, `authMiddleware.ts` verifica que el usuario sea administrador, y `uploadMiddleware.ts` maneja la subida física de archivos.
- **`prisma/schema.prisma`**: Es el mapa de la base de datos. Si necesitas agregar una nueva columna a los Cursos, se hace aquí.

---

## 2. ¿Qué hacer si el Disco Duro se llena? (Cambio de Almacenamiento)

Actualmente, los archivos (videos, PDFs, fotos) subidos por los administradores se guardan en la misma carpeta del proyecto:
`backend/uploads/`

Si el sistema arroja una alerta de que el disco duro se está llenando, y le conectas un **nuevo disco duro** (por ejemplo, el Disco `D:` o `E:` en Windows), debes seguir estos **dos únicos pasos** para que el sistema empiece a guardar los archivos en el disco nuevo:

### Paso A: Cambiar dónde se guardan los archivos
Abre el archivo `src/middlewares/uploadMiddleware.ts` y busca la línea que dice:
`cb(null, 'uploads/');`

Cámbiala por la ruta absoluta de tu nuevo disco duro. Por ejemplo:
`cb(null, 'D:/archivos_seiem/');`
*(Asegúrate de que la carpeta `archivos_seiem` exista previamente en el disco D).*

### Paso B: Cambiar dónde el Monitor lee el espacio restante
Para que la alerta del panel de administrador lea el espacio del nuevo disco duro, abre el archivo `src/controllers/systemController.ts` y busca la línea que dice:
`const uploadsPath = path.join(__dirname, '../../uploads');`

Cámbiala por la ruta de tu nuevo disco. Por ejemplo:
`const uploadsPath = 'D:/archivos_seiem/';`

¡Y listo! Guarda los archivos, reinicia el servidor (`pm2 restart seiem-backend` o `npm run dev`) y el sistema usará el nuevo disco duro automáticamente.

---

## 3. Subida Manual de Evidencias (Bot Escáner)

El sistema cuenta con un "Bot Escáner" automático. Esto significa que los administradores no están obligados a subir las evidencias una por una a través de la página web. 

**¿Cómo funciona?**
1. Puedes abrir la carpeta física del servidor en Windows: `backend/uploads/`
2. Si creas una carpeta ahí cuyo nombre sea exactamente el **ID del Curso** (por ejemplo: `backend/uploads/mi-curso-123/`).
3. Puedes pegar ahí directamente todas las imágenes, PDFs y videos MP4 que correspondan a ese curso.
4. Al recargar la página web, el Frontend automáticamente preguntará al Backend qué archivos físicos existen en esa carpeta.
5. El sistema leerá la carpeta, detectará los nuevos archivos y **los mostrará inmediatamente en la galería del curso** en la página web.

*Nota:* Si un archivo se sube vía la página web, el backend creará esta carpeta por ti automáticamente y guardará el archivo ahí. ¡Puedes combinar ambos métodos sin problemas y sin generar archivos duplicados!

---

## 4. Base de Datos
El proyecto utiliza **Prisma**. Si necesitas revisar los datos manualmente, puedes ejecutar este comando en la carpeta `backend`:
```bash
npx prisma studio
```
Esto abrirá una página web en `localhost:5555` donde podrás ver, editar y borrar registros de la base de datos como si fuera un Excel.

## 4. Notas de Mantenimiento
- **Backups:** Por favor programa una tarea en Windows/Linux que copie el archivo `prisma/prod.db` (o `dev.db`) y la carpeta `uploads/` a la nube (Google Drive/OneDrive) todas las noches.
- El servidor corre en el puerto `3001`. Si cambias esto en el archivo `.env`, asegúrate de actualizar el archivo `.env.production` en el código del Frontend para que sigan comunicándose.
