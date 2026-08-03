package com.cybecat.music.service;

import androidx.media3.exoplayer.ExoPlayer;
import dagger.MembersInjector;
import dagger.internal.DaggerGenerated;
import dagger.internal.InjectedFieldSignature;
import dagger.internal.QualifierMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@QualifierMetadata
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
public final class AudioPlayerService_MembersInjector implements MembersInjector<AudioPlayerService> {
  private final Provider<ExoPlayer> playerProvider;

  public AudioPlayerService_MembersInjector(Provider<ExoPlayer> playerProvider) {
    this.playerProvider = playerProvider;
  }

  public static MembersInjector<AudioPlayerService> create(Provider<ExoPlayer> playerProvider) {
    return new AudioPlayerService_MembersInjector(playerProvider);
  }

  @Override
  public void injectMembers(AudioPlayerService instance) {
    injectPlayer(instance, playerProvider.get());
  }

  @InjectedFieldSignature("com.cybecat.music.service.AudioPlayerService.player")
  public static void injectPlayer(AudioPlayerService instance, ExoPlayer player) {
    instance.player = player;
  }
}
