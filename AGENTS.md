# Reglas Críticas del Proyecto Fuzion Player

> Consulta el documento completo en [INSTRUCCIONES_PROYECTO.md](file:///c:/Users/kevin/Downloads/Fuzion-Player/INSTRUCCIONES_PROYECTO.md).

## Reglas Obligatorias para el Asistente

1. **NO SUBIR NADA A GITHUB**:
   - Bajo ninguna circunstancia ejecutes `git push`, subas código, ramas o realices sincronizaciones con el repositorio remoto de GitHub hasta que el usuario te lo especifique explícitamente.

2. **LECTURA AL INICIAR CONVERSACIONES**:
   - Lee y ten en cuenta siempre estas reglas al comenzar cada conversación con el usuario.

3. **REGISTRO EN EL DICCIONARIO**:
   - Todas las nuevas palabras, textos, etiquetas, botones y mensajes agregados a la aplicación DEBEN colocarse en los diccionarios de traducción:
     - `src/renderer/src/locales/es.json`
     - `src/renderer/src/locales/en.json`
   - Deben usarse a través de `t(...)` de `react-i18next`. No dejes textos visibles hardcodeados.
