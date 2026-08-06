import { ipcMain, dialog } from 'electron';
import { execFile } from 'child_process';
import util from 'util';

const execFilePromise = util.promisify(execFile);
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import * as mm from 'music-metadata';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { app } from 'electron';
import { translate } from '@vitalets/google-translate-api';

let isTranslationBlocked = false;

// Set up ffmpeg paths
const ffmpegPath = app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe') : ffmpegStatic;
const ffprobePath = app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe') : ffprobeStatic.path;

ffmpeg.setFfmpegPath(ffmpegPath!);
ffmpeg.setFfprobePath(ffprobePath);

async function extractFfmpegMetadata(filePath: string): Promise<any> {
  try {
    const { stdout } = await execFilePromise(ffprobePath, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath], { maxBuffer: 10 * 1024 * 1024 });
    const metadata = JSON.parse(stdout);
    
    const formatTags = metadata.format?.tags || {};
    let streamTags = {};
    if (metadata.streams && metadata.streams.length > 0) {
       metadata.streams.forEach(s => {
          if (s.tags) streamTags = { ...streamTags, ...s.tags };
       });
    }
    const tags = { ...formatTags, ...streamTags };
    
    const getTag = (key: string) => {
       const lowerKey = key.toLowerCase();
       for (const k in tags) {
          if (k.toLowerCase() === lowerKey) return tags[k];
       }
       return null;
    };

    let finalTitle = getTag('title');
    let finalArtist = getTag('album_artist') || getTag('albumartist') || getTag('artist');
    
    if (finalArtist && finalTitle && finalArtist.includes(' - ')) {
       const parts = finalArtist.split(' - ');
       if (parts[0].toLowerCase().trim() === finalTitle.toLowerCase().trim() || 
           finalTitle.toLowerCase().trim() === 'youtube') {
          finalArtist = parts[0].trim();
          finalTitle = parts.slice(1).join(' - ').trim();
       } else if (!finalTitle.includes(' - ')) {
           finalTitle = parts.slice(1).join(' - ').trim();
           finalArtist = parts[0].trim();
       }
    } else if (finalTitle && finalTitle.includes(' - ')) {
       const parts = finalTitle.split(' - ');
       if (!finalArtist || finalArtist === 'Desconocido' || finalArtist === finalTitle || finalArtist.toLowerCase().trim() === parts[0].toLowerCase().trim()) {
          finalArtist = parts[0].trim();
          finalTitle = parts.slice(1).join(' - ').trim();
       }
    }

    let foundLyrics: string | null = null;
    let foundCover: string | null = null;
    for (const k in tags) {
       const lowerK = k.toLowerCase();
       if (lowerK.includes('lyric') || lowerK.includes('sylt') || lowerK.includes('uslt')) {
          foundLyrics = tags[k];
       }
       if (lowerK === 'metadata_block_picture') {
          try {
            const base64Data = tags[k];
            const buffer = Buffer.from(base64Data, 'base64');
            let offset = 4;
            const mimeLen = buffer.readUInt32BE(offset);
            offset += 4;
            const mimeType = buffer.toString('utf8', offset, offset + mimeLen);
            offset += mimeLen;
            const descLen = buffer.readUInt32BE(offset);
            offset += 4 + descLen;
            offset += 16;
            const picLen = buffer.readUInt32BE(offset);
            offset += 4;
            const pictureData = buffer.slice(offset, offset + picLen);
            foundCover = `data:${mimeType};base64,${pictureData.toString('base64')}`;
          } catch(e) {}
        } else if (lowerK === 'coverart') {
          foundCover = `data:image/jpeg;base64,${tags[k]}`;
        }
    }

    if (!foundCover) {
       try {
         const { stdout } = await execFilePromise(ffmpegPath!, ['-v', 'quiet', '-i', filePath, '-an', '-vcodec', 'mjpeg', '-f', 'image2pipe', '-vframes', '1', '-'], { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
         if (stdout && stdout.length > 0) {
            foundCover = `data:image/jpeg;base64,${stdout.toString('base64')}`;
         }
       } catch (e) {}
    }

    return {
      title: finalTitle,
      artist: finalArtist,
      album: getTag('album'),
      track: getTag('track'),
      year: getTag('date') || getTag('year') || getTag('tyer') || getTag('tdat') || getTag('tdrc'),
      lyrics: foundLyrics || getTag('text'),
      cover_base64: foundCover
    };
  } catch (err) {
    return null;
  }
}

async function extractFfmpegCover(filePath: string): Promise<string | null> {
  const meta = await extractFfmpegMetadata(filePath);
  if (meta && meta.cover_base64) {
    return meta.cover_base64;
  }
  return null;
}

class LRUCache<K, V> {
  private max: number;
  private cache: Map<K, V>;
  constructor(max = 500) {
    this.max = max;
    this.cache = new Map();
  }
  get(key: K) {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }
  set(key: K, val: V) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, val);
  }
}

