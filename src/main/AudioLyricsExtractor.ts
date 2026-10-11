import fs from 'fs';
import path from 'path';
import type * as mm from 'music-metadata';

export interface ExtractedLyrics {
  lyrics: string | null;
  isSynced: boolean;
  source: 'embedded' | 'sylt' | 'txxx' | 'vorbis' | 'mp4' | 'sidecar_lrc' | 'sidecar_sub' | 'binary' | 'none';
}

/**
 * Motor de extracción de letras en capas con escaneo binario directo y fallbacks inteligentes.
 * Basado en la arquitectura de AudioLyricsExtractor de la aplicación Kotlin.
 */
export class AudioLyricsExtractor {
  private static readonly MAX_HEADER_SCAN_BYTES = 2 * 1024 * 1024; // 2MB

  /**
   * Decodificación inteligente de texto para marcos ID3v2 respetando delimitadores nulos,
   * BOM (Byte Order Mark) y fallbacks a Windows-1252 / ISO-8859-1 para caracteres en español.
   */
  public static decodeTextSmart(buffer: Buffer, encodingByte: number): string {
    if (!buffer || buffer.length === 0) return '';

    try {
      if (encodingByte === 0) {
        // ISO-8859-1 / Windows-1252
        return this.decodeWindows1252(buffer);
      } else if (encodingByte === 1) {
        // UTF-16 con BOM
        if (buffer.length >= 2) {
          const bom0 = buffer[0];
          const bom1 = buffer[1];
          if (bom0 === 0xff && bom1 === 0xfe) {
            return buffer.slice(2).toString('utf16le');
          } else if (bom0 === 0xfe && bom1 === 0xff) {
            // Big-endian: intercambiar bytes para utf16le de Node
            const swapped = Buffer.alloc(buffer.length - 2);
            for (let i = 2; i < buffer.length - 1; i += 2) {
              swapped[i - 2] = buffer[i + 1];
              swapped[i - 1] = buffer[i];
            }
            return swapped.toString('utf16le');
          }
        }
        return buffer.toString('utf16le');
      } else if (encodingByte === 2) {
        // UTF-16BE sin BOM
        const swapped = Buffer.alloc(buffer.length);
        for (let i = 0; i < buffer.length - 1; i += 2) {
          swapped[i] = buffer[i + 1];
          swapped[i + 1] = buffer[i];
        }
        return swapped.toString('utf16le');
      } else if (encodingByte === 3) {
        // UTF-8
        return buffer.toString('utf8');
      }
    } catch {
      // Fallback
    }

    return this.decodeWindows1252(buffer);
  }

  /**
   * Decodifica Windows-1252 / ISO-8859-1 preservando caracteres especiales y acentos en español
   */
  private static decodeWindows1252(buffer: Buffer): string {
    // Caracteres específicos de Windows-1252 (0x80 - 0x9F)
    const win1252Map: Record<number, string> = {
      0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
      0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘',
      0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜',
      0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ'
    };

    let result = '';
    for (let i = 0; i < buffer.length; i++) {
      const b = buffer[i];
      if (b === 0) continue; // Ignorar nulos residuales
      if (b in win1252Map) {
        result += win1252Map[b];
      } else {
        result += String.fromCharCode(b);
      }
    }
    return result;
  }

