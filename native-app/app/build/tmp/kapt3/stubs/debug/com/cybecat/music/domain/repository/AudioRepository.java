package com.cybecat.music.domain.repository;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000,\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0018\u0002\n\u0002\u0010 \n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\u0012\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\bf\u0018\u00002\u00020\u0001J\u001c\u0010\u0002\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u00050\u00040\u00032\u0006\u0010\u0006\u001a\u00020\u0007H&J\u0018\u0010\b\u001a\u0004\u0018\u00010\t2\u0006\u0010\n\u001a\u00020\u000bH\u00a6@\u00a2\u0006\u0002\u0010\f\u00a8\u0006\r"}, d2 = {"Lcom/cybecat/music/domain/repository/AudioRepository;", "", "getAudioFiles", "Lkotlinx/coroutines/flow/Flow;", "", "Lcom/cybecat/music/domain/model/Song;", "treeUriString", "", "getEmbeddedHiResArtwork", "", "songUri", "Landroid/net/Uri;", "(Landroid/net/Uri;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "app_debug"})
public abstract interface AudioRepository {
    
    @org.jetbrains.annotations.NotNull()
    public abstract kotlinx.coroutines.flow.Flow<java.util.List<com.cybecat.music.domain.model.Song>> getAudioFiles(@org.jetbrains.annotations.NotNull()
    java.lang.String treeUriString);
    
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getEmbeddedHiResArtwork(@org.jetbrains.annotations.NotNull()
    android.net.Uri songUri, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super byte[]> $completion);
}