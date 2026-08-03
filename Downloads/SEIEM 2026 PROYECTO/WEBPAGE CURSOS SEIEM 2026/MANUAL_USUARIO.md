# Manual de Usuario y Técnico: Sistema de Evidencias SEIEM

Este documento explica los cambios recientes en la arquitectura del sistema (Base de Datos PostgreSQL y Docker) y cómo utilizar el nuevo Bot Escáner automático.

## 🛠️ Requisitos del Sistema
- Node.js v18 o superior
- **Docker y Docker Compose** (Para la base de datos PostgreSQL)
- NPM o Yarn

## 📦 Inicialización de la Base de Datos (PostgreSQL)

El sistema utiliza ahora PostgreSQL con Docker. Para arrancar y configurar la base de datos:

1. Abre una terminal en la carpeta `backend/`.
2. Levanta el contenedor de la base de datos:
   ```bash
   docker-compose up -d
   ```
3. Genera las tablas y aplica la migración inicial:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Aplica la semilla para cargar los cursos y talleres iniciales en la base de datos:
   ```bash
   npx prisma db seed
   ```

## 🚀 Cómo Iniciar el Servidor y la Página

**1. Iniciar el Backend:**
```bash
cd backend
npm run dev
```

**2. Iniciar el Frontend:**
Abre otra terminal y ejecuta:
```bash
cd capstone-skills
npm run dev
```

## 🤖 Bot Escáner Automático de Evidencias

El nuevo sistema incluye un bot en el backend que **lee constantemente la carpeta de uploads** en búsqueda de nuevas evidencias.

**¿Cómo funciona?**
1. En el disco o servidor donde corra el backend, localiza la carpeta `backend/uploads/`.
2. Para subir evidencia, **simplemente pega las carpetas** de los cursos en esta ubicación. 
   - El nombre de la carpeta debe coincidir exactamente con el ID del curso (Ejemplo: `excel`, `scratch`).
   - Dentro de esa carpeta, puedes pegar imágenes, fotos, etc.
3. El bot escáner se ejecuta automáticamente cada 5 minutos en segundo plano dentro de NodeJS.
   - Detecta si hay nuevos archivos que no estén en la base de datos.
   - Los registra automáticamente como tipo `GALLERY` asociándolos al curso.
4. **En el Frontend**, ya no hay necesidad de dar clic en "Guardar" para escanear localmente. El panel de administración simplemente hará "polling" de las evidencias de la Base de Datos y las mostrará automáticamente en pantalla tan pronto como el bot las registre.

### Solución de Problemas (Troubleshooting)
- **Error conectando a la BD:** Verifica que Docker Desktop o el servicio de Docker esté corriendo y el contenedor `seiem_db` esté activo.
- **Evidencias no aparecen:** Verifica que el ID de la carpeta en `backend/uploads/` coincida exactamente con el ID del curso y que el archivo no haya sido registrado antes con el mismo nombre.

---

## 🌍 Opciones de Implementación: Servidor Local Expuesto a Red/Internet

Si deseas que este sistema sea accesible por otras computadoras o por internet, y que los servidores físicos se mantengan "en casa" (On-Premise), existen dos caminos principales:

### Opción 1: Intranet Local (Solo para la red del edificio)
Si el sistema solo debe funcionar para las computadoras conectadas al mismo módem o red de tu institución:
1. **Fijar IP:** Asígnale una IP local fija a la PC servidora (Ej. `192.168.1.100`).
2. **Modificar Frontend:** Cambia en el código de React las llamadas que dicen `localhost:3001` por `192.168.1.100:3001`.
3. **Firewall:** Abre los puertos `3001` (Backend) y `8080` (Frontend) en el Firewall de Windows Defender de la PC servidora.
4. **Acceso:** Las demás PCs entrarán escribiendo `http://192.168.1.100:8080` en su navegador.

### Opción 2: Accesible por todo Internet (Cloudflare Tunnels) - 🌟 Recomendado
Si quieres que funcione como una "web normal" accesible en cualquier parte del mundo de forma segura y moderna sin modificar tu infraestructura física ni módem:
1. **Comprar Dominio:** Adquiere un dominio (ej. `cursos-seiem.com`).
2. **Instalar Cloudflared:** Instala el cliente de Cloudflare Tunnel en la PC servidora.
3. **El Túnel Seguro:** Configura el túnel para que envíe el tráfico del dominio directamente a tu PC local (puertos locales `8080` y `3001`).
4. **Ventajas:** No abres puertos (no hay riesgo en el firewall), recibes certificado de seguridad (candado HTTPS) automático, y la carga pesada la maneja Cloudflare.

### Opción 3: Accesible por todo Internet (Método Tradicional / Port Forwarding)
Si prefieres administrar la red de la forma tradicional, tu departamento de TI debe realizar lo siguiente:
1. **IP Pública Estática:** Contratar una IP Pública fija con el proveedor de internet.
2. **Port Forwarding:** Entrar al módem/router corporativo y redirigir los puertos `80` y `443` hacia la IP local de tu servidor.
3. **Servidor Proxy (Nginx/Apache):** Instalar Nginx para recibir el tráfico de internet y repartirlo entre el Frontend y el Backend.
4. **Dominio:** Apuntar el dominio DNS hacia la IP Pública corporativa y configurar los certificados de seguridad (`Let's Encrypt`).

