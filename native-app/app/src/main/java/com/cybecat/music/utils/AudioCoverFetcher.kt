package com.cybecat.music.utils

import android.media.MediaMetadataRetriever
import coil.ImageLoader
import coil.decode.DataSource
import coil.fetch.FetchResult
import coil.fetch.Fetcher
import coil.fetch.SourceResult
import coil.request.Options
import okio.Buffer
import okio.buffer

class AudioCoverFetcher(
    private val data: android.net.Uri,
    private val options: Options
) : Fetcher {
    override suspend fun fetch(): FetchResult? {
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(options.context, data)
            val picture = retriever.embeddedPicture
            if (picture != null) {
                val buffer = Buffer().write(picture)
                SourceResult(
                    source = coil.decode.ImageSource(source = buffer, options.context),
                    mimeType = "image/jpeg",
                    dataSource = DataSource.DISK
                )
            } else {
                null
            }
        } catch (e: Exception) {
            null
        } finally {
            try {
                retriever.release()
            } catch (e: Exception) {}
        }
    }

    class Factory : Fetcher.Factory<android.net.Uri> {
        override fun create(data: android.net.Uri, options: Options, imageLoader: ImageLoader): Fetcher? {
            // Only handle URIs that are meant for our audio files
            val path = data.path ?: ""
            if (path.contains("document") && !path.contains("image")) {
                return AudioCoverFetcher(data, options)
            }
            return null
        }
    }
}
