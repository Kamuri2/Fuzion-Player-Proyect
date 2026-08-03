package com.cybecat.music.ui.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.cybecat.music.domain.model.Song
import com.cybecat.music.domain.repository.AudioRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val audioRepository: AudioRepository,
    private val exoPlayer: ExoPlayer,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val prefs = context.getSharedPreferences("cybecat_prefs", Context.MODE_PRIVATE)

    private val _songs = MutableStateFlow<List<Song>>(emptyList())
    val songs: StateFlow<List<Song>> = _songs.asStateFlow()

    private val _currentSong = MutableStateFlow<Song?>(null)
    val currentSong: StateFlow<Song?> = _currentSong.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()
    
    private val _progress = MutableStateFlow(0f)
    val progress: StateFlow<Float> = _progress.asStateFlow()

    private val _queue = MutableStateFlow<List<Song>>(emptyList())
    val queue: StateFlow<List<Song>> = _queue.asStateFlow()

    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()

    private val _dominantColor = MutableStateFlow<androidx.compose.ui.graphics.Color?>(null)
    val dominantColor: StateFlow<androidx.compose.ui.graphics.Color?> = _dominantColor.asStateFlow()

    private val _folderUri = MutableStateFlow<String?>(prefs.getString("music_folder_uri", null))
    val folderUri: StateFlow<String?> = _folderUri.asStateFlow()

    init {
        exoPlayer.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                _isPlaying.value = isPlaying
            }
            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                super.onMediaItemTransition(mediaItem, reason)
                if (mediaItem != null) {
                    val nextSongId = mediaItem.mediaId
                    val nextSong = _queue.value.find { it.id == nextSongId }
                    if (nextSong != null) {
                        _currentSong.value = nextSong
                    }
                }
            }
        })

        _folderUri.value?.let { loadSongsFromUri(it) }
    }

    fun saveFolderUri(uri: Uri) {
        val uriString = uri.toString()
        prefs.edit().putString("music_folder_uri", uriString).apply()
        _folderUri.value = uriString
        loadSongsFromUri(uriString)
    }

    private fun loadSongsFromUri(uriString: String) {
        viewModelScope.launch {
            _isScanning.value = true
            audioRepository.getAudioFiles(uriString).collectLatest { loadedSongs ->
                _songs.value = loadedSongs
                _queue.value = loadedSongs
                
                // Cargar todo al playlist de ExoPlayer
                exoPlayer.clearMediaItems()
                loadedSongs.forEach { song ->
                    exoPlayer.addMediaItem(MediaItem.Builder().setMediaId(song.id).setUri(song.uri).build())
                }
                
                if (loadedSongs.isNotEmpty() && _currentSong.value == null) {
                    _currentSong.value = loadedSongs.first()
                }
                _isScanning.value = false
            }
        }
    }

    fun playSong(song: Song) {
        _currentSong.value = song
        val index = _queue.value.indexOf(song)
        if (index != -1) {
            exoPlayer.seekTo(index, 0L)
            exoPlayer.prepare()
            exoPlayer.play()
        }
    }

    fun togglePlayPause() {
        if (exoPlayer.isPlaying) {
            exoPlayer.pause()
        } else {
            exoPlayer.play()
        }
    }

    fun setDominantColor(color: androidx.compose.ui.graphics.Color?) {
        _dominantColor.value = color
    }
    
    override fun onCleared() {
        super.onCleared()
        exoPlayer.release()
    }
}
