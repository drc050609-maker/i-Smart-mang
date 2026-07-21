import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";

/** Exact English subject labels → Chinese display names. */
const CLASS_SUBJECT_TRANSLATIONS: Record<string, string> = {
  "Singing / Voice": "声乐",
  "Dance — Hip Hop": "街舞",
  "Violin I": "小提琴 I",
  "Drums & Percussion": "鼓与打击乐",
  Piano: "钢琴",
  Guitar: "吉他",
  Cello: "大提琴",
  Flute: "长笛",
  "Ballet Fundamentals": "芭蕾基础",
  "Jazz Ensemble": "爵士合奏",
  Choir: "合唱团",
  "Music Theory": "乐理",
  "Musical Theater": "音乐剧",
  Saxophone: "萨克斯",
  Ukulele: "尤克里里",
  Trumpet: "小号",
  Clarinet: "单簧管",
  "Songwriting Lab": "词曲创作",
  "Tap Dance": "踢踏舞",
  "World Rhythms & Dance": "世界节奏与舞蹈",
};

/** Longer phrases first so partial matches stay correct. */
const CLASS_SUBJECT_KEYWORD_REPLACEMENTS: [RegExp, string][] = [
  [/singing\s*\/\s*voice/gi, "声乐"],
  [/musical\s*theat(?:er|re)/gi, "音乐剧"],
  [/music\s*theory/gi, "乐理"],
  [/tap\s*dance/gi, "踢踏舞"],
  [/world\s*rhythms(?:\s*&\s*dance)?/gi, "世界节奏与舞蹈"],
  [/songwriting(?:\s*lab)?/gi, "词曲创作"],
  [/hip\s*hop/gi, "街舞"],
  [/ballet(?:\s*fundamentals)?/gi, "芭蕾"],
  [/jazz(?:\s*ensemble)?/gi, "爵士合奏"],
  [/drums?(?:\s*&\s*percussion)?/gi, "鼓与打击乐"],
  [/percussion/gi, "打击乐"],
  [/saxophone/gi, "萨克斯"],
  [/ukulele/gi, "尤克里里"],
  [/clarinet/gi, "单簧管"],
  [/trumpet/gi, "小号"],
  [/violin/gi, "小提琴"],
  [/cello/gi, "大提琴"],
  [/guitar/gi, "吉他"],
  [/piano/gi, "钢琴"],
  [/flute/gi, "长笛"],
  [/choir/gi, "合唱团"],
  [/ensemble/gi, "合奏"],
  [/fundamentals/gi, "基础"],
  [/voice/gi, "声乐"],
  [/singing/gi, "声乐"],
  [/dance/gi, "舞蹈"],
];

function translateClassSubjectToChinese(subject: string) {
  const trimmed = subject.trim();
  const exact = CLASS_SUBJECT_TRANSLATIONS[trimmed];
  if (exact) {
    return exact;
  }

  let result = trimmed;
  for (const [pattern, replacement] of CLASS_SUBJECT_KEYWORD_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

export function formatClassSubject(
  subject: string | null | undefined,
  language: AppLanguage = "en",
) {
  if (!subject?.trim()) {
    return translate(language, "common.notAvailable");
  }

  if (language === "en") {
    return subject.trim();
  }

  return translateClassSubjectToChinese(subject);
}

/** Search text includes both English and Chinese labels. */
export function classSubjectSearchText(
  subject: string,
  language: AppLanguage = "en",
) {
  const trimmed = subject.trim().toLowerCase();
  if (language === "zh") {
    return `${trimmed} ${translateClassSubjectToChinese(subject).toLowerCase()}`;
  }
  return trimmed;
}
