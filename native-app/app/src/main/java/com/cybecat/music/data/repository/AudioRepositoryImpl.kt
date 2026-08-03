package com.cybecat.music.data.repository

import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import com.cybecat.music.domain.model.Song
import com.cybecat.music.domain.repository.AudioRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import javax.inject.Inject

class AudioRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context
) : AudioRepository {

    override fun getAudioFiles(treeUriString: String): Flow<List<Song>> = flow {
        val rootUri = Uri.parse(treeUriString)
        val rootDoc = DocumentFile.fromTreeUri(context, rootUri)
        val songsList = mutableListOf<Song>()
        
        if (rootDoc != null && rootDoc.isDirectory) {
            scanDirectory(rootDoc, songsList)
        }
        
        emit(songsList)
    }.flowOn(Dispatchers.IO)

    private fun scanDirectory(dir: DocumentFile, list: MutableList<Song>) {
        val files = dir.listFiles()
        for (file in files) {
            if (file.isDirectory) {
                scanDirectory(file, list)
            } else {
                val mimeType = file.type ?: ""
                val name = file.name?.lowercase() ?: ""
                if (mimeType.startsWith("audio/") || name.endsWith(".mp3") || name.endsWith(".flac") || name.endsWith(".wav") || name.endsWith(".m4a")) {
                    extractSongData(file)?.let { list.add(it) }
                }
            }
        }
    }

    private fun extractSongData(file: DocumentFile): Song? {
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(context, file.uri)
            val title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)
                ?: file.name?.substringBeforeLast(".") ?: "Unknown Title"
            val artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)
                ?: retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUMARTIST)
                ?: "Unknown Artist"
            val album = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM) ?: "Unknown Album"
            val durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
            val duration = durationStr?.toLongOrNull() ?: 0L

            Song(
                id = file.uri.toString(),
                title = title,
                artist = artist,
                album = album,
                duration = duration,
                data = file.uri.toString(),
                uri = file.uri,
                artworkUri = file.uri
            )
        } catch (e: Exception) {
            e.printStackTrace()
            null
        } finally {
            try {
                retriever.release()
            } catch (e: Exception) {
                // Ignore
            }
        }
    }

    override suspend fun getEmbeddedHiResArtwork(songUri: Uri): ByteArray? = withContext(Dispatchers.IO) {
        val retriever = MediaMetadataRetriever()
        try {
            retriever.setDataSource(context, songUri)
            retriever.embeddedPicture
        } catch (e: Exception) {
            null
        } finally {
            try {
                retriever.release()
            } catch (e: Exception) {
                // Ignore
            }
        }
    }
}
