package com.cybecat.music.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontFamily

private val DarkColors = darkColorScheme(
    primary = cybecat_dark_primary,
    onPrimary = cybecat_dark_onPrimary,
    background = cybecat_dark_bg,
    onBackground = cybecat_dark_text_h,
    surface = cybecat_dark_surface,
    onSurface = cybecat_dark_text,
    surfaceVariant = cybecat_dark_accent_bg,
    outline = cybecat_dark_border
)

@Composable
fun CybeCatMusicTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColors,
        // En una app real de Android, cargaríamos la fuente Inter o Roboto, por ahora usamos el default Sans-Serif
        content = content
    )
}
