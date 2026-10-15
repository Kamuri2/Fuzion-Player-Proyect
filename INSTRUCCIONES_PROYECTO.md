# Instrucciones Obligatorias del Proyecto Fuzion Player

> **IMPORTANTE**: Este documento contiene las reglas de operación críticas para el asistente y los desarrolladores que interactúen con este proyecto. Debe leerse y respetarse al inicio de cada conversación.

---

## 1. Prohibición Estricta de Subir a GitHub
- **NUNCA** subir código, ramas, etiquetas, commits ni ejecutar `git push` al repositorio de GitHub asociado a este proyecto bajo ninguna circunstancia.
- Ningún cambio, archivo, corrección o nueva funcionalidad debe ser enviado a GitHub **HASTA QUE EL USUARIO LO ESPECIFIQUE EXPLÍCITAMENTE**.
- Se prohíbe cualquier comando de automatización o sincronización remota hacia GitHub sin la autorización previa y directa del usuario.

---

## 2. Lectura Obligatoria al Inicio de Cada Conversación
- Al comenzar cualquier nueva sesión o conversación en este repositorio, el asistente debe revisar y cargar estas instrucciones como guía obligatoria de conducta.
- Se debe verificar el estado del repositorio antes de proponer cambios y nunca alterar repositorios remotos.

---

## 3. Registro Obligatorio en el Diccionario de Traducción
- **CADA NUEVA PALABRA**, frase, botón, tooltip, mensaje de error, notificación o elemento de texto que se introduzca en el aplicativo **DEBE** agregarse obligatoriamente a los diccionarios de traducción del proyecto:
  - Español: `src/renderer/src/locales/es.json`
  - Inglés: `src/renderer/src/locales/en.json`
- Debe utilizarse siempre el hook `useTranslation` de `react-i18next` con la función `t('player.clave', 'Texto por defecto')`.
- Queda terminantemente prohibido incluir textos visibles de interfaz quemados (hardcodeados) en el código sin su correspondiente clave y traducción en los diccionarios.