  /**
   * Convierte eventos del marco binario SYLT al formato estándar LRC [mm:ss.xx]
   */
  public static convertSyltToLrc(syltValue: any): string | null {
    if (!syltValue) return null;

    // Si viene como array de objetos desde music-metadata
    if (Array.isArray(syltValue)) {
      let lrc = '';
      for (const item of syltValue) {
        if (item && item.text !== undefined && item.timestamp !== undefined) {
          const t = Math.max(0, item.timestamp);
          const m = Math.floor(t / 60000);
          const s = Math.floor((t % 60000) / 1000);
          const ms = Math.floor((t % 1000) / 10);
          lrc += `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}] ${item.text.trim()}\n`;
        }
      }
      return lrc.trim() || null;
    }

    // Si viene como objeto con syncText
    if (typeof syltValue === 'object' && Array.isArray(syltValue.syncText)) {
      return this.convertSyltToLrc(syltValue.syncText);
    }

    // Si viene como Buffer binario directo
    if (Buffer.isBuffer(syltValue) && syltValue.length > 6) {
      try {
        const encodingByte = syltValue[0];
        // Saltamos 3 bytes idioma, 1 byte time format, 1 byte content type
        let offset = 6;
        // Saltar descriptor terminado en nulo
        if (encodingByte === 1 || encodingByte === 2) {
          while (offset < syltValue.length - 1) {
            if (syltValue[offset] === 0 && syltValue[offset + 1] === 0) {
              offset += 2;
              break;
            }
            offset += 2;
          }
        } else {
          while (offset < syltValue.length) {
            if (syltValue[offset] === 0) {
              offset += 1;
              break;
            }
            offset += 1;
          }
        }

        let lrc = '';
        while (offset < syltValue.length) {
          // Leer texto terminado en nulo
          const textStart = offset;
          let textEnd = textStart;
          if (encodingByte === 1 || encodingByte === 2) {
            while (textEnd < syltValue.length - 1) {
              if (syltValue[textEnd] === 0 && syltValue[textEnd + 1] === 0) break;
              textEnd += 2;
            }
            const textBuf = syltValue.slice(textStart, textEnd);
            offset = textEnd + 2;
            if (offset + 4 <= syltValue.length) {
              const timestamp = syltValue.readUInt32BE(offset);
              offset += 4;
              const text = this.decodeTextSmart(textBuf, encodingByte).trim();
              const m = Math.floor(timestamp / 60000);
              const s = Math.floor((timestamp % 60000) / 1000);
              const ms = Math.floor((timestamp % 1000) / 10);
              lrc += `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}] ${text}\n`;
            } else break;
          } else {
            while (textEnd < syltValue.length) {
              if (syltValue[textEnd] === 0) break;
              textEnd += 1;
            }
            const textBuf = syltValue.slice(textStart, textEnd);
            offset = textEnd + 1;
            if (offset + 4 <= syltValue.length) {
              const timestamp = syltValue.readUInt32BE(offset);
              offset += 4;
              const text = this.decodeTextSmart(textBuf, encodingByte).trim();
              const m = Math.floor(timestamp / 60000);
              const s = Math.floor((timestamp % 60000) / 1000);
              const ms = Math.floor((timestamp % 1000) / 10);
              lrc += `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}] ${text}\n`;
            } else break;
          }
        }
        return lrc.trim() || null;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Convierte subtítulos .srt o .vtt a formato sincronizado LRC [mm:ss.xx]
   */
  public static convertSrtOrVttToLrc(content: string): string | null {
    if (!content || !content.trim()) return null;

    // Normalizar saltos de línea
    const cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanContent.split('\n');

    // Regex para marcas de tiempo SRT (00:01:23,456 --> 00:01:28,789)
    // y VTT (00:01:23.456 --> 00:01:28.789 o 01:23.456 --> 01:28.789)
    const timeRegex = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,\.](\d{2,3})\s*-->\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,\.](\d{2,3})/;

    let result = '';
    let currentTimestamp: string | null = null;
    let currentText = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === 'WEBVTT' || /^\d+$/.test(line)) {
        if (currentTimestamp && currentText.trim()) {
          result += `${currentTimestamp} ${currentText.trim()}\n`;
          currentTimestamp = null;
          currentText = '';
        }
        continue;
      }

      const match = line.match(timeRegex);
      if (match) {
        if (currentTimestamp && currentText.trim()) {
          result += `${currentTimestamp} ${currentText.trim()}\n`;
        }

        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        const msRaw = match[4];
        const ms = msRaw.length === 3 ? Math.floor(parseInt(msRaw, 10) / 10) : parseInt(msRaw, 10);

        const totalMinutes = hours * 60 + minutes;
        currentTimestamp = `[${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}]`;
        currentText = '';
      } else if (currentTimestamp) {
        // Limpiar etiquetas HTML de subtítulos como <b>, <i>, <font color="...">, etc.
        const cleanedLine = line.replace(/<[^>]*>/g, '').trim();
        if (cleanedLine) {
          currentText += (currentText ? ' ' : '') + cleanedLine;
        }
      }
    }

    if (currentTimestamp && currentText.trim()) {
      result += `${currentTimestamp} ${currentText.trim()}\n`;
    }

