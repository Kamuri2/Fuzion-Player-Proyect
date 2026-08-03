package com.cybecat.music.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.MicNone
import androidx.compose.material.icons.rounded.ThumbDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.cybecat.music.domain.model.Song
import com.cybecat.music.ui.viewmodel.MainViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlayerScreen(
    viewModel: MainViewModel,
    onClose: () -> Unit
) {
    val currentSong by viewModel.currentSong.collectAsState()
    val isPlaying by viewModel.isPlaying.collectAsState()
    val dominantColor by viewModel.dominantColor.collectAsState()

    val animatedBackgroundColor by animateColorAsState(
        targetValue = dominantColor ?: MaterialTheme.colorScheme.background,
        animationSpec = tween(durationMillis = 1000)
    )

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var showQueue by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(animatedBackgroundColor)
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Top Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onClose) { 
                    Icon(imageVector = Icons.Default.KeyboardArrowDown, contentDescription = "Minimize", tint = Color.White) 
                }
                Text(
                    text = "REPRODUCIENDO",
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = 2.sp),
                    color = Color.White.copy(alpha = 0.7f)
                )
                IconButton(onClick = { /* Menu */ }) { 
                    Icon(imageVector = Icons.Default.MoreVert, contentDescription = "Menu", tint = Color.White) 
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Cover Art (Square)
            if (currentSong != null) {
                AsyncImage(
                    model = currentSong!!.uri, // Coil can load from content URI or we can use artworkUri
                    contentDescription = "Cover",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(8.dp))
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .background(Color.DarkGray, RoundedCornerShape(8.dp))
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Track Info
            Text(
                text = currentSong?.title ?: "No Title",
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = currentSong?.artist ?: "Unknown Artist",
                style = MaterialTheme.typography.titleMedium,
                color = Color.White.copy(alpha = 0.7f)
            )

            Spacer(modifier = Modifier.weight(1f))

            // Extra Controls (Favorite, Queue)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { /* Favorite */ }) {
                    Icon(imageVector = Icons.Outlined.FavoriteBorder, contentDescription = "Favorite", tint = Color.White.copy(alpha = 0.7f), modifier = Modifier.size(28.dp))
                }
                IconButton(onClick = { showQueue = true }) {
                    Icon(imageVector = Icons.Default.QueueMusic, contentDescription = "Queue", tint = Color.White.copy(alpha = 0.7f), modifier = Modifier.size(28.dp))
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Controls
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { /* Dislike */ }) {
                    Icon(imageVector = Icons.Rounded.ThumbDown, contentDescription = "Dislike", tint = Color.White.copy(alpha = 0.7f), modifier = Modifier.size(28.dp))
                }
                IconButton(onClick = { /* Prev */ }) { 
                    Icon(imageVector = Icons.Default.SkipPrevious, contentDescription = "Previous", tint = Color.White, modifier = Modifier.size(40.dp)) 
                }
                IconButton(
                    onClick = { viewModel.togglePlayPause() },
                    modifier = Modifier
                        .size(72.dp)
                        .background(Color.White, shape = RoundedCornerShape(50))
                ) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow, 
                        contentDescription = "Play/Pause", 
                        tint = Color.Black,
                        modifier = Modifier.size(40.dp)
                    )
                }
                IconButton(onClick = { /* Next */ }) { 
                    Icon(imageVector = Icons.Default.SkipNext, contentDescription = "Next", tint = Color.White, modifier = Modifier.size(40.dp)) 
                }
                IconButton(onClick = { /* Lyrics */ }) {
                    Icon(imageVector = Icons.Outlined.MicNone, contentDescription = "Lyrics", tint = Color.White.copy(alpha = 0.7f), modifier = Modifier.size(28.dp))
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }

        if (showQueue) {
            ModalBottomSheet(
                onDismissRequest = { showQueue = false },
                sheetState = sheetState,
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                // Queue content
                QueuePanel(viewModel)
            }
        }
    }
}
