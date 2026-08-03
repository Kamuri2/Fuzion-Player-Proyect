# Guía de Instalación y Despliegue Local (Entorno de Pruebas)

Esta guía detalla los pasos exactos para clonar, configurar y ejecutar este proyecto (Frontend en React y Backend en Node.js + PostgreSQL) en una computadora nueva desde cero.

---

## 1. Requisitos Previos (Software Necesario)
Antes de comenzar, asegúrate de tener instalado lo siguiente en la nueva PC:
- **[Git](https://git-scm.com/downloads):** Para clonar el repositorio.
- **[Node.js](https://nodejs.org/) (v18 o superior):** Entorno de ejecución para Javascript (incluye `npm`).
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/):** Para levantar la base de datos de PostgreSQL fácilmente sin configuraciones complejas.

---

## 2. Clonar el Repositorio
Abre tu terminal (PowerShell, CMD o Git Bash) y ejecuta:
```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DE_LA_CARPETA_DEL_PROYECTO>
```

---

## 3. Configurar la Base de Datos con Docker
El proyecto utiliza PostgreSQL. La forma más rápida y limpia de correrlo es usando Docker.

1. Abre la aplicación de **Docker Desktop** y asegúrate de que esté ejecutándose (el icono de la ballena debe estar verde).
2. En tu terminal, ejecuta el siguiente comando para crear y levantar un contenedor de Postgres:
```bash
docker run --name seiem-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=seiem_db -p 5432:5432 -d postgres
```
*(Esto levantará un servidor de base de datos Postgres en el puerto 5432 de tu computadora con usuario `postgres` y contraseña `admin`).*

---

## 4. Configuración y Ejecución del Backend (Node.js)
El backend es el encargado de conectarse a la base de datos y proveer la API.

1. Abre una terminal y navega a la carpeta del backend:
```bash
cd backend
```
2. Instala las dependencias:
```bash
npm install
```
3. Crea un archivo llamado `.env` en la raíz de la carpeta `backend` y pega lo siguiente:
```env
PORT=3001
DATABASE_URL="postgresql://postgres:admin@localhost:5432/seiem_db?schema=public"
JWT_SECRET="una_clave_secreta_super_segura_para_el_proyecto_seiem_2026"
```
4. Genera el cliente de Prisma y empuja la estructura a la base de datos:
```bash
npx prisma generate
npx prisma db push
```
5. Inicia el servidor de desarrollo:
```bash
npm run dev
```
*(Deberías ver un mensaje indicando que el backend está corriendo en `http://localhost:3001`)*.

---

## 5. Configuración y Ejecución del Frontend (React + Vite)
El frontend es la interfaz visual de la aplicación.

1. Abre **otra terminal nueva** (deja la del backend corriendo) y navega a la carpeta del frontend (usualmente llamada `capstone-skills` o `frontend`):
```bash
cd capstone-skills
```
2. Instala las dependencias:
```bash
npm install
```
3. Crea un archivo `.env` (si es necesario) en la raíz de la carpeta del frontend con la URL del backend. Ejemplo:
```env
VITE_API_URL=http://localhost:3001/api
```
*(Nota: Si el frontend ya tiene la URL configurada por defecto en el código, puedes saltar este paso).*
4. Inicia el servidor de desarrollo visual:
```bash
npm run dev
```
5. La consola te dará una URL (generalmente `http://localhost:5173`). ¡Abre ese enlace en tu navegador y el proyecto estará funcionando!

---

## 6. Siguientes Pasos (Pruebas)
- Entra a la página web y prueba crear un usuario o iniciar sesión.
- Si subes evidencias o creas cursos, estos se guardarán automáticamente en tu base de datos local de Docker.
- Si en algún momento apagas la computadora, la próxima vez solo tendrás que asegurarte de abrir Docker, y correr `npm run dev` tanto en la carpeta del backend como en la del frontend.
