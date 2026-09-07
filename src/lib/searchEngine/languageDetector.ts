/**
 * Script and Language Detection for Global Music Search Queries.
 */

export interface DetectedLanguage {
  language: string;
  script: string;
  confidence: number;
}

export function detectLanguage(query: string): DetectedLanguage {
  if (!query) {
    return { language: 'en', script: 'Latin', confidence: 1.0 };
  }

  // 1. Script checks based on Unicode blocks
  if (/[\u0980-\u09FF]/.test(query)) {
    return { language: 'bn', script: 'Bengali', confidence: 0.98 };
  }
  if (/[\u0900-\u097F]/.test(query)) {
    // Devanagari script: predominantly Hindi, Marathi, Nepali, Sanskrit
    const isMarathi = /\b(gaani|lavani|geete|marathi)\b/i.test(query);
    return { language: isMarathi ? 'mr' : 'hi', script: 'Devanagari', confidence: 0.95 };
  }
  if (/[\u0A00-\u0A7F]/.test(query)) {
    return { language: 'pa', script: 'Gurmukhi', confidence: 0.98 };
  }
  if (/[\u0B80-\u0BFF]/.test(query)) {
    return { language: 'ta', script: 'Tamil', confidence: 0.98 };
  }
  if (/[\u0C00-\u0C7F]/.test(query)) {
    return { language: 'te', script: 'Telugu', confidence: 0.98 };
  }
  if (/[\u0C80-\u0CFF]/.test(query)) {
    return { language: 'kn', script: 'Kannada', confidence: 0.98 };
  }
  if (/[\u0D00-\u0D7F]/.test(query)) {
    return { language: 'ml', script: 'Malayalam', confidence: 0.98 };
  }
  if (/[\u0A80-\u0AFF]/.test(query)) {
    return { language: 'gu', script: 'Gujarati', confidence: 0.98 };
  }
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(query)) {
    const isUrdu = /\b(ghazal|qawwali|shair|urdu)\b/i.test(query);
    return { language: isUrdu ? 'ur' : 'ar', script: 'Arabic', confidence: 0.95 };
  }
  if (/[\u0400-\u04FF]/.test(query)) {
    return { language: 'ru', script: 'Cyrillic', confidence: 0.98 };
  }
  if (/[\u3040-\u30FF]/.test(query)) {
    return { language: 'ja', script: 'Japanese', confidence: 0.98 };
  }
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(query)) {
    return { language: 'ko', script: 'Korean', confidence: 0.98 };
  }
  if (/[\u4E00-\u9FFF]/.test(query)) {
    return { language: 'zh', script: 'Han', confidence: 0.95 };
  }

  // 2. Keyword/Phonetic hints for Latin Romanized Indic/Global queries
  const lower = query.toLowerCase();

  // Bengali Romanized
  if (
    /\b(bengali|bangla|rabindra|anupam|nachiketa|moushumi|hemanta|manna dey|bose bose|tumi|tomar|amake|amar|bhalobashi|valobasha|kothao|emon)\b/i.test(
      lower
    )
  ) {
    return { language: 'bn', script: 'Latin-Bengali', confidence: 0.9 };
  }

  // Hindi Romanized
  if (
    /\b(hindi|bollywood|arijit|pritam|shreya|kishore|rafi|lata|kesariya|tum hi ho|apna bana le|channa mereya|tere vaaste|pyaar|dil|ishq|mohabbat|gaana)\b/i.test(
      lower
    )
  ) {
    return { language: 'hi', script: 'Latin-Hindi', confidence: 0.9 };
  }

  // Punjabi Romanized
  if (
    /\b(punjabi|diljit|dosanjh|karan aujla|sidhu|moosewala|shubh|ap dhillon|wavy|tauba tauba|gaddi|bhangra|jatt|geet)\b/i.test(
      lower
    )
  ) {
    return { language: 'pa', script: 'Latin-Punjabi', confidence: 0.9 };
  }

  // Tamil Romanized
  if (/\b(tamil|anirudh|ar rahman|ilayaraja|yuvan|kollywood|paatu|kadavule)\b/i.test(lower)) {
    return { language: 'ta', script: 'Latin-Tamil', confidence: 0.9 };
  }

  // Telugu Romanized
  if (/\b(telugu|dsp|thaman|keeravani|tollywood|paata|naatu)\b/i.test(lower)) {
    return { language: 'te', script: 'Latin-Telugu', confidence: 0.9 };
  }

  // Spanish / Latin
  if (/\b(spanish|reggaeton|bad bunny|rosalia|shakira|despacito|cancion|musica|amor|corazon)\b/i.test(lower)) {
    return { language: 'es', script: 'Latin-Spanish', confidence: 0.88 };
  }

  // Korean Romanized (K-Pop)
  if (/\b(kpop|bts|blackpink|newjeans|stray kids|twice|exo|aespa)\b/i.test(lower)) {
    return { language: 'ko', script: 'Latin-KPop', confidence: 0.88 };
  }

  // Default: Latin / English
  return { language: 'en', script: 'Latin', confidence: 0.75 };
}
