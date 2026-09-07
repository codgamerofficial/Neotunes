/**
 * Normalizer utility for global music search queries and metadata.
 * Preserves native Unicode scripts (Bengali, Hindi/Devanagari, Punjabi, Tamil, Telugu, Arabic, CJK, etc.)
 * while removing diacritics for Latin strings and eliminating extraneous noise.
 */

// Decode HTML Entities from API titles (e.g. &quot; -> ", &#39; -> ')
export function decodeHTMLEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Normalizes query string for robust comparison:
 * 1. Decodes HTML entities
 * 2. Decomposes Latin accents using NFKD (e.g. é -> e) without destroying non-Latin characters
 * 3. Lowercases
 * 4. Preserves alphanumeric characters, spaces, and all major global scripts
 * 5. Collapses whitespace
 */
export function normalizeString(str: string): string {
  if (!str) return '';

  const decoded = decodeHTMLEntities(str);

  // Decompose combining marks for Latin characters (e.g., Beyoncé -> Beyonce)
  // Non-combining marks for Indian/Arabic/CJK scripts are kept intact
  const latinNormalized = decoded.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  return latinNormalized
    .toLowerCase()
    // Preserves:
    // \w, \s
    // Latin-1 & Latin Extended (\u00C0-\u024F)
    // Devanagari (Hindi, Marathi, Sanskrit, Nepali): \u0900-\u097F
    // Bengali & Assamese: \u0980-\u09FF
    // Gurmukhi (Punjabi): \u0A00-\u0A7F
    // Gujarati: \u0A80-\u0AFF
    // Oriya: \u0B00-\u0B7F
    // Tamil: \u0B80-\u0BFF
    // Telugu: \u0C00-\u0C7F
    // Kannada: \u0C80-\u0CFF
    // Malayalam: \u0D00-\u0D7F
    // Sinhala: \u0D80-\u0DFF
    // Thai: \u0E00-\u0E7F
    // Arabic & Persian: \u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF
    // Cyrillic (Russian, Ukrainian, etc.): \u0400-\u04FF
    // CJK Unified Ideographs: \u4E00-\u9FFF
    // Hiragana & Katakana: \u3040-\u30FF
    // Hangul (Korean): \uAC00-\uD7AF, \u1100-\u11FF
    .replace(
      /[^\w\s\u00C0-\u024F\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1100-\u11FF]/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cleans track titles by stripping common release noise, bracketed audio descriptors,
 * without removing critical version modifiers like (Acoustic), (Live), (Remix).
 */
export function cleanTitle(title: string): string {
  if (!title) return 'NeoTunes Track';
  const decoded = decodeHTMLEntities(title);

  return decoded
    .replace(/\b(official\s+(?:audio|video|music\s+video|lyric\s+video)|full\s+(?:song|video)|visualizer|hd|4k|mp3|out\s+now)\b/gi, '')
    .replace(/\s*\[.*?\]/g, '') // remove brackets like [Official Video]
    .replace(/\s*\(\s*\)/g, '') // remove empty parentheses left over like ()
    .split('|')[0]
    .split('//')[0]
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cleans query noise (e.g., "official audio", "official video", "mp3 download")
 */
export function cleanSearchNoise(query: string): string {
  if (!query) return '';
  return query
    .replace(
      /\b(official\s+audio|official\s+video|official\s+music\s+video|full\s+video|full\s+song|lyric\s+video|lyrics\s+video|lyrics|audio|video|hd|4k|mp3|remastered|out\s+now|download)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes a string into distinct searchable words/terms.
 */
export function tokenizeString(str: string): string[] {
  const norm = normalizeString(str);
  if (!norm) return [];
  return norm.split(/\s+/).filter(t => t.length > 0);
}
