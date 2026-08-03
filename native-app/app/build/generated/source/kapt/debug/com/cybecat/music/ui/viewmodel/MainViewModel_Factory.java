package com.cybecat.music.ui.viewmodel;

import android.content.Context;
import androidx.media3.exoplayer.ExoPlayer;
import com.cybecat.music.domain.repository.AudioRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata
@QualifierMetadata("dagger.hilt.android.qualifiers.ApplicationContext")
@DaggerGenerated
@Generated(
    value = "dagger.internal.codegen.ComponentProcessor",
    comments = "https://dagger.dev"
)
@SuppressWarnings({
    "unchecked",
    "rawtypes",
    "KotlinInternal",
    "KotlinInternalInJava"
})
public final class MainViewModel_Factory implements Factory<MainViewModel> {
  private final Provider<AudioRepository> audioRepositoryProvider;

  private final Provider<ExoPlayer> exoPlayerProvider;

  private final Provider<Context> contextProvider;

  public MainViewModel_Factory(Provider<AudioRepository> audioRepositoryProvider,
      Provider<ExoPlayer> exoPlayerProvider, Provider<Context> contextProvider) {
    this.audioRepositoryProvider = audioRepositoryProvider;
    this.exoPlayerProvider = exoPlayerProvider;
    this.contextProvider = contextProvider;
  }

  @Override
  public MainViewModel get() {
    return newInstance(audioRepositoryProvider.get(), exoPlayerProvider.get(), contextProvider.get());
  }

  public static MainViewModel_Factory create(Provider<AudioRepository> audioRepositoryProvider,
      Provider<ExoPlayer> exoPlayerProvider, Provider<Context> contextProvider) {
    return new MainViewModel_Factory(audioRepositoryProvider, exoPlayerProvider, contextProvider);
  }

  public static MainViewModel newInstance(AudioRepository audioRepository, ExoPlayer exoPlayer,
      Context context) {
    return new MainViewModel(audioRepository, exoPlayer, context);
  }
}
