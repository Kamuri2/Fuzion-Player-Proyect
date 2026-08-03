<div align="center">
<pre>
               %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%             
         %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%         
       %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%       
     %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%     
   %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%   
  %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%  
 %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% 
%%%%%%%%%%%%%%%%%#=======*%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%============%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%#==============*%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%#=================#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%*==================+#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%+===================+%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%#====================+%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%+====================+#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%+=======================*#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%==============================+%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%+===================================+#%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%+=====================================%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%=====================================+%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%=====================================+%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%=====================================%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%+===================================#%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%==============================+%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%+========================##%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%#+====================+*%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%*====================+%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%*====================*%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%*===================*%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%#=================*%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%#===============%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%============*%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%#=======*%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
 %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% 
  %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%  
   %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%   
     %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%     
       %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%       
         %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%         
             %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%             
  
</pre>
  <h1>Fuzion Player</h1>
  <p><strong>Un reproductor de música de escritorio moderno, estético y personalizable.</strong></p>
  <p>Construido con Electron, React y TypeScript.</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgray.svg)]()

</div>

---

## Sobre el Proyecto

**Fuzion Player** es una aplicación de escritorio diseñada para ofrecer una experiencia auditiva envolvente. Con una interfaz moderna que aprovecha efectos visuales atractivos (como fondos de partículas y acabados cristalinos), no solo te permite escuchar tu música local, sino que la presenta de la forma más estética posible.

### Características Principales

- **Gestión de Biblioteca:** Navega fácilmente por tus **Canciones, Álbumes, Artistas y Carpetas locales**.
- **Letras en Tiempo Real:** Visualizador de letras integrado para cantar tus canciones favoritas.
- **Personalización Dinámica:** Temas que se adaptan al color dominante de la portada del álbum que estés escuchando.
- **Mascota Interactiva:** Una simpática mascota que te acompaña mientras escuchas.
- **Modo Mini-Reproductor:** Para no perder de vista lo que suena mientras trabajas.
- **Ecualización e Interfaz Cristalina:** Disfruta de un diseño Glassmorphism que se siente premium.

### Novedades en esta versión

- **Enfoque total en Escritorio:** Se ha retirado el soporte experimental de la aplicación móvil para centrar el 100% de los esfuerzos en ofrecer la mejor experiencia posible en PC.
- **Mejoras de Internacionalización:** Se han corregido problemas de traducción donde elementos del menú de configuración (como el sonido de inicio) y textos del reproductor aparecían en español al usar la app en otros idiomas.
- **Mejoras en la lectura de letras:** Ahora el reproductor es capaz de leer archivos de letras externos con formato .lrc. Tambien se corrigio un problema que impedia leer las letras si estas contenian marcas de tiempo que incluyeran horas.
- **Prevencion de errores en la traduccion:** Se soluciono un problema tecnico que causaba que las letras no se mostraran si el servicio de traduccion fallaba. Ahora el sistema es mas inteligente y no guarda archivos vacios cuando hay errores de conexion, permitiendo que la traduccion se intente de nuevo mas tarde.
- **Notificaciones de estado del traductor:** Se agregaron alertas visuales en la aplicacion para avisarte cuando el servicio de traduccion no esta disponible temporalmente (por exceso de uso) y otra alerta para avisarte cuando el servicio se restablece y vuelve a funcionar.
- **Nueva ventana de confirmacion:** Se reemplazo la ventana basica del sistema por un cuadro de confirmacion oscuro, elegante y nativo al intentar borrar una lista de reproduccion, manteniendo la estetica del reproductor.
- **Panel lateral inteligente e interactivo:** El panel izquierdo del reproductor ahora se oculta de forma automatica luego de 4 segundos de inactividad la primera vez que entras. Ademas, cuenta con una nueva animacion suave al contraerse hacia un lado.
- **Memoria de estado avanzada:** Si navegas por tus albumes o artistas desde el panel del reproductor y luego sales, la proxima vez que abras el reproductor recordara exactamente en que pestaña y seccion del panel te habias quedado.
- **Ajustes de proporciones del reproductor:** Se optimizo el tamaño de la portada en el modo de vista normal (aumentada un 5%) y se redujo el espacio horizontal entre la portada y las letras (un 9% mas juntas) logrando un balance visual mucho mas limpio.
- **Boton de retroceso dinamico:** La flecha de retroceso del reproductor ahora se oculta automaticamente cuando el panel lateral esta abierto para evitar sobreponerse con otros botones y mantener la interfaz limpia.
- **Optimización extrema de memoria:** Se implementó *Lazy Loading* (Carga perezosa) en las pantallas de Álbumes y Artistas para que las portadas solo se carguen a medida que haces scroll, evitando que la aplicación consuma exceso de RAM.
- **Respeto por nombres de bandas:** Se eliminó la función intrusiva que intentaba separar nombres con comas o palabras como "and" o "feat", de modo que bandas como "LSD and the Search for God" mantienen su nombre intacto.
- **Icono por defecto mejorado:** Se reemplazó el icono por defecto para artistas desconocidos por un diseño minimalista y personalizado (un gatito con un signo de interrogación) que es mucho más claro y estético, ajustándose automáticamente al tamaño de la vista.
- **Ajustes de encuadre fotográfico:** Las imágenes de fondo y banners de artistas (como *Fanarts*) ahora están configuradas para no cortar las cabezas u otros detalles importantes en la parte superior.

---

## Descargar Instalador

> [!TIP]
> **No necesitas compilar el proyecto para probarlo.**  
> Puedes descargar el archivo ejecutable (`.exe`) listo para instalar y usar directamente desde el apartado de **[Releases (Lanzamientos)](https://github.com/Kamuri2/Fuzion-Player-Proyect/releases)** de este repositorio.

---

## Desarrollo

Si deseas explorar el código fuente, clonar el proyecto y modificarlo por tu cuenta, sigue estos pasos:

### Tecnologías utilizadas

- [Electron](https://www.electronjs.org/) (Framework principal)
- [React](https://reactjs.org/) (UI de la aplicación)
- [Vite](https://vitejs.dev/) (Empaquetador ultrarrápido)
- [TypeScript](https://www.typescriptlang.org/) (Tipado seguro)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Kamuri2/Fuzion-Player-Proyect.git

# Entrar a la carpeta
cd Fuzion-Player-Proyect

# Instalar dependencias
npm install
```

### Ejecutar en modo desarrollo

```bash
npm run dev
```

### Compilar el instalador (Build)

```bash
# Para Windows
npm run build:win

# Para macOS
npm run build:mac

# Para Linux
npm run build:linux
```

---

<div align="center">
  <sub>Desarrollado por Kamuri2 para los amantes de la música y la estética.</sub>
</div>