    return result.trim() || null;
  }

  /**
   * Extrae letras de los metadatos parseados por music-metadata inspeccionando
   * exhaustivamente todas las etiquetas nativas (TXXX, COMM, USLT, SYLT, Vorbis, ©lyr, etc.).
   */
  public static extractFromMusicMetadata(metadata: mm.IAudioMetadata): ExtractedLyrics | null {
    if (!metadata) return null;

    let candidateSynced: string | null = null;
    let candidateUnsynced: string | null = null;

    // 1. Revisión de SYLT en ID3v2
    if (metadata.native) {
      for (const tagType of ['ID3v2.4', 'ID3v2.3', 'ID3v2', 'ID3v2.2']) {
        const id3Tags = metadata.native[tagType];
        if (Array.isArray(id3Tags)) {
          // SYLT (sincronizada ID3v2.3/2.4) o SLT (ID3v2.2)
          const syltTag = id3Tags.find(t => t.id === 'SYLT' || t.id === 'SLT');
          if (syltTag && syltTag.value) {
            const converted = this.convertSyltToLrc(syltTag.value);
            if (converted) {
              candidateSynced = converted;
              break;
            }
          }
        }
      }
    }

    // 2. Revisión de marcos TXXX, COMM, USLT, ULT en ID3
    if (metadata.native) {
      for (const tagType in metadata.native) {
        const tags = metadata.native[tagType];
        if (!Array.isArray(tags)) continue;

        for (const tag of tags) {
          const id = (tag.id || '').toUpperCase();
          const val: any = tag.value;

          // A) USLT o ULT (etiqueta oficial de letra)
          if (id === 'USLT' || id === 'ULT') {
            const text = typeof val === 'string' ? val : (val && typeof val === 'object' ? (val.text || '') : '');
            if (text && text.trim()) {
              if (text.includes('[') && text.includes(']')) {
                if (!candidateSynced) candidateSynced = text.trim();
              } else {
                if (!candidateUnsynced) candidateUnsynced = text.trim();
              }
            }
          }

          // B) TXXX o TXX (texto de usuario personalizado: Foobar2000, Mp3tag, MusicBee, etc.)
          if (id === 'TXXX' || id === 'TXX') {
            if (val && typeof val === 'object') {
              const desc = (val.description || '').toUpperCase().trim();
              const text = (val.text || '').trim();
              if (text) {
                const isLyricDesc = [
                  'LYRICS', 'SYNCEDLYRICS', 'UNSYNCEDLYRICS',
                  'SYNCED LYRICS', 'UNSYNCED LYRICS', 'LRC',
                  'LYRICS_SYNCED', 'LYRICS_UNSYNCED', 'TEXT'
                ].includes(desc);

                if (isLyricDesc) {
                  if (text.includes('[') && text.includes(']')) {
                    if (!candidateSynced) candidateSynced = text;
                  } else {
                    if (!candidateUnsynced) candidateUnsynced = text;
                  }
                }
              }
            }
          }

          // C) COMM o COM (comentarios con letras incrustadas)
          if (id === 'COMM' || id === 'COM') {
            if (val && typeof val === 'object') {
              const desc = (val.description || '').toUpperCase().trim();
              const text = (val.text || '').trim();
              if (text && (desc.includes('LYRIC') || desc.includes('LRC') || (text.includes('[') && text.includes(':')))) {
                if (text.includes('[') && text.includes(']')) {
                  if (!candidateSynced) candidateSynced = text;
                } else if (!candidateUnsynced) {
                  candidateUnsynced = text;
                }
              }
            }
          }

          // D) Vorbis Comments (FLAC / OGG / Opus)
          if (tagType.toLowerCase().includes('vorbis') || tagType.toLowerCase().includes('flac')) {
            const keyUpper = id.replace(/\s+/g, '').toUpperCase();
            const textVal = typeof val === 'string' ? val : (Array.isArray(val) ? val.join('\n') : String(val || ''));
            const text = textVal.trim();
            if (text) {
              const isVorbisLyricsKey = [
                'LYRICS', 'UNSYNCEDLYRICS', 'UNSYNCED LYRICS',
                'SYNCEDLYRICS', 'SYNCED LYRICS', 'LRC', 'TEXT'
              ].some(k => keyUpper.includes(k.replace(/\s+/g, '')));

              if (isVorbisLyricsKey) {
                if (text.includes('[') && text.includes(']')) {
                  if (!candidateSynced) candidateSynced = text;
                } else if (!candidateUnsynced) {
                  candidateUnsynced = text;
                }
              }
            }
          }

          // E) MP4 / iTunes (átomo ©lyr)
          if (id === '©lyr' || id === '©LYR' || id.includes('LYRICS')) {
            const textVal = typeof val === 'string' ? val : (Array.isArray(val) ? val.join('\n') : String(val || ''));
            const text = textVal.trim();
            if (text) {
              if (text.includes('[') && text.includes(']')) {
                if (!candidateSynced) candidateSynced = text;
              } else if (!candidateUnsynced) {
                candidateUnsynced = text;
              }
            }
          }
        }
      }
    }

    // 3. Revisión en metadata.common.lyrics
    if (metadata.common && metadata.common.lyrics && metadata.common.lyrics.length > 0) {
      for (const item of metadata.common.lyrics) {
        if (!item) continue;
        const text = (typeof item === 'string' ? item : (item as any).text || '').trim();
        if (text) {
          if (text.includes('[') && text.includes(']')) {
            if (!candidateSynced) candidateSynced = text;
          } else if (!candidateUnsynced) {
            candidateUnsynced = text;
          }
        }
      }
    }

    if (candidateSynced) {
      return {
        lyrics: candidateSynced,
        isSynced: true,
        source: 'embedded'
      };
    }

    if (candidateUnsynced) {
      return {
        lyrics: candidateUnsynced,
        isSynced: false,
        source: 'embedded'
      };
    }

    return null;
  }

  /**
   * Escaneo binario directo en memoria del encabezado del archivo (máximo 2MB)
   * Extrae letras directamente de archivos FLAC, MP3 (ID3v2.2, v2.3, v2.4), MP4/M4A y Ogg/Opus
   * sin depender de librerías externas.
   */
  public static async scanBinaryDirect(filePath: string): Promise<ExtractedLyrics | null> {
    let fd: fs.promises.FileHandle | null = null;
    try {
      const stat = await fs.promises.stat(filePath);
      const readSize = Math.min(stat.size, this.MAX_HEADER_SCAN_BYTES);
      if (readSize < 10) return null;

      fd = await fs.promises.open(filePath, 'r');
      const buffer = Buffer.alloc(readSize);
      await fd.read(buffer, 0, readSize, 0);

      // 1. FLAC: Magic bytes 'fLaC' (0x66 0x4C 0x61 0x43)
      if (buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === 'fLaC') {
        const flacResult = this.scanFlacVorbisComments(buffer);
        if (flacResult) return flacResult;
      }

      // 2. ID3v2: Magic bytes 'ID3' (0x49 0x44 0x33)
      if (buffer.length >= 10 && buffer.slice(0, 3).toString('ascii') === 'ID3') {
        const id3Result = this.scanId3v2Frames(buffer);
        if (id3Result) return id3Result;
      }

      // 3. Ogg / Opus: Magic bytes 'OggS' (0x4F 0x67 0x67 0x53)
      if (buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === 'OggS') {
        const oggResult = this.scanOggOpusComments(buffer);
        if (oggResult) return oggResult;
      }

      // 4. MP4 / M4A: Átomo ©lyr
      const mp4Result = this.scanMp4LyrAtom(buffer);
      if (mp4Result) return mp4Result;

    } catch {
      // Ignorar errores de lectura binaria
    } finally {
      if (fd) {
        try { await fd.close(); } catch {}
      }
    }

    return null;
  }

  /**
   * Escaneo binario de bloques de metadatos VORBIS_COMMENT en archivos FLAC
   */
  private static scanFlacVorbisComments(buffer: Buffer): ExtractedLyrics | null {
    let offset = 4; // Después de 'fLaC'

    while (offset + 4 < buffer.length) {
      const headerByte = buffer[offset];
      const isLast = (headerByte & 0x80) !== 0;
      const blockType = headerByte & 0x7F;
      const length = (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3];
      offset += 4;

      if (offset + length > buffer.length) break;

      // Bloque tipo 4 = VORBIS_COMMENT
      if (blockType === 4) {
        const blockBuf = buffer.slice(offset, offset + length);
        return this.parseVorbisCommentBlock(blockBuf);
      }

      if (isLast) break;
      offset += length;
    }

    return null;
  }

  /**
   * Parsea un bloque de comentarios Vorbis (FLAC u Ogg) extrayendo LYRICS, SYNCEDLYRICS, LRC, etc.
   */
  private static parseVorbisCommentBlock(block: Buffer): ExtractedLyrics | null {
    if (block.length < 8) return null;

    let offset = 0;
    const vendorLength = block.readUInt32LE(offset);
    offset += 4 + vendorLength;
    if (offset + 4 > block.length) return null;

    const userCommentCount = block.readUInt32LE(offset);
    offset += 4;

    let candidateSynced: string | null = null;
    let candidateUnsynced: string | null = null;

    for (let i = 0; i < userCommentCount && offset + 4 <= block.length; i++) {
      const commentLen = block.readUInt32LE(offset);
      offset += 4;
      if (offset + commentLen > block.length) break;

      const commentStr = block.toString('utf8', offset, offset + commentLen);
      offset += commentLen;

      const eqIdx = commentStr.indexOf('=');
      if (eqIdx !== -1) {
        const fieldName = commentStr.substring(0, eqIdx).toUpperCase().trim();
        const fieldValue = commentStr.substring(eqIdx + 1).trim();

        const isLyricsKey = [
          'LYRICS', 'UNSYNCEDLYRICS', 'UNSYNCED LYRICS',
          'SYNCEDLYRICS', 'SYNCED LYRICS', 'LRC', 'TEXT'
        ].includes(fieldName);

        if (isLyricsKey && fieldValue) {
          if (fieldValue.includes('[') && fieldValue.includes(']')) {
            if (!candidateSynced) candidateSynced = fieldValue;
          } else if (!candidateUnsynced) {
            candidateUnsynced = fieldValue;
          }
        }
      }
    }

    if (candidateSynced) {
      return { lyrics: candidateSynced, isSynced: true, source: 'vorbis' };
    }
    if (candidateUnsynced) {
      return { lyrics: candidateUnsynced, isSynced: false, source: 'vorbis' };
    }

    return null;
  }

  /**
   * Escaneo binario de páginas Ogg para paquetes OpusTags o Vorbis Comments
   */
  private static scanOggOpusComments(buffer: Buffer): ExtractedLyrics | null {
    // Buscar la firma 'OpusTags' (0x4F 0x70 0x75 0x73 0x54 0x61 0x67 0x73) o '\x03vorbis'
    const opusTagsSignature = Buffer.from('OpusTags', 'ascii');
    const idx = buffer.indexOf(opusTagsSignature);
    if (idx !== -1 && idx + 8 < buffer.length) {
      return this.parseVorbisCommentBlock(buffer.slice(idx + 8));
    }

    const vorbisSignature = Buffer.from('\x03vorbis', 'ascii');
    const vIdx = buffer.indexOf(vorbisSignature);
    if (vIdx !== -1 && vIdx + 7 < buffer.length) {
      return this.parseVorbisCommentBlock(buffer.slice(vIdx + 7));
    }

    return null;
  }

  /**
   * Escaneo binario directo de marcos ID3v2 (ID3v2.2, ID3v2.3, ID3v2.4)
   */
  private static scanId3v2Frames(buffer: Buffer): ExtractedLyrics | null {
    if (buffer.length < 10) return null;

    const majorVersion = buffer[3]; // 2 = ID3v2.2, 3 = ID3v2.3, 4 = ID3v2.4
    // Tamaño de la etiqueta (syncsafe integer de 4 bytes)
    const tagSize = ((buffer[6] & 0x7F) << 21) |
                    ((buffer[7] & 0x7F) << 14) |
                    ((buffer[8] & 0x7F) << 7) |
                    (buffer[9] & 0x7F);

    const maxLimit = Math.min(buffer.length, tagSize + 10);
    let offset = 10;

    let candidateSynced: string | null = null;
    let candidateUnsynced: string | null = null;

    if (majorVersion === 2) {
      // ID3v2.2: ID de 3 bytes y tamaño de 3 bytes
      while (offset + 6 < maxLimit) {
        const frameId = buffer.toString('ascii', offset, offset + 3);
        const frameSize = (buffer[offset + 3] << 16) | (buffer[offset + 4] << 8) | buffer[offset + 5];
        offset += 6;
        if (frameSize <= 0 || offset + frameSize > maxLimit) break;

        const frameData = buffer.slice(offset, offset + frameSize);
        offset += frameSize;

        if (frameId === 'ULT') {
          const encoding = frameData[0];
          // 1 byte enc, 3 bytes lang
          let descEnd = 4;
          while (descEnd < frameData.length && frameData[descEnd] !== 0) descEnd++;
          const text = this.decodeTextSmart(frameData.slice(descEnd + 1), encoding).trim();
          if (text) {
            if (text.includes('[') && text.includes(']')) candidateSynced = text;
            else if (!candidateUnsynced) candidateUnsynced = text;
          }
        } else if (frameId === 'SLT') {
          const syltLrc = this.convertSyltToLrc(frameData);
          if (syltLrc) candidateSynced = syltLrc;
        } else if (frameId === 'TXX') {
          const encoding = frameData[0];
          let descEnd = 1;
          while (descEnd < frameData.length && frameData[descEnd] !== 0) descEnd++;
          const desc = this.decodeTextSmart(frameData.slice(1, descEnd), encoding).toUpperCase().trim();
          const text = this.decodeTextSmart(frameData.slice(descEnd + 1), encoding).trim();
          if (['LYRICS', 'LRC', 'SYNCEDLYRICS', 'UNSYNCEDLYRICS'].includes(desc) && text) {
            if (text.includes('[') && text.includes(']')) candidateSynced = text;
            else if (!candidateUnsynced) candidateUnsynced = text;
          }
        }
      }
    } else {
      // ID3v2.3 y ID3v2.4: ID de 4 bytes y tamaño de 4 bytes
      while (offset + 10 < maxLimit) {
        const frameId = buffer.toString('ascii', offset, offset + 4);
        if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

        let frameSize = 0;
        if (majorVersion === 4) {
          // Syncsafe integer en ID3v2.4
          frameSize = ((buffer[offset + 4] & 0x7F) << 21) |
                      ((buffer[offset + 5] & 0x7F) << 14) |
                      ((buffer[offset + 6] & 0x7F) << 7) |
                      (buffer[offset + 7] & 0x7F);
        } else {
          // Entero de 32 bits estándar en ID3v2.3
          frameSize = buffer.readUInt32BE(offset + 4);
        }

        offset += 10; // 4 ID + 4 Size + 2 Flags
        if (frameSize <= 0 || offset + frameSize > maxLimit) break;

        const frameData = buffer.slice(offset, offset + frameSize);
        offset += frameSize;

        // A) USLT (Unsynchronised lyrics)
        if (frameId === 'USLT' && frameData.length > 4) {
          const encoding = frameData[0];
          let descEnd = 4;
          if (encoding === 1 || encoding === 2) {
            while (descEnd < frameData.length - 1) {
              if (frameData[descEnd] === 0 && frameData[descEnd + 1] === 0) {
                descEnd += 2;
                break;
              }
              descEnd += 2;
            }
          } else {
            while (descEnd < frameData.length) {
              if (frameData[descEnd] === 0) {
                descEnd += 1;
                break;
              }
              descEnd += 1;
            }
          }
          const text = this.decodeTextSmart(frameData.slice(descEnd), encoding).trim();
          if (text) {
            if (text.includes('[') && text.includes(']')) {
              if (!candidateSynced) candidateSynced = text;
            } else if (!candidateUnsynced) {
              candidateUnsynced = text;
            }
          }
        }

        // B) SYLT (Synchronised lyrics)
        if (frameId === 'SYLT') {
          const syltLrc = this.convertSyltToLrc(frameData);
          if (syltLrc && !candidateSynced) {
            candidateSynced = syltLrc;
          }
        }

        // C) TXXX (Marcos de usuario)
        if (frameId === 'TXXX' && frameData.length > 1) {
          const encoding = frameData[0];
          let descEnd = 1;
          if (encoding === 1 || encoding === 2) {
            while (descEnd < frameData.length - 1) {
              if (frameData[descEnd] === 0 && frameData[descEnd + 1] === 0) {
                descEnd += 2;
                break;
              }
              descEnd += 2;
            }
          } else {
            while (descEnd < frameData.length) {
              if (frameData[descEnd] === 0) {
                descEnd += 1;
                break;
              }
              descEnd += 1;
            }
          }

          const desc = this.decodeTextSmart(frameData.slice(1, descEnd), encoding).toUpperCase().trim();
          const text = this.decodeTextSmart(frameData.slice(descEnd), encoding).trim();

          const isLyricDesc = [
            'LYRICS', 'SYNCEDLYRICS', 'UNSYNCEDLYRICS',
            'SYNCED LYRICS', 'UNSYNCED LYRICS', 'LRC',
            'LYRICS_SYNCED', 'LYRICS_UNSYNCED', 'TEXT'
          ].includes(desc);

          if (isLyricDesc && text) {
            if (text.includes('[') && text.includes(']')) {
              if (!candidateSynced) candidateSynced = text;
            } else if (!candidateUnsynced) {
              candidateUnsynced = text;
            }
          }
        }

        // D) COMM (Comentarios)
        if (frameId === 'COMM' && frameData.length > 4) {
          const encoding = frameData[0];
          let descEnd = 4;
          if (encoding === 1 || encoding === 2) {
            while (descEnd < frameData.length - 1) {
              if (frameData[descEnd] === 0 && frameData[descEnd + 1] === 0) {
                descEnd += 2;
                break;
              }
              descEnd += 2;
            }
          } else {
            while (descEnd < frameData.length) {
              if (frameData[descEnd] === 0) {
                descEnd += 1;
                break;
              }
              descEnd += 1;
            }
          }

          const desc = this.decodeTextSmart(frameData.slice(4, descEnd), encoding).toUpperCase().trim();
          const text = this.decodeTextSmart(frameData.slice(descEnd), encoding).trim();

          if (text && (desc.includes('LYRIC') || desc.includes('LRC') || (text.includes('[') && text.includes(':')))) {
            if (text.includes('[') && text.includes(']')) {
              if (!candidateSynced) candidateSynced = text;
            } else if (!candidateUnsynced) {
              candidateUnsynced = text;
            }
          }
        }
      }
    }

    if (candidateSynced) {
      return { lyrics: candidateSynced, isSynced: true, source: 'binary' };
    }
    if (candidateUnsynced) {
      return { lyrics: candidateUnsynced, isSynced: false, source: 'binary' };
    }

    return null;
  }

  /**
   * Escaneo binario de átomo ©lyr en archivos MP4 / M4A / AAC
   */
  private static scanMp4LyrAtom(buffer: Buffer): ExtractedLyrics | null {
    // Byte sequence de ©lyr: 0xA9 0x6C 0x79 0x72
    const lyrSeq = Buffer.from([0xa9, 0x6c, 0x79, 0x72]);
    const idx = buffer.indexOf(lyrSeq);
    if (idx !== -1 && idx + 8 < buffer.length) {
      // Buscar el átomo 'data' dentro de los siguientes 32 bytes
      const searchWindow = buffer.slice(idx, Math.min(buffer.length, idx + 64));
      const dataSeq = Buffer.from('data', 'ascii');
      const dataIdx = searchWindow.indexOf(dataSeq);
      if (dataIdx !== -1) {
        const absoluteDataIdx = idx + dataIdx;
        const atomLen = buffer.readUInt32BE(absoluteDataIdx - 4);
        if (atomLen > 16 && absoluteDataIdx + atomLen - 4 <= buffer.length) {
          // Los primeros 8 bytes después de 'data' son flags/type (ej: 0x00000001 0x00000000 para texto UTF-8)
          const textBuf = buffer.slice(absoluteDataIdx + 12, absoluteDataIdx + atomLen - 4);
          const text = textBuf.toString('utf8').trim();
          if (text) {
            return {
              lyrics: text,
              isSynced: text.includes('[') && text.includes(']'),
              source: 'mp4'
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Busca archivos de letras externos (.lrc, .txt, .srt, .vtt) en la misma carpeta o en Lyrics/
   */
  public static async findExternalLyrics(filePath: string): Promise<ExtractedLyrics | null> {
    try {
      const dir = path.dirname(filePath);
      const baseName = path.basename(filePath, path.extname(filePath));

      const candidateDirs = [dir, path.join(dir, 'Lyrics'), path.join(dir, 'lyrics')];

      // 1. Priorizar archivos .lrc sincronizados
      for (const d of candidateDirs) {
        const lrcPath = path.join(d, `${baseName}.lrc`);
        try {
          const stat = await fs.promises.stat(lrcPath);
          if (stat.isFile()) {
            const content = await fs.promises.readFile(lrcPath, 'utf8');
            if (content && content.trim()) {
              return {
                lyrics: content.trim(),
                isSynced: content.includes('[') && content.includes(']'),
                source: 'sidecar_lrc'
              };
            }
          }
        } catch {}
      }

      // 2. Archivos de subtítulos .srt y .vtt (con conversión automática a LRC sincronizado)
      for (const d of candidateDirs) {
        for (const ext of ['.srt', '.vtt']) {
          const subPath = path.join(d, `${baseName}${ext}`);
          try {
            const stat = await fs.promises.stat(subPath);
            if (stat.isFile()) {
              const content = await fs.promises.readFile(subPath, 'utf8');
              const converted = this.convertSrtOrVttToLrc(content);
              if (converted) {
                return {
                  lyrics: converted,
                  isSynced: true,
                  source: 'sidecar_sub'
                };
              }
            }
          } catch {}
        }
      }

      // 3. Archivos .txt (solo si contienen estructura de letra)
      for (const d of candidateDirs) {
        const txtPath = path.join(d, `${baseName}.txt`);
        try {
          const stat = await fs.promises.stat(txtPath);
          if (stat.isFile()) {
            const content = await fs.promises.readFile(txtPath, 'utf8');
            if (content && content.trim().length > 10) {
              const isSynced = content.includes('[') && content.includes(']');
              return {
                lyrics: content.trim(),
                isSynced,
                source: 'sidecar_lrc'
              };
            }
          }
        } catch {}
      }

    } catch {}

    return null;
  }

  /**
   * Método principal de extracción de letras:
   * Aplica la estrategia en capas coordinando archivos externos, tags nativos y escaneo binario.
   */
  public static async extractLyrics(
    filePath: string,
    parsedMetadata?: mm.IAudioMetadata | null
  ): Promise<ExtractedLyrics | null> {
    if (!filePath) return null;

    // Capa 1: Archivo .lrc local sincronizado (prioridad máxima si existe)
    const externalResult = await this.findExternalLyrics(filePath);
    if (externalResult && externalResult.isSynced) {
      return externalResult;
    }

    // Capa 2: Extracción exhaustiva de metadatos nativos si están disponibles
    if (parsedMetadata) {
      const metaResult = this.extractFromMusicMetadata(parsedMetadata);
      if (metaResult && metaResult.isSynced) {
        return metaResult;
      }
      if (metaResult && !externalResult) {
        // Guardamos como candidato no sincronizado si no hay externo
        return metaResult;
      }
    }

    // Capa 3: Escaneo binario directo en memoria (FLAC Vorbis, ID3v2.2/2.3/2.4, Ogg/Opus, MP4)
    const binaryResult = await this.scanBinaryDirect(filePath);
    if (binaryResult && binaryResult.isSynced) {
      return binaryResult;
    }

    // Capa 4: Si encontramos externo no sincronizado
    if (externalResult) {
      return externalResult;
    }

    // Capa 5: Resultado binario no sincronizado
    if (binaryResult) {
      return binaryResult;
    }

    // Capa 6: Resultado de metadatos no sincronizado
    if (parsedMetadata) {
      const metaResult = this.extractFromMusicMetadata(parsedMetadata);
      if (metaResult) return metaResult;
    }

    return null;
  }

  /**
   * Verificación rápida de existencia de letras para escaneo inicial de biblioteca
   */
  public static async hasLyrics(
    filePath: string,
    parsedMetadata?: mm.IAudioMetadata | null
  ): Promise<boolean> {
    // 1. Verificación rápida de archivo externo
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    for (const ext of ['.lrc', '.srt', '.vtt', '.txt']) {
      if (fs.existsSync(path.join(dir, `${baseName}${ext}`))) return true;
      if (fs.existsSync(path.join(dir, 'Lyrics', `${baseName}${ext}`))) return true;
      if (fs.existsSync(path.join(dir, 'lyrics', `${baseName}${ext}`))) return true;
    }

    // 2. Verificación en metadatos comunes o nativos
    if (parsedMetadata) {
      const metaResult = this.extractFromMusicMetadata(parsedMetadata);
      if (metaResult && metaResult.lyrics) return true;
    }

    // 3. Verificación binaria rápida
    const binaryResult = await this.scanBinaryDirect(filePath);
    if (binaryResult && binaryResult.lyrics) return true;

    return false;
  }
}

export default AudioLyricsExtractor;