const coverCache = new LRUCache<string, string | null>(500);
const pendingCovers = new Map<string, Promise<string | null>>();

  const coversDir = path.join(app.getPath('userData'), 'covers');
  try {
    if (!existsSync(coversDir)) {
      fs.mkdir(coversDir, { recursive: true }).catch(() => {});
    }
  } catch(e) {}

export function setupIpc() {
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
  });

  ipcMain.handle('dialog:openImageFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
    });
    if (canceled || filePaths.length === 0) {
      return null;
    } else {
      const sourcePath = filePaths[0];
      const coversDir = path.join(app.getPath('userData'), 'playlist_covers');
      if (!existsSync(coversDir)) {
        await fs.mkdir(coversDir, { recursive: true });
      }
      const ext = path.extname(sourcePath);
      const filename = `${crypto.randomUUID()}${ext}`;
      const destPath = path.join(coversDir, filename);
      
      await fs.copyFile(sourcePath, destPath);
      
      return `file:///${destPath.replace(/\\/g, '/')}`;
    }
  });

  ipcMain.handle('fs:readMusicFiles', async (_, folderPath: string) => {
    if (!folderPath) return [];
    try {
      const files = await getAudioFilesRecursive(folderPath);
      return files;
    } catch (err) {
      console.error('Error reading music files:', err);
      return [];
    }
  });

  ipcMain.handle('fs:getCover', async (_, filePath: string) => {
    const cached = coverCache.get(filePath);
    if (cached !== undefined) return cached;
    
    const hash = crypto.createHash('md5').update(filePath).digest('hex');
    const cachedFilePath = path.join(coversDir, `${hash}.jpg`);

    if (existsSync(cachedFilePath)) {
      const fileUrl = pathToFileURL(cachedFilePath).href;
      coverCache.set(filePath, fileUrl);
      return fileUrl;
    }

    if (pendingCovers.has(filePath)) {
      return pendingCovers.get(filePath);
    }
    
    const promise = (async () => {
      try {
        let coverBase64: string | null = null;
        try {
          const metadata = await mm.parseFile(filePath, { duration: false });
          if (metadata.common.picture && metadata.common.picture.length > 0) {
            const picture = metadata.common.picture[0];
            coverBase64 = `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}`;
          }
        } catch(e) {}
        
        if (!coverBase64 && filePath.toLowerCase().endsWith('.opus')) {
           coverBase64 = await extractFfmpegCover(filePath);
        }
        
        if (!coverBase64) {
          const dir = path.dirname(filePath);
          const coverNames = ['cover.jpg', 'cover.png', 'folder.jpg', 'folder.png', 'front.jpg'];
          for (const c of coverNames) {
            const cPath = path.join(dir, c);
            try {
              const stat = await fs.stat(cPath);
              if (stat.isFile()) {
                const data = await fs.readFile(cPath);
                const ext = path.extname(c).slice(1).toLowerCase();
                coverBase64 = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${data.toString('base64')}`;
                break;
              }
            } catch(e) {}
          }
        }
        

        
        if (coverBase64) {
          try {
            if (coverBase64.startsWith('data:')) {
              const base64Data = coverBase64.replace(/^data:image\/\w+;base64,/, "");
              const buffer = Buffer.from(base64Data, 'base64');
              await fs.writeFile(cachedFilePath, buffer);
            } else if (coverBase64.startsWith('http')) {
              const response = await fetch(coverBase64);
              const arrayBuffer = await response.arrayBuffer();
              await fs.writeFile(cachedFilePath, Buffer.from(arrayBuffer));
            }
            coverBase64 = pathToFileURL(cachedFilePath).href;
          } catch (e) {
            console.error("Failed to write persistent cover cache", e);
          }
        }

        coverCache.set(filePath, coverBase64);
        pendingCovers.delete(filePath);
        return coverBase64;
      } catch (e) {
        coverCache.set(filePath, null);
        pendingCovers.delete(filePath);
        return null;
      }
    })();
    
    pendingCovers.set(filePath, promise);
    return promise;
  });

  ipcMain.handle('fs:getMetadata', async (_, filePath: string) => {
    try {
      let ffMeta: any = null;
      let title = path.basename(filePath, path.extname(filePath));
      let artist = 'Desconocido';
      let album = 'Desconocido';
      let lyrics: any = null;
      let coverBase64: string | null = null;
      let duration = 0;
      let format = 'unknown';
      let bitrate = 0;
      let sampleRate = 0;
      let year = '';

      try {
        const metadata = await mm.parseFile(filePath, { duration: true });
        duration = metadata.format.duration || 0;
        format = metadata.format.container || 'unknown';
        if (filePath.toLowerCase().endsWith('.opus')) format = 'Opus';
        else if (filePath.toLowerCase().endsWith('.ogg')) format = 'Ogg';
        
        bitrate = metadata.format.bitrate || 0;
        sampleRate = metadata.format.sampleRate || 0;

        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const picture = metadata.common.picture[0];
          coverBase64 = `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}`;
        }
        coverCache.set(filePath, coverBase64);
        
        lyrics = metadata.common.lyrics?.length ? metadata.common.lyrics[0] : null;
        
        // Attempt to extract SYLT (Synchronized Lyrics) or USLT from native ID3 tags
        if (metadata.native && metadata.native['ID3v2']) {
          const id3v2 = metadata.native['ID3v2'];
          const syltTag = id3v2.find((t: any) => t.id === 'SYLT');
          if (syltTag && syltTag.value && Array.isArray(syltTag.value)) {
            let lrc = '';
            for (const line of syltTag.value) {
              if (line.text && line.timestamp !== undefined) {
                 const t = line.timestamp; 
                 const m = Math.floor(t / 60000);
                 const s = Math.floor((t % 60000) / 1000);
                 const ms = Math.floor((t % 1000) / 10);
                 lrc += `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}] ${line.text}\n`;
              }
            }
            if (lrc) lyrics = lrc.trim();
          } else if (!lyrics) {
            const usltTag = id3v2.find((t: any) => t.id === 'USLT');
            if (usltTag && usltTag.value && (usltTag.value as any).text) {
               lyrics = (usltTag.value as any).text;
            }
          }
        }

        // Generic fallback for Vorbis (Opus/FLAC/Ogg) and others
        if (!lyrics && metadata.native) {
          for (const tagType in metadata.native) {
            const tags = metadata.native[tagType];
            if (Array.isArray(tags)) {
              const lyricsTag = tags.find((t: any) => 
                t.id && typeof t.id === 'string' && 
                (t.id.toLowerCase().includes('lyric') || t.id.toLowerCase().includes('sylt') || t.id.toLowerCase().includes('uslt'))
              );
              if (lyricsTag && lyricsTag.value) {
                if (typeof lyricsTag.value === 'string') {
                  lyrics = lyricsTag.value;
                } else if (Array.isArray(lyricsTag.value) && typeof lyricsTag.value[0] === 'string') {
                  lyrics = lyricsTag.value.join('\n');
                } else {
                  lyrics = String(lyricsTag.value);
                }
                break;
              }
            }
          }
        }
        
        // Check for sidecar .lrc file if no embedded lyrics were found
        if (!lyrics) {
          try {
            const lrcPath = filePath.replace(/\.[^/.]+$/, "") + ".lrc";
            if (existsSync(lrcPath)) {
              lyrics = await fs.readFile(lrcPath, 'utf8');
            }
          } catch (e) {
            // Ignore if file doesn't exist or can't be read
          }
        }
        
        title = metadata.common.title || title;
        artist = metadata.common.albumartist || metadata.common.artist || artist;
        album = metadata.common.album || album;
        year = metadata.common.year?.toString() || metadata.common.date || year;
      } catch(e) {}

      if (filePath.toLowerCase().endsWith('.opus') || filePath.toLowerCase().endsWith('.ogg')) {
         ffMeta = await extractFfmpegMetadata(filePath);
         if (ffMeta) {
           if (ffMeta.title) title = ffMeta.title;
           if (ffMeta.artist) artist = ffMeta.artist;
           if (ffMeta.album) album = ffMeta.album;
           if (ffMeta.year) year = ffMeta.year;
           if (ffMeta.lyrics) lyrics = ffMeta.lyrics;
         }
      }

      // Fallback: look for a local .lrc file
      if (!lyrics || typeof lyrics !== 'string' || !lyrics.includes('[')) {
        try {
          const lrcPath = filePath.substring(0, filePath.lastIndexOf('.')) + '.lrc';
          const lrcContent = await fs.readFile(lrcPath, 'utf8');
          if (lrcContent && lrcContent.trim().length > 0) {
            lyrics = lrcContent;
          }
        } catch (e) {}
      }

      if (title === path.basename(filePath, path.extname(filePath))) {
          const nameWithoutExt = path.basename(filePath, path.extname(filePath));
          if (nameWithoutExt.includes(' - ')) {
              const parts = nameWithoutExt.split(' - ');
              artist = parts[0].trim();
              title = parts.slice(1).join(' - ').trim();
          }
      }

      if (!lyrics) {
        try {
          const dir = path.dirname(filePath);
          const base = path.basename(filePath, path.extname(filePath));
          const extensions = ['.lrc', '.txt', '.srt', '.vtt'];
          for (const ext of extensions) {
              const extPath = path.join(dir, base + ext);
              try {
                  const stat = await fs.stat(extPath);
                  if (stat.isFile()) {
                      lyrics = await fs.readFile(extPath, 'utf8');
                      break;
                  }
              } catch(e) {}
          }
        } catch(e) {}
      }
      
      return {
        title,
        artist,
        album,
        duration,
        cover: coverBase64,
        lyrics,
        format,
        bitrate,
        sampleRate,
        year
      };
    } catch (err) {
      let ffMeta: any = null;
      if (filePath.toLowerCase().endsWith('.opus') || filePath.toLowerCase().endsWith('.ogg')) {
         ffMeta = await extractFfmpegMetadata(filePath);
      }
      return {
        title: ffMeta?.title || path.basename(filePath, path.extname(filePath)),
        artist: ffMeta?.artist || 'Desconocido',
        album: ffMeta?.album || 'Desconocido',
        duration: 0,
        cover: ffMeta?.cover_base64 || null,
        lyrics: ffMeta?.lyrics || null,
        format: filePath.toLowerCase().endsWith('.opus') ? 'Opus' : filePath.toLowerCase().endsWith('.ogg') ? 'Ogg' : path.extname(filePath).replace('.', ''),
        bitrate: 0,
        sampleRate: 0
      };
    }
  });

  ipcMain.handle('api:getArtistCache', async () => {
    const cachePath = path.join(app.getPath('userData'), 'artistImagesCache_v2.json');
    try {
      const data = await fs.readFile(cachePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  });

  ipcMain.handle('api:getArtistImage', async (_, artistName: string, sampleSongPath?: string) => {
    if (!artistName || artistName === 'Desconocido') return null;
    const cachePath = path.join(app.getPath('userData'), 'artistImagesCache_v2.json');
    let cache: Record<string, string | null> = {};
    
    try {
      const data = await fs.readFile(cachePath, 'utf8');
      cache = JSON.parse(data);
    } catch (e) {
      // Ignore if cache doesn't exist
    }

    const normalizedName = artistName.trim().toLowerCase();

    // Check local files first if sampleSongPath is provided
    if (sampleSongPath) {
      try {
        const dir = path.dirname(sampleSongPath);
        const safeName = artistName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const possibleNames = ['artist.jpg', 'artist.png', 'artist.jpeg', 'artist.webp', `${safeName}.jpg`, `${safeName}.png`, `${safeName}.jpeg`, `${safeName}.webp`, `${artistName}.jpg`, `${artistName}.png`, `${artistName}.jpeg`, `${artistName}.webp`];
        for (const pName of possibleNames) {
          const pPath = path.join(dir, pName);
          if (existsSync(pPath)) {
            const fileUrl = `file:///${pPath.replace(/\\/g, '/')}`;
            cache[normalizedName] = fileUrl;
            await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
            return fileUrl;
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    
    // Check if we already tried fetching this artist
    if (cache.hasOwnProperty(normalizedName)) {
      return cache[normalizedName];
    }

    // Delay to be polite to APIs ONLY when actually making a network request
    await new Promise(r => setTimeout(r, 300));
    
    let networkErrorCount = 0;

    const downloadImage = async (url: string, artistName: string) => {
      try {
        const artistDir = path.join(app.getPath('userData'), 'artist_images');
        await fs.mkdir(artistDir, { recursive: true });
        const safeName = artistName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        let ext = '.jpg';
        try {
           ext = path.extname(new URL(url).pathname) || '.jpg';
        } catch(e) {}
        const filePath = path.join(artistDir, `${safeName}${ext}`);
        
        const res = await fetch(url);
        if (!res.ok) return url;
        const arrayBuffer = await res.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(arrayBuffer));
        return `file:///${filePath.replace(/\\/g, '/')}`;
      } catch (e) {
        return url;
      }
    };

    try {
      // Query Deezer API
      const response = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.data && data.data.length > 0) {
          // Sort by number of fans to get the most popular artist, prioritizing exact name matches
          const bestMatch = data.data.sort((a: any, b: any) => {
             const aExact = (a.name || '').toLowerCase() === (artistName || '').toLowerCase() ? 1 : 0;
             const bExact = (b.name || '').toLowerCase() === (artistName || '').toLowerCase() ? 1 : 0;
             if (aExact !== bExact) return bExact - aExact;
             return (b.nb_fan || 0) - (a.nb_fan || 0);
          })[0];
          
          if (bestMatch && bestMatch.picture_xl) {
            let imageUrl = bestMatch.picture_xl;
            imageUrl = await downloadImage(imageUrl, artistName);
            cache[normalizedName] = imageUrl;
            await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
            return imageUrl;
          }
        }
      }
    } catch (e) {
      networkErrorCount++;
      console.error('Error fetching artist image from Deezer for', artistName, e);
    }

    try {
      // Fallback: Query TheAudioDB API
      const response = await fetch(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(artistName)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.artists && data.artists.length > 0 && data.artists[0].strArtistThumb) {
          let imageUrl = data.artists[0].strArtistThumb;
          imageUrl = await downloadImage(imageUrl, artistName);
          cache[normalizedName] = imageUrl;
          await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
          return imageUrl;
        }
      }
    } catch (e) {
      networkErrorCount++;
      console.error('Error fetching artist image from AudioDB for', artistName, e);
    }

    try {
      // Third Fallback: iTunes Search API (use album cover of most popular track)
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicTrack&limit=5`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.results && data.results.length > 0) {
           // Try to find exact artist match
           let bestResult = data.results.find((r: any) => (r.artistName || '').toLowerCase() === (artistName || '').toLowerCase()) || data.results[0];
           if (bestResult.artworkUrl100) {
             let imageUrl = bestResult.artworkUrl100.replace('100x100bb', '600x600bb');
             imageUrl = await downloadImage(imageUrl, artistName);
             cache[normalizedName] = imageUrl;
             await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
             return imageUrl;
           }
        }
      }
    } catch (e) {
      networkErrorCount++;
      console.error('Error fetching artist image from iTunes for', artistName, e);
    }

    // Only cache null if it wasn't a complete network failure
    if (networkErrorCount < 3) {
      cache[normalizedName] = null;
      await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
    } else {
      console.warn(`Network failed for ${artistName}, not caching null so it can be retried later.`);
    }
    
    return null;
  });

  ipcMain.handle('api:translateLyrics', async (event, songId: string, lines: string[], targetLang: string = 'es') => {
    if (!songId || !lines || lines.length === 0) return [];
    
    const translationsDir = path.join(app.getPath('userData'), 'lyrics_translations');
    try {
      if (!existsSync(translationsDir)) {
        await fs.mkdir(translationsDir, { recursive: true });
      }
    } catch(e) {}

    const cacheFile = path.join(translationsDir, `${songId}_${targetLang}.json`);
    
    // Check cache
    try {
      if (existsSync(cacheFile)) {
        const data = await fs.readFile(cacheFile, 'utf8');
        return JSON.parse(data);
      }
    } catch(e) {}

    // Translate
    try {
      const fullText = lines.join('\n');
      const res = await translate(fullText, { to: targetLang });
      
      let translatedLines = res.text.split('\n');
      
      // If detected language is the same as the target language OR the translation is exactly the same text
      const isSameLanguage = (res as any).from?.language?.iso?.toLowerCase() === targetLang.toLowerCase() || (res as any).raw?.src?.toLowerCase() === targetLang.toLowerCase();
      const isSameText = fullText.replace(/\s+/g, '').toLowerCase() === res.text.replace(/\s+/g, '').toLowerCase();

      if (isSameLanguage || isSameText) {
        translatedLines = [];
      }
      
      // Cache it
      await fs.writeFile(cacheFile, JSON.stringify(translatedLines), 'utf8');
      // Success! If it was previously blocked, notify restoration.
      if (isTranslationBlocked) {
        isTranslationBlocked = false;
        event.sender.send('translation-status', 'restored');
      }

      return translatedLines;
    } catch (e: any) {
      console.error('Translation error', e);
      if (e.name === 'TooManyRequestsError' || (e.message && e.message.includes('Too Many Requests'))) {
        if (!isTranslationBlocked) {
          isTranslationBlocked = true;
          event.sender.send('translation-status', 'blocked');
        }
      }
      return [];
    }
  });

  // Dynamic UI Translation
  ipcMain.handle('api:getAlbumInfo', async (_, artistName: string, albumName: string, targetLang: string = 'es') => {
    try {
      const albumInfoDir = path.join(app.getPath('userData'), 'album_info');
      if (!existsSync(albumInfoDir)) {
        await fs.mkdir(albumInfoDir, { recursive: true });
      }
      const safeArtist = artistName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const safeAlbum = albumName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const cachePath = path.join(albumInfoDir, `${safeArtist}_${safeAlbum}_${targetLang}.json`);

      if (existsSync(cachePath)) {
        const data = await fs.readFile(cachePath, 'utf8');
        return JSON.parse(data).info;
      }

      const headers = { 'User-Agent': 'FuzionPlayer/1.0' };

      // Fetch from Wikipedia API (English first for better coverage)
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent('intitle:"' + albumName + '" album')}&utf8=&format=json`;
      const searchRes = await fetch(searchUrl, { headers });
      const searchData = await searchRes.json();
      
      let info = `Este álbum ofrece un viaje sonoro increíble, mezclando estilos únicos con la firma inconfundible de ${artistName}. Es una pieza esencial para cualquier coleccionista.`; // Default fallback
      let foundInfo = false;

      if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
        const pageId = searchData.query.search[0].pageid;
        const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&utf8=&format=json`;
        const extractRes = await fetch(extractUrl, { headers });
        const extractData = await extractRes.json();
        
        const pages = extractData.query?.pages;
        if (pages && pages[pageId] && pages[pageId].extract) {
           info = pages[pageId].extract;
           foundInfo = true;
           // Limit to first ~800 chars to keep it clean, cut at last full stop
           if (info.length > 800) {
               const cutInfo = info.substring(0, 800);
               const lastStop = cutInfo.lastIndexOf('.');
               info = lastStop > 0 ? cutInfo.substring(0, lastStop + 1) : cutInfo + '...';
           }
        }
      }

      // Translate if target language is not English
      if (foundInfo && targetLang !== 'en') {
        try {
          const transRes = await translate(info, { to: targetLang });
          info = transRes.text;
        } catch(e) {
          console.error('Error translating album info:', e);
        }
      } else if (!foundInfo && targetLang !== 'es') {
        try {
          const transRes = await translate(info, { to: targetLang });
          info = transRes.text;
        } catch(e) {}
      }

      await fs.writeFile(cachePath, JSON.stringify({ info }));
      return info;
    } catch (error) {
      console.error('Error fetching album info:', error);
      return `Este álbum ofrece un viaje sonoro increíble, mezclando estilos únicos con la firma inconfundible de ${artistName}. Es una pieza esencial para cualquier coleccionista.`;
    }
  });

  // Dynamic UI Translation
  ipcMain.handle('api:getTranslatedUI', async (_, langCode: string) => {
    const translationsDir = path.join(app.getPath('userData'), 'ui_translations');
    const cacheFile = path.join(translationsDir, `${langCode}.json`);
    try {
      if (existsSync(cacheFile)) {
        const data = await fs.readFile(cacheFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (e) {}
    return null;
  });

  ipcMain.handle('api:translateUI', async (event, langCode: string, baseDictionary: Record<string, any>) => {
    const translationsDir = path.join(app.getPath('userData'), 'ui_translations');
    try {
      if (!existsSync(translationsDir)) {
        await fs.mkdir(translationsDir, { recursive: true });
      }
    } catch (e) {}

    const cacheFile = path.join(translationsDir, `${langCode}.json`);
    
    // Flatten dictionary
    const flattenObj = (ob: any): Record<string, string> => {
      let result: Record<string, string> = {};
      for (const i in ob) {
        if ((typeof ob[i]) === 'object' && !Array.isArray(ob[i])) {
          const temp = flattenObj(ob[i]);
          for (const j in temp) {
            result[i + '.' + j] = temp[j];
          }
        } else {
          result[i] = ob[i];
        }
      }
      return result;
    };

    const unflattenObj = (ob: Record<string, string>): any => {
      let result: any = {};
      for (const i in ob) {
        const keys = i.split('.');
        keys.reduce((acc, key, index) => {
          if (index === keys.length - 1) {
            acc[key] = ob[i];
          } else {
            acc[key] = acc[key] || {};
          }
          return acc[key];
        }, result);
      }
      return result;
    };

    const flatDict = flattenObj(baseDictionary);
    const keys = Object.keys(flatDict);
    let valuesToTranslate: string[] = [];
    let keysToTranslate: string[] = [];
    let existingFlatDict: Record<string, string> = {};

    try {
      if (existsSync(cacheFile)) {
        const data = await fs.readFile(cacheFile, 'utf8');
        const parsed = JSON.parse(data);
        existingFlatDict = flattenObj(parsed);
      }
    } catch (e) {}

    keys.forEach(k => {
      if (!(k in existingFlatDict)) {
        keysToTranslate.push(k);
        valuesToTranslate.push(flatDict[k]);
      }
    });

    if (keysToTranslate.length === 0) {
      return unflattenObj(existingFlatDict);
    }

    let translatedValues: string[] = [];
    const chunkSize = 40;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      for (let i = 0; i < valuesToTranslate.length; i += chunkSize) {
        const chunk = valuesToTranslate.slice(i, i + chunkSize);
        const fullText = chunk.join('\n');
        const res = await translate(fullText, { to: langCode });
        translatedValues = translatedValues.concat(res.text.split('\n'));
        
        if (i + chunkSize < valuesToTranslate.length) {
          await delay(1000); // 1 second delay between chunks to avoid rate limit
        }
      }
      
      // Success! If it was previously blocked, notify restoration.
      if (isTranslationBlocked) {
        isTranslationBlocked = false;
        event.sender.send('translation-status', 'restored');
      }
    } catch (e: any) {
      console.error('UI Translation error', e);
      if (e.name === 'TooManyRequestsError' || (e.message && e.message.includes('Too Many Requests'))) {
        if (!isTranslationBlocked) {
          isTranslationBlocked = true;
          event.sender.send('translation-status', 'blocked');
        }
      }
      // Continue to save whatever we successfully translated so far
    }

    // Reconstruct
    keysToTranslate.forEach((k, idx) => {
      if (translatedValues[idx]) {
        existingFlatDict[k] = translatedValues[idx].trim();
      }
    });

    const translatedDict = unflattenObj(existingFlatDict);

    // Cache (only if we got at least some translations or if it was already populated)
    if (translatedValues.length > 0 || Object.keys(existingFlatDict).length > 0) {
      await fs.writeFile(cacheFile, JSON.stringify(translatedDict, null, 2), 'utf8');
    }
    
    return translatedDict;
  });
}

async function getAudioFilesRecursive(dir: string): Promise<any[]> {
  let results: any[] = [];
  try {
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of list) {
      const fullPath = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        const subFiles = await getAudioFilesRecursive(fullPath);
        results = results.concat(subFiles);
      } else {
        const ext = path.extname(fullPath).toLowerCase();
        if (['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.wma', '.opus', '.m4b', '.alac', '.aiff', '.ape'].includes(ext)) {
          let title = dirent.name;
          let artist = 'Desconocido';
          let album = 'Desconocido';
          let trackNumber = 0;
          let hasLyrics = false;
          let year = '';
          try {
            const meta = await mm.parseFile(fullPath, { skipCovers: true, duration: false });
            if (meta.common.title) title = meta.common.title;
            if (meta.common.albumartist) artist = meta.common.albumartist;
            else if (meta.common.artist) artist = meta.common.artist;
            if (meta.common.album) album = meta.common.album;
            if (meta.common.track.no) trackNumber = meta.common.track.no;
            year = meta.common.year?.toString() || meta.common.date || year;

            if (meta.common.lyrics && meta.common.lyrics.length > 0) {
              hasLyrics = true;
            } else if (meta.native) {
              for (const tagType in meta.native) {
                const tags = meta.native[tagType];
                if (Array.isArray(tags)) {
                  const lyricsTag = tags.find((t: any) => 
                    t.id && typeof t.id === 'string' && 
                    (t.id.toLowerCase().includes('lyric') || t.id.toLowerCase().includes('sylt') || t.id.toLowerCase().includes('uslt'))
                  );
                  if (lyricsTag && lyricsTag.value) {
                    hasLyrics = true;
                    break;
                  }
                }
              }
            }
          } catch(e) {}
          
          if ((!hasLyrics || album === 'Desconocido' || artist === 'Desconocido') && (ext === '.opus' || ext === '.ogg')) {
            try {
               const ffMeta = await extractFfmpegMetadata(fullPath);
               if (ffMeta) {
                 if (ffMeta.title) title = ffMeta.title;
                 if (ffMeta.artist) artist = ffMeta.artist;
                 if (ffMeta.album) album = ffMeta.album;
                 if (ffMeta.track) trackNumber = parseInt(ffMeta.track) || 0;
                 if (ffMeta.lyrics) hasLyrics = true;
               }
            } catch(e) {}
          }
          
          if (title === dirent.name) {
            const nameWithoutExt = path.basename(dirent.name, ext);
            if (nameWithoutExt.includes(' - ')) {
              const parts = nameWithoutExt.split(' - ');
              artist = parts[0].trim();
              title = parts.slice(1).join(' - ').trim();
            } else {
              title = nameWithoutExt;
            }
          }
          
          const folderName = path.basename(dir);
          if (title && artist && title.toLowerCase() === folderName.toLowerCase() && artist.toLowerCase() !== folderName.toLowerCase()) {
            const temp = title;
            title = artist;
            artist = temp;
          }
          
          if (!hasLyrics) {
            try {
              const base = path.basename(fullPath, path.extname(fullPath));
              const extensions = ['.lrc', '.txt', '.srt', '.vtt'];
              for (const ext of extensions) {
                const extPath = path.join(dir, base + ext);
                try {
                  const stat = await fs.stat(extPath);
                  if (stat.isFile()) {
                    hasLyrics = true;
                    break;
                  }
                } catch(e) {}
              }
            } catch (e) {}
          }
          
          results.push({
            id: generateId(fullPath),
            uri: 'file:///' + encodeURI(fullPath.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/\?/g, '%3F'),
            filename: dirent.name,
            title,
            artist,
            album,
            trackNumber,
            year,
            folder: folderName,
            path: fullPath,
            hasLyrics,
            cover: null
          });
        }
      }
    }
  } catch (e) {
    console.error('Error traversing directory', dir, e);
  }
  return results;
}

function generateId(filePath: string): string {
  let hash = 5381;
  for (let i = 0; i < filePath.length; i++) {
    hash = ((hash << 5) + hash) + filePath.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
