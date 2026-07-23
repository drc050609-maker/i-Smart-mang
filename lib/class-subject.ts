import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";

/** Exact English subject labels → Chinese display names. */
export const CLASS_SUBJECT_TRANSLATIONS: Record<string, string> = {
  "Singing / Voice": "声乐",
  "Dance — Hip Hop": "街舞",
  "Violin I": "小提琴 I",
  "Drums & Percussion": "鼓与打击乐",
  Piano: "钢琴",
  "Smart Piano": "智能钢琴",
  "Acoustic Piano": "原声钢琴",
  Violin: "小提琴",
  "Violin Group": "小提琴小组课",
  Guitar: "吉他",
  "Guitar Group": "吉他小组课",
  Drums: "架子鼓",
  "Drums Group": "架子鼓小组课",
  Guzheng: "古筝",
  Zither: "古筝",
  "Vocal Group": "声乐小组课",
  "Sing & Play": "边弹边唱",
  "Model / Catwalk": "模特走秀",
  Art: "画画",
  "Jazz Dance": "爵士舞",
  "Chinese Dance": "中国舞",
  Band: "乐队",
  "Special Education": "一对一特教",
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
  [/special\s*education/gi, "一对一特教"],
  [/smart\s*piano/gi, "智能钢琴"],
  [/acoustic\s*piano/gi, "原声钢琴"],
  [/chinese\s*dance/gi, "中国舞"],
  [/jazz\s*dance/gi, "爵士舞"],
  [/model\s*\/\s*catwalk|catwalk/gi, "模特走秀"],
  [/sing\s*&\s*play/gi, "边弹边唱"],
  [/vocal\s*group/gi, "声乐小组课"],
  [/guitar\s*group/gi, "吉他小组课"],
  [/drums?\s*group/gi, "架子鼓小组课"],
  [/violin\s*group/gi, "小提琴小组课"],
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
  [/guzheng|zither/gi, "古筝"],
  [/violin/gi, "小提琴"],
  [/cello/gi, "大提琴"],
  [/guitar/gi, "吉他"],
  [/piano/gi, "钢琴"],
  [/flute/gi, "长笛"],
  [/choir/gi, "合唱团"],
  [/\bband\b/gi, "乐队"],
  [/\bart\b/gi, "画画"],
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

/** Keep the first class for each subject (case-insensitive). */
export function uniqueClassesBySubject<T extends { subject: string }>(
  classes: T[],
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const row of classes) {
    const key = row.subject.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }

  return result;
}

/** Display subject with optional enrollment grade, e.g. Piano (G5). */
export function formatClassSubjectWithGrade(
  subject: string | null | undefined,
  gradeLevel: string | null | undefined,
  language: AppLanguage = "en",
) {
  const label = formatClassSubject(subject, language);
  const grade = gradeLevel?.trim();
  if (!grade) return label;
  return `${label} (${grade})`;
}

export const GRADE_LEVEL_OPTIONS = [
  "G0-2",
  "G3-4",
  "G5-6",
  "G7-8",
  "Performance",
] as const;

export type GradeLevelOption = (typeof GRADE_LEVEL_OPTIONS)[number];

export const DEFAULT_GRADE_LEVEL: GradeLevelOption = "G0-2";

function tierFromNumber(n: number): GradeLevelOption {
  if (n <= 2) return "G0-2";
  if (n <= 4) return "G3-4";
  if (n <= 6) return "G5-6";
  if (n <= 8) return "G7-8";
  return "Performance";
}

/** Map enrollment grade (G5, G0-2, 演奏级, V0, …) onto a sheet tier. */
export function resolveGradeTier(
  gradeLevel: string | null | undefined,
): GradeLevelOption {
  const raw = gradeLevel?.trim();
  if (!raw) return DEFAULT_GRADE_LEVEL;

  if ((GRADE_LEVEL_OPTIONS as readonly string[]).includes(raw)) {
    return raw as GradeLevelOption;
  }

  if (/performance|演奏/i.test(raw)) return "Performance";

  const prefixed = raw.match(/^[VPG]\s*(\d+)(?:\s*[-–—~～]\s*(\d+))?$/i);
  if (prefixed) {
    return tierFromNumber(Number(prefixed[1]));
  }

  const range = raw.match(/(\d+)\s*[-–—~～]\s*(\d+)/);
  if (range) {
    return tierFromNumber(Number(range[1]));
  }

  const match = raw.match(/G?\s*(\d+)/i);
  if (match) {
    return tierFromNumber(Number(match[1]));
  }

  return DEFAULT_GRADE_LEVEL;
}

/** True when parenthetical text looks like a grade/level token, not a note. */
export function looksLikeGradeToken(inner: string): boolean {
  const trimmed = inner.trim();
  if (!trimmed) return false;
  if (/performance|演奏/i.test(trimmed)) return true;
  return /^(?:[GVP]\s*)?\d{1,2}(?:\s*[-–—~～]\s*\d{1,2})?$/i.test(trimmed);
}

/**
 * Read grade from calendar SUMMARY parentheses, e.g. `(7)`, `（5-6）`, `（G4）`.
 * Defaults to G0-2 when no grade token is present.
 */
export function parseGradeLevelFromSummary(summary: string): GradeLevelOption {
  const isGroup = /小组/.test(summary);
  for (const match of summary.matchAll(/[（(]([^）)]+)[）)]/g)) {
    const inner = match[1]?.trim() ?? "";
    if (!inner) continue;
    // Group lessons pack student names in parentheses — skip those lists.
    if (isGroup && /[,，、/\\]/.test(inner)) continue;
    if (!looksLikeGradeToken(inner)) continue;
    return resolveGradeTier(inner);
  }
  return DEFAULT_GRADE_LEVEL;
}

export function paycheckGroupKey(
  subject: string,
  gradeTier: GradeLevelOption,
) {
  return `${subject.trim().toLowerCase()}|${gradeTier}`;
}

export function gradeTierLabelKey(
  tier: GradeLevelOption,
):
  | "sheet.grade.g0_2"
  | "sheet.grade.g3_4"
  | "sheet.grade.g5_6"
  | "sheet.grade.g7_8"
  | "sheet.grade.performance" {
  switch (tier) {
    case "G0-2":
      return "sheet.grade.g0_2";
    case "G3-4":
      return "sheet.grade.g3_4";
    case "G5-6":
      return "sheet.grade.g5_6";
    case "G7-8":
      return "sheet.grade.g7_8";
    case "Performance":
      return "sheet.grade.performance";
  }
}

/** e.g. "Violin Levels 0–2" / "小提琴 0–2 级". */
export function formatSubjectWithGradeTier(
  subject: string | null | undefined,
  gradeTier: GradeLevelOption,
  language: AppLanguage = "en",
) {
  const label = formatClassSubject(subject, language);
  const tierLabel = translate(language, gradeTierLabelKey(gradeTier));
  return `${label} ${tierLabel}`;
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

/** Catalog + optional campus subjects for comboboxes (deduped, sorted). */
export function listKnownClassSubjects(extra: Iterable<string> = []) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const subject of [
    ...Object.keys(CLASS_SUBJECT_TRANSLATIONS),
    ...extra,
  ]) {
    const trimmed = subject.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/** Filter known subjects by English or Chinese label. */
export function filterSubjectsByQuery(subjects: string[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return subjects;

  return subjects.filter((subject) => {
    const en = subject.trim().toLowerCase();
    const zh = translateClassSubjectToChinese(subject).toLowerCase();
    return en.includes(q) || zh.includes(q);
  });
}
