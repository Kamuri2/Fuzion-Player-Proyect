package com.cybecat.music.ui.viewmodel;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000j\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\u000b\n\u0002\b\u0002\n\u0002\u0010\u0007\n\u0000\n\u0002\u0010 \n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\t\n\u0002\u0018\u0002\n\u0002\b\b\n\u0002\u0010\u0002\n\u0002\b\u0006\n\u0002\u0018\u0002\n\u0002\b\u0005\b\u0007\u0018\u00002\u00020\u0001B!\b\u0007\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u0012\u0006\u0010\u0004\u001a\u00020\u0005\u0012\b\b\u0001\u0010\u0006\u001a\u00020\u0007\u00a2\u0006\u0002\u0010\bJ\u0010\u0010+\u001a\u00020,2\u0006\u0010-\u001a\u00020\u000fH\u0002J\b\u0010.\u001a\u00020,H\u0014J\u000e\u0010/\u001a\u00020,2\u0006\u00100\u001a\u00020\u000bJ\u000e\u00101\u001a\u00020,2\u0006\u00102\u001a\u000203J\u0018\u00104\u001a\u00020,2\b\u00105\u001a\u0004\u0018\u00010\r\u00f8\u0001\u0000\u00a2\u0006\u0002\b6J\u0006\u00107\u001a\u00020,R\u0016\u0010\t\u001a\n\u0012\u0006\u0012\u0004\u0018\u00010\u000b0\nX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0016\u0010\f\u001a\n\u0012\u0006\u0012\u0004\u0018\u00010\r0\nX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0016\u0010\u000e\u001a\n\u0012\u0006\u0012\u0004\u0018\u00010\u000f0\nX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0014\u0010\u0010\u001a\b\u0012\u0004\u0012\u00020\u00110\nX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0014\u0010\u0012\u001a\b\u0012\u0004\u0012\u00020\u00110\nX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0014\u0010\u0013\u001a\b\u0012\u0004\u0012\u00020\u00140\nX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u001a\u0010\u0015\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u000b0\u00160\nX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u001a\u0010\u0017\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u000b0\u00160\nX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0007X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0019\u0010\u0018\u001a\n\u0012\u0006\u0012\u0004\u0018\u00010\u000b0\u0019\u00a2\u0006\b\n\u0000\u001a\u0004\b\u001a\u0010\u001bR\u0019\u0010\u001c\u001a\n\u0012\u0006\u0012\u0004\u0018\u00010\r0\u0019\u00a2\u0006\b\n\u0000\u001a\u0004\b\u001d\u0010\u001bR\u000e\u0010\u0004\u001a\u00020\u0005X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0019\u0010\u001e\u001a\n\u0012\u0006\u0012\u0004\u0018\u00010\u000f0\u0019\u00a2\u0006\b\n\u0000\u001a\u0004\b\u001f\u0010\u001bR\u0017\u0010 \u001a\b\u0012\u0004\u0012\u00020\u00110\u0019\u00a2\u0006\b\n\u0000\u001a\u0004\b \u0010\u001bR\u0017\u0010!\u001a\b\u0012\u0004\u0012\u00020\u00110\u0019\u00a2\u0006\b\n\u0000\u001a\u0004\b!\u0010\u001bR\u0016\u0010\"\u001a\n $*\u0004\u0018\u00010#0#X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0017\u0010%\u001a\b\u0012\u0004\u0012\u00020\u00140\u0019\u00a2\u0006\b\n\u0000\u001a\u0004\b&\u0010\u001bR\u001d\u0010\'\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u000b0\u00160\u0019\u00a2\u0006\b\n\u0000\u001a\u0004\b(\u0010\u001bR\u001d\u0010)\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u000b0\u00160\u0019\u00a2\u0006\b\n\u0000\u001a\u0004\b*\u0010\u001b\u0082\u0002\u0007\n\u0005\b\u00a1\u001e0\u0001\u00a8\u00068"}, d2 = {"Lcom/cybecat/music/ui/viewmodel/MainViewModel;", "Landroidx/lifecycle/ViewModel;", "audioRepository", "Lcom/cybecat/music/domain/repository/AudioRepository;", "exoPlayer", "Landroidx/media3/exoplayer/ExoPlayer;", "context", "Landroid/content/Context;", "(Lcom/cybecat/music/domain/repository/AudioRepository;Landroidx/media3/exoplayer/ExoPlayer;Landroid/content/Context;)V", "_currentSong", "Lkotlinx/coroutines/flow/MutableStateFlow;", "Lcom/cybecat/music/domain/model/Song;", "_dominantColor", "Landroidx/compose/ui/graphics/Color;", "_folderUri", "", "_isPlaying", "", "_isScanning", "_progress", "", "_queue", "", "_songs", "currentSong", "Lkotlinx/coroutines/flow/StateFlow;", "getCurrentSong", "()Lkotlinx/coroutines/flow/StateFlow;", "dominantColor", "getDominantColor", "folderUri", "getFolderUri", "isPlaying", "isScanning", "prefs", "Landroid/content/SharedPreferences;", "kotlin.jvm.PlatformType", "progress", "getProgress", "queue", "getQueue", "songs", "getSongs", "loadSongsFromUri", "", "uriString", "onCleared", "playSong", "song", "saveFolderUri", "uri", "Landroid/net/Uri;", "setDominantColor", "color", "setDominantColor-Y2TPw74", "togglePlayPause", "app_debug"})
@dagger.hilt.android.lifecycle.HiltViewModel()
public final class MainViewModel extends androidx.lifecycle.ViewModel {
    @org.jetbrains.annotations.NotNull()
    private final com.cybecat.music.domain.repository.AudioRepository audioRepository = null;
    @org.jetbrains.annotations.NotNull()
    private final androidx.media3.exoplayer.ExoPlayer exoPlayer = null;
    @org.jetbrains.annotations.NotNull()
    private final android.content.Context context = null;
    private final android.content.SharedPreferences prefs = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.MutableStateFlow<java.util.List<com.cybecat.music.domain.model.Song>> _songs = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.StateFlow<java.util.List<com.cybecat.music.domain.model.Song>> songs = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.MutableStateFlow<com.cybecat.music.domain.model.Song> _currentSong = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.StateFlow<com.cybecat.music.domain.model.Song> currentSong = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.MutableStateFlow<java.lang.Boolean> _isPlaying = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.StateFlow<java.lang.Boolean> isPlaying = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.MutableStateFlow<java.lang.Float> _progress = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.StateFlow<java.lang.Float> progress = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.MutableStateFlow<java.util.List<com.cybecat.music.domain.model.Song>> _queue = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.StateFlow<java.util.List<com.cybecat.music.domain.model.Song>> queue = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.MutableStateFlow<java.lang.Boolean> _isScanning = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.StateFlow<java.lang.Boolean> isScanning = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.MutableStateFlow<androidx.compose.ui.graphics.Color> _dominantColor = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.StateFlow<androidx.compose.ui.graphics.Color> dominantColor = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.MutableStateFlow<java.lang.String> _folderUri = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.StateFlow<java.lang.String> folderUri = null;
    