---

## 🔐 Configuración de Inicio de Sesión con Google (Google Auth)

El sistema ahora soporta el inicio de sesión automático usando cuentas de Google.

### Cómo configurar tu Google Client ID (Modo Desarrollo/Local)
Para que el botón de Google funcione en tu computadora:
1. Ve a la [Consola de Google Cloud](https://console.cloud.google.com/).
2. Crea un proyecto nuevo, ve a **"API y Servicios"** > **"Pantalla de consentimiento de OAuth"** y elige **"Externo"**. Llena los datos.
3. Ve a **"Credenciales"** > **"+ CREAR CREDENCIALES"** > **"ID de cliente de OAuth"**.
4. Tipo: **Aplicación Web**.
5. En **Orígenes de JavaScript autorizados**, añade: `http://localhost:5173`
6. Copia el **Client ID** generado.
7. Pégalo en dos archivos `.env`:
   - En `capstone-skills/.env` (crea el archivo si no existe): `VITE_GOOGLE_CLIENT_ID=tu_id_aqui`
   - En `backend/.env`: `GOOGLE_CLIENT_ID=tu_id_aqui`
8. Reinicia tus servidores de NodeJS y Vite.

### ⚠️ ¿Qué cambiar al pasar a PRODUCCIÓN?
Una vez que vayas a publicar tu página en internet (ej. `https://cursos-seiem.com`), es estrictamente necesario hacer **dos cambios en la consola de Google**:

1. **Actualizar el dominio autorizado (Orígenes de JavaScript):**
   - Vuelve a Google Cloud Console > "Credenciales" > edita tu ID de cliente.
   - En "Orígenes de JavaScript autorizados", **borra** `http://localhost:5173` y **agrega tu dominio real de producción** (ej. `https://cursos-seiem.com`). Si no haces esto, dará Error 401.
   
2. **Publicar la aplicación (Consent Screen):**
   - Ve a **"Pantalla de consentimiento de OAuth"**.
   - Haz clic en el botón **"PUBLICAR LA APLICACIÓN"** para pasarla de "Testing" (Prueba) a "En producción". 
   - **IMPORTANTE:** Si no publicas la app, solo los correos que tú añadas manualmente a la lista de "Usuarios de prueba" podrán iniciar sesión (dará Error 403 al resto). Publicarla permite que *cualquier* usuario use su cuenta de Google.

---

## 📧 Recuperación de Contraseña y Servicio de Correo

El sistema ahora cuenta con un flujo seguro de recuperación de contraseñas mediante **PIN de 6 dígitos**.

### ¿Cómo funciona la recuperación?
1. El usuario solicita recuperar su contraseña ingresando su **nombre de usuario** o su **correo electrónico**.
2. El backend genera un PIN de 6 dígitos y se lo envía por correo electrónico usando un diseño institucional adaptado a la identidad de *Cursos SEIEM*.
3. El usuario ingresa el PIN y su nueva contraseña en la plataforma.

### Configuración del Servicio de Correo (Nodemailer)
Para enviar estos correos globales sin requerir un dominio web verificado, el sistema utiliza **Nodemailer** conectado a una cuenta de Gmail por SMTP. 
Actualmente, el correo configurado para los envíos es: **`seguridadcoeee@gmail.com`**.

**Si necesitas cambiar el correo o actualizar la contraseña de aplicación en el futuro:**
Debes editar las siguientes variables en el archivo `backend/.env`:
```env
SMTP_USER="seguridadcoeee@gmail.com"
SMTP_PASS="tu_contraseña_de_aplicacion_de_16_letras"
```
*(Recuerda que `SMTP_PASS` no es la contraseña normal con la que inicias sesión en Gmail, sino una **"Contraseña de aplicación"** generada en los ajustes de seguridad de la cuenta de Google).*

---

## 👤 Mejoras en la Experiencia de Inicio de Sesión
El sistema de autenticación ha sido optimizado para ser completamente a prueba de fallos y mejorar la experiencia del usuario (UX):
- **Inicio de sesión Dual:** El usuario puede iniciar sesión escribiendo su *nombre de usuario* o su *correo electrónico* de forma indistinta, tanto para el Login como para la Recuperación.
- **Insensibilidad a Mayúsculas (Case-Insensitive):** PostgreSQL suele ser estricto, pero el sistema ahora ignora mayúsculas y minúsculas. Si el usuario se registró como `Juan123`, puede iniciar sesión escribiendo `juan123` sin ser rechazado.
- **Limpieza Automática (Trim):** Si el usuario deja espacios en blanco al inicio o al final de su usuario o correo por accidente al teclear, el sistema los limpia automáticamente antes de validar con la base de datos.
