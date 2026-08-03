package com.cybecat.music.di;

import android.content.Context;
import androidx.media3.exoplayer.ExoPlayer;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata("javax.inject.Singleton")
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
public final class AppModule_ProvideExoPlayerFactory implements Factory<ExoPlayer> {
  private final Provider<Context> contextProvider;

  public AppModule_ProvideExoPlayerFactory(Provider<Context> contextProvider) {
    this.contextProvider = contextProvider;
  }

  @Override
  public ExoPlayer get() {
    return provideExoPlayer(contextProvider.get());
  }

  public static AppModule_ProvideExoPlayerFactory create(Provider<Context> contextProvider) {
    return new AppModule_ProvideExoPlayerFactory(contextProvider);
  }

  public static ExoPlayer provideExoPlayer(Context context) {
    return Preconditions.checkNotNullFromProvides(AppModule.INSTANCE.provideExoPlayer(context));
  }
}
