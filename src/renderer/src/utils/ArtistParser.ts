/**
 * ArtistParser.ts
 * Separador inteligente de artistas mediante técnica de protección por marcadores (tokens)
 * y expresiones regulares, adaptado desde la arquitectura de la app Kotlin.
 */

// 1. Lista completa de excepciones protegidas que nunca deben dividirse
export const COMMA_AND_AMP_EXCEPTIONS: string[] = [
  // Con coma en el nombre
  'Tyler, The Creator',
  'Peter, Bjorn and John',

  // Con coma y «&» simultáneamente
  'Earth, Wind & Fire',
  'Crosby, Stills & Nash',
  'Crosby, Stills, Nash & Young',
  'Emerson, Lake & Palmer',
  'Blood, Sweat & Tears',
  'Dave Dee, Dozy, Beaky, Mick & Tich',

  // Rock, Pop y Alternativo con «&», «and» o «+»
  'Simon & Garfunkel',
  'Hall & Oates',
  'Mumford & Sons',
  'Echo & the Bunnymen',
  'Echo & The Bunnymen',
  'Tom Petty & the Heartbreakers',
  'Tom Petty & The Heartbreakers',
  'Tom Petty and the Heartbreakers',
  'Huey Lewis & the News',
  'Huey Lewis & The News',
  'Huey Lewis and the News',
  'Hootie & the Blowfish',
  'Hootie & The Blowfish',
  'Bob Marley & the Wailers',
  'Bob Marley & The Wailers',
  'Bob Marley and the Wailers',
  'Prince & The Revolution',
  'Prince and the Revolution',
  'Gerry & the Pacemakers',
  'Gerry & The Pacemakers',
  'Katrina & the Waves',
  'Katrina & The Waves',
  'Martha & the Vandellas',
  'Martha & The Vandellas',
  'Belle & Sebastian',
  'Angus & Julia Stone',
  'Nico & Vinz',
  'Matt & Kim',
  'Jan & Dean',
  'Chad & Jeremy',
  'Peter & Gordon',
  'Seals & Crofts',
  'Loggins & Messina',
  'Delaney & Bonnie',
  'Zager & Evans',
  'Mike & The Mechanics',
  'Mike + The Mechanics',
  'Joan Jett and the Blackhearts',
  'Joan Jett & the Blackhearts',
  'Joan Jett & The Blackhearts',
  'Florence + The Machine',
  'Florence and the Machine',
  'Marina and the Diamonds',
  'Above & Beyond',
  'The Black Eyed Peas',
  'Panic! At The Disco',
  'King Gizzard & The Lizard Wizard',
  'KC and the Sunshine Band',
  'KC & The Sunshine Band',
  'AC/DC',

  // Soul, Funk y R&B
  'Kool & the Gang',
  'Kool & The Gang',
  'Sly & the Family Stone',
  'Sly & The Family Stone',
  'Ike & Tina Turner',
  'Sam & Dave',
  'Ashford & Simpson',
  'Womack & Womack',
  'Peaches & Herb',
  'Sly & Robbie',
  'Marvin Gaye & Tammi Terrell',

  // Hip Hop
  'Eric B. & Rakim',
  'Pete Rock & CL Smooth',
  'Method Man & Redman',
  'DJ Jazzy Jeff & The Fresh Prince',
  'Macklemore & Ryan Lewis',

  // Country
  'Brooks & Dunn',
  'Big & Rich',

  // Latino y Urbano / Reggaetón
  'Wisin & Yandel',
  'Zion & Lennox',
  'Alexis & Fido',
  'Jowell & Randy',
  'Héctor & Tito',
  'Arcángel & De La Ghetto',
  'Jesse & Joy'
];

// Ordenadas de mayor a menor longitud para proteger primero las más largas
const SORTED_EXCEPTIONS = Array.from(new Set(COMMA_AND_AMP_EXCEPTIONS)).sort(
  (a, b) => b.length - a.length
);

// Nombres genéricos a descartar
const GENERIC_DISCARD = new Set([
  'unknown',
  'unknown artist',
  'desconocido',
  'desconocida',
  'artista desconocido',
  'artista desconocida',
  'varios artistas',
  'various artists',
  'various',
  'soundtrack',
  'ost'
]);

// Expresión regular de delimitadores
// Coma y punto y coma: ,, ;
// Barras: /, \
// Virgulillas: ~, ～, 〜
// Símbolos de unión: &, +
// Colaboraciones y conjunciones: and, feat., ft., featuring, with, w/, x, vs.
const DELIMITER_REGEX = /\s*(?:[,;/\\~～〜]|\s*&\s*|\s*\+\s*|\s+(?:feat\.?|ft\.?|featuring|with|w\/|vs\.?|x|and)\s+)\s*/i;

// Con grupo de captura para separar manteniendo los separadores intactos en la UI
const DELIMITER_CAPTURE_REGEX = /(\s*(?:[,;/\\~～〜]|\s*&\s*|\s*\+\s*|\s+(?:feat\.?|ft\.?|featuring|with|w\/|vs\.?|x|and)\s+)\s*)/i;