    @javax.inject.Inject()
    public MainViewModel(@org.jetbrains.annotations.NotNull()
    com.cybecat.music.domain.repository.AudioRepository audioRepository, @org.jetbrains.annotations.NotNull()
    androidx.media3.exoplayer.ExoPlayer exoPlayer, @dagger.hilt.android.qualifiers.ApplicationContext()
    @org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        super();
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.StateFlow<java.util.List<com.cybecat.music.domain.model.Song>> getSongs() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.StateFlow<com.cybecat.music.domain.model.Song> getCurrentSong() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.StateFlow<java.lang.Boolean> isPlaying() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.StateFlow<java.lang.Float> getProgress() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.StateFlow<java.util.List<com.cybecat.music.domain.model.Song>> getQueue() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.StateFlow<java.lang.Boolean> isScanning() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.StateFlow<androidx.compose.ui.graphics.Color> getDominantColor() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.StateFlow<java.lang.String> getFolderUri() {
        return null;
    }
    
    public final void saveFolderUri(@org.jetbrains.annotations.NotNull()
    android.net.Uri uri) {
    }
    
    private final void loadSongsFromUri(java.lang.String uriString) {
    }
    
    public final void playSong(@org.jetbrains.annotations.NotNull()
    com.cybecat.music.domain.model.Song song) {
    }
    
    public final void togglePlayPause() {
    }
    
    @java.lang.Override()
    protected void onCleared() {
    }
}