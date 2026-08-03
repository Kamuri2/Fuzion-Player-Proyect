package com.cybecat.music.domain.repository

import android.net.Uri
import com.cybecat.music.domain.model.Song
import kotlinx.coroutines.flow.Flow

interface AudioRepository {
    fun getAudioFiles(treeUriString: String): Flow<List<Song>>
    suspend fun getEmbeddedHiResArtwork(songUri: Uri): ByteArray?
}
