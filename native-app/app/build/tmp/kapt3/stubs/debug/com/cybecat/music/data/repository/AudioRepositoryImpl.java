package com.cybecat.music.data.repository;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000J\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\u0010 \n\u0000\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\u0012\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0002\b\u0002\n\u0002\u0010!\n\u0000\u0018\u00002\u00020\u0001B\u0011\b\u0007\u0012\b\b\u0001\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u0012\u0010\u0005\u001a\u0004\u0018\u00010\u00062\u0006\u0010\u0007\u001a\u00020\bH\u0002J\u001c\u0010\t\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u00060\u000b0\n2\u0006\u0010\f\u001a\u00020\rH\u0016J\u0018\u0010\u000e\u001a\u0004\u0018\u00010\u000f2\u0006\u0010\u0010\u001a\u00020\u0011H\u0096@\u00a2\u0006\u0002\u0010\u0012J\u001e\u0010\u0013\u001a\u00020\u00142\u0006\u0010\u0015\u001a\u00020\b2\f\u0010\u0016\u001a\b\u0012\u0004\u0012\u00020\u00060\u0017H\u0002R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0018"}, d2 = {"Lcom/cybecat/music/data/repository/AudioRepositoryImpl;", "Lcom/cybecat/music/domain/repository/AudioRepository;", "context", "Landroid/content/Context;", "(Landroid/content/Context;)V", "extractSongData", "Lcom/cybecat/music/domain/model/Song;", "file", "Landroidx/documentfile/provider/DocumentFile;", "getAudioFiles", "Lkotlinx/coroutines/flow/Flow;", "", "treeUriString", "", "getEmbeddedHiResArtwork", "", "songUri", "Landroid/net/Uri;", "(Landroid/net/Uri;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "scanDirectory", "", "dir", "list", "", "app_debug"})
public final class AudioRepositoryImpl implements com.cybecat.music.domain.repository.AudioRepository {
    @org.jetbrains.annotations.NotNull()
    private final android.content.Context context = null;
    
    @javax.inject.Inject()
    public AudioRepositoryImpl(@dagger.hilt.android.qualifiers.ApplicationContext()
    @org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        super();
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public kotlinx.coroutines.flow.Flow<java.util.List<com.cybecat.music.domain.model.Song>> getAudioFiles(@org.jetbrains.annotations.NotNull()
    java.lang.String treeUriString) {
        return null;
    }
    
    private final void scanDirectory(androidx.documentfile.provider.DocumentFile dir, java.util.List<com.cybecat.music.domain.model.Song> list) {
    }
    
    private final com.cybecat.music.domain.model.Song extractSongData(androidx.documentfile.provider.DocumentFile file) {
        return null;
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.Nullable()
    public java.lang.Object getEmbeddedHiResArtwork(@org.jetbrains.annotations.NotNull()
    android.net.Uri songUri, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super byte[]> $completion) {
        return null;
    }
}