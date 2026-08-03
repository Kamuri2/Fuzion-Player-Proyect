package com.cybecat.music.domain.model

import android.net.Uri

data class Song(
    val id: String,
    val title: String,
    val artist: String,
    val album: String,
    val duration: Long,
    val data: String,
    val uri: Uri,
    val artworkUri: Uri
)