// Regex para extraer colaboraciones en el título de la canción (ej: Song (feat. Pharrell))
const TITLE_FEAT_REGEX = /[\(\[\{]\s*(?:feat\.?|ft\.?|featuring|with|w\/|vs\.?)\s+([^\)\]\}]+)[\)\]\}]/gi;

export interface ArtistSegment {
  type: 'artist' | 'separator';
  name?: string;
  raw: string;
}

// Caché en memoria equivalente a ConcurrentHashMap
const cache = new Map<string, string[]>();

export class ArtistParser {
  /**
   * Reemplaza preventivamente las excepciones por tokens seguros
   */
  private static protectTokens(input: string): { protectedText: string; tokens: Map<string, string> } {
    let text = input;
    const tokens = new Map<string, string>();
    let counter = 0;

    for (const exc of SORTED_EXCEPTIONS) {
      const escaped = exc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9])(${escaped})([^a-zA-Z0-9]|$)`, 'gi');
      text = text.replace(regex, (_match, prefix, captured, suffix) => {
        const token = `__ARTIST_EXC_${counter++}__`;
        tokens.set(token, captured);
        return `${prefix}${token}${suffix}`;
      });
    }

    return { protectedText: text, tokens };
  }

  /**
   * Restaura los tokens protegidos a sus nombres originales
   */
  private static restoreTokens(text: string, tokens: Map<string, string>): string {
    let result = text;
    tokens.forEach((originalName, token) => {
      result = result.split(token).join(originalName);
    });
    return result;
  }

  /**
   * Limpia un nombre de artista eliminando comillas, corchetes y espacios residuales
   */
  private static cleanArtistName(name: string): string {
    return name
      .trim()
      .replace(/^["'“”«»()\[\]{}]+|["'“”«»()\[\]{}]+$/g, '')
      .trim();
  }

  /**
   * Extrae artistas de una cadena simple
   */
  public static parseArtistString(rawArtist: string): string[] {
    if (!rawArtist || !rawArtist.trim()) return [];

    const { protectedText, tokens } = this.protectTokens(rawArtist);
    const parts = protectedText.split(DELIMITER_REGEX);
    const list: string[] = [];

    for (const part of parts) {
      const restored = this.restoreTokens(part, tokens);
      const cleaned = this.cleanArtistName(restored);

      if (cleaned && !GENERIC_DISCARD.has(cleaned.toLowerCase())) {
        if (!list.some(existing => existing.toLowerCase() === cleaned.toLowerCase())) {
          list.push(cleaned);
        }
      }
    }

    return list;
  }

  /**
   * Extrae colaboraciones del título de la canción si las tiene
   */
  public static extractFeaturedFromTitle(title?: string | null): string[] {
    if (!title || !title.trim()) return [];

    const list: string[] = [];
    const matches = title.matchAll(TITLE_FEAT_REGEX);

    for (const match of matches) {
      const featString = match[1];
      if (featString) {
        const parsed = this.parseArtistString(featString);
        for (const artist of parsed) {
          if (!list.some(existing => existing.toLowerCase() === artist.toLowerCase())) {
            list.push(artist);
          }
        }
      }
    }

    return list;
  }

  /**
   * Separa y consolida todos los artistas de una canción (etiqueta de artista + título)
   * Utiliza caché en memoria para procesamiento instantáneo.
   */
  public static parseArtists(rawArtist?: string | null, songTitle?: string | null): string[] {
    const key = `${rawArtist || ''}:::${songTitle || ''}`;
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result: string[] = [];

    if (rawArtist) {
      const fromArtist = this.parseArtistString(rawArtist);
      for (const a of fromArtist) {
        if (!result.some(existing => existing.toLowerCase() === a.toLowerCase())) {
          result.push(a);
        }
      }
    }

    if (songTitle) {
      const fromTitle = this.extractFeaturedFromTitle(songTitle);
      for (const a of fromTitle) {
        if (!result.some(existing => existing.toLowerCase() === a.toLowerCase())) {
          result.push(a);
        }
      }
    }

    cache.set(key, result);
    return result;
  }

  /**
   * Divide la cadena de artistas preservando los separadores originales intactos para la interfaz gráfica.
   * Esto permite mostrar el texto exactamente como en los metadatos pero haciendo que cada artista
   * sea un enlace interactivo individual.
   */
  public static parseWithSeparators(rawArtist?: string | null): ArtistSegment[] {
    if (!rawArtist || !rawArtist.trim()) return [];

    const { protectedText, tokens } = this.protectTokens(rawArtist);
    const parts = protectedText.split(DELIMITER_CAPTURE_REGEX);
    const segments: ArtistSegment[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      // Las partes en posiciones impares corresponden a los delimitadores capturados
      if (i % 2 === 1) {
        segments.push({ type: 'separator', raw: part });
      } else {
        const restored = this.restoreTokens(part, tokens);
        const cleaned = this.cleanArtistName(restored);

        if (cleaned && !GENERIC_DISCARD.has(cleaned.toLowerCase())) {
          segments.push({
            type: 'artist',
            name: cleaned,
            raw: restored
          });
        } else if (restored.trim()) {
          segments.push({
            type: 'separator',
            raw: restored
          });
        }
      }
    }

    return segments;
  }
}

export default ArtistParser;
