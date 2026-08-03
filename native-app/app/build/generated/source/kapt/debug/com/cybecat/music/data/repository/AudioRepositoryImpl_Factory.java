package com.cybecat.music.data.repository;

import android.content.Context;
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
public final class AudioRepositoryImpl_Factory implements Factory<AudioRepositoryImpl> {
  private final Provider<Context> contextProvider;

  public AudioRepositoryImpl_Factory(Provider<Context> contextProvider) {
    this.contextProvider = contextProvider;
  }

  @Override
  public AudioRepositoryImpl get() {
    return newInstance(contextProvider.get());
  }

  public static AudioRepositoryImpl_Factory create(Provider<Context> contextProvider) {
    return new AudioRepositoryImpl_Factory(contextProvider);
  }

  public static AudioRepositoryImpl newInstance(Context context) {
    return new AudioRepositoryImpl(context);
  }
}
