package com.cybecat.music

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import coil.Coil
import coil.ImageLoader
import com.cybecat.music.ui.screens.FolderSelectionScreen
import com.cybecat.music.ui.screens.MainScreen
import com.cybecat.music.ui.theme.CybeCatMusicTheme
import com.cybecat.music.ui.viewmodel.MainViewModel
import com.cybecat.music.utils.AudioCoverFetcher
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val imageLoader = ImageLoader.Builder(this)
            .components {
                add(AudioCoverFetcher.Factory())
            }
            .build()
        Coil.setImageLoader(imageLoader)

        setContent {
            CybeCatMusicTheme {
                val viewModel: MainViewModel = hiltViewModel()
                val folderUri by viewModel.folderUri.collectAsState()
                
                if (folderUri == null) {
                    FolderSelectionScreen(
                        onFolderSelected = { uri ->
                            // Tomar permisos persistentes para poder leer esta carpeta en el futuro
                            contentResolver.takePersistableUriPermission(
                                uri,
                                android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION
                            )
                            viewModel.saveFolderUri(uri)
                        }
                    )
                } else {
                    MainScreen(viewModel = viewModel)
                }
            }
        }
    }
}
