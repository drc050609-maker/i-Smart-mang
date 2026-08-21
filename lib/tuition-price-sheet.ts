import {
  DEFAULT_GRADE_LEVEL,
  gradeTierLabelKey,
  resolveGradeTier,
  type GradeLevelOption,
} from "@/lib/class-subject";
import {
  buildTuitionPricing,
  isTrialLesson,
  type StoredClassPricing,
  type TuitionPricing,
} from "@/lib/tuition";

export type { GradeLevelOption };
export { gradeTierLabelKey, resolveGradeTier };

export type SheetPricing = TuitionPricing & {
  /** Band-style monthly fee with no lesson packs. */
  monthlyOnly?: boolean;
  /** Extra fees added on top of packs (materials, dance bag, etc.). */
  materialFees?: {
    pack20: number;
    pack50: number;
    /** Defaults to materials wording when omitted. */
    labelKey?: "sheet.materialFeeAdd" | "sheet.danceBagAdd";
  };
};

/** Official Piano/Violin 1V1 matrix: duration × grade tier. */
export const LEVEL_1V1_PRICE_MATRIX: Record<
  45 | 60,
  Record<GradeLevelOption, SheetPricing>
> = {
  45: {
    "G0-2": { perClass: 50, package20: 1000, package50: 2350 },
    "G3-4": { perClass: 55, package20: 1100, package50: 2600 },
    "G5-6": { perClass: 60, package20: 1200, package50: 2850 },
    "G7-8": { perClass: 65, package20: 1300, package50: 3100 },
    Performance: { perClass: 70, package20: 1400, package50: 3350 },
  },
  60: {
    "G0-2": { perClass: 65, package20: 1300, package50: 3100 },
    "G3-4": { perClass: 70, package20: 1400, package50: 3350 },
    "G5-6": { perClass: 75, package20: 1500, package50: 3600 },
    "G7-8": { perClass: 80, package20: 1600, package50: 3850 },
    Performance: { perClass: 85, package20: 1700, package50: 4100 },
  },
};

export const LEVEL_1V1_DURATIONS = [45, 60] as const;

/** Canonical price-sheet name for Modeling 1, Modeling 2, Catwalk, etc. */
export const MODEL_CATWALK_SUBJECT = "Model / Catwalk";

export type ClassMatchHint = {
  subjects: string[];
  durationMinutes: number | null;
  lessonType: "private" | "group" | null;
};

export type PriceSheetSection =
  | {
      id: "piano_1v1" | "violin_1v1";
      kind: "level_1v1";
      /** Catalog subject used for DB matching (Piano / Violin). */
      subject: string;
      titleKey: "sheet.piano1v1" | "sheet.violin1v1";
    }
  | {
      id: string;
      kind: "fixed";
      titleKey:
        | "sheet.otherInstrument1v1"
        | "sheet.band"
        | "sheet.choirOrchestraTheory"
        | "sheet.talentExam"
        | "sheet.specialtyGroup"
        | "sheet.art"
        | "sheet.art1v1"
        | "sheet.dance";
      /** When set, UI shows a duration dropdown over these options. */
      durationOptions?: readonly number[];
      rows: Array<{
        id: string;
        durationMinutes: number;
        pricing: SheetPricing;
        match: ClassMatchHint;
        /** Price-sheet display name when several scheduled classes share this rate. */
        labelSubject?: string;
      }>;
    };

/**
 * Official chart order. Catalog prices are the source of truth for display;
 * DB classes are optionally linked for edit/payments.
 */
export const PRICE_SHEET_SECTIONS: PriceSheetSection[] = [
  {
    id: "piano_1v1",
    kind: "level_1v1",
    subject: "Piano",
    titleKey: "sheet.piano1v1",
  },
  {
    id: "violin_1v1",
    kind: "level_1v1",
    subject: "Violin",
    titleKey: "sheet.violin1v1",
  },
  {
    id: "other_instrument_1v1",
    kind: "fixed",
    titleKey: "sheet.otherInstrument1v1",
    durationOptions: [45, 60],
    rows: [
      {
        id: "other_1v1_45",
        durationMinutes: 45,
        pricing: { perClass: 53, package20: 1060, package50: 2500 },
        match: {
          subjects: [
            "Guitar",
            "Drums",
            "Singing / Voice",
            "Guzheng",
            "Zither",
            "Cello",
          ],
          durationMinutes: 45,
          lessonType: "private",
        },
      },
      {
        id: "other_1v1_60",
        durationMinutes: 60,
        pricing: { perClass: 68, package20: 1360, package50: 3250 },
        match: {
          subjects: [
            "Guitar",
            "Drums",
            "Singing / Voice",
            "Guzheng",
            "Zither",
            "Cello",
          ],
          durationMinutes: 60,
          lessonType: "private",
        },
      },
    ],
  },
  {
    id: "band",
    kind: "fixed",
    titleKey: "sheet.band",
    rows: [
      {
        id: "band_60",
        durationMinutes: 60,
        pricing: { perClass: 48, package20: 960, package50: 2250 },
        match: {
          subjects: ["Band"],
          durationMinutes: 60,
          lessonType: "group",
        },
      },
    ],
  },
  {
    id: "choir_orchestra_theory",
    kind: "fixed",
    titleKey: "sheet.choirOrchestraTheory",
    rows: [
      {
        id: "choir_orchestra_theory_60",
        durationMinutes: 60,
        pricing: { perClass: 45, package20: 900, package50: 2100 },
        match: {
          subjects: ["Choir", "Orchestra", "Music Theory"],
          durationMinutes: 60,
          lessonType: "group",
        },
      },
    ],
  },
  {
    id: "talent_exam",
    kind: "fixed",
    titleKey: "sheet.talentExam",
    rows: [
      {
        id: "talent_exam_60",
        durationMinutes: 60,
        pricing: { perClass: 100, package20: 2000, package50: null },
        match: {
          subjects: ["Talent Exam Prep"],
          durationMinutes: 60,
          lessonType: "group",
        },
      },
    ],
  },
  {
    id: "specialty_group",
    kind: "fixed",
    titleKey: "sheet.specialtyGroup",
    rows: [
      {
        id: "sing_play_60",
        durationMinutes: 60,
        pricing: { perClass: 45, package20: 900, package50: 2100 },
        match: {
          subjects: ["Sing & Play"],
          durationMinutes: 60,
          lessonType: "group",
        },
        labelSubject: "Sing & Play",
      },
      {
        id: "model_catwalk_60",
        durationMinutes: 60,
        pricing: { perClass: 45, package20: 900, package50: 2100 },
        match: {
          subjects: [MODEL_CATWALK_SUBJECT],
          durationMinutes: 60,
          lessonType: null,
        },
        labelSubject: MODEL_CATWALK_SUBJECT,
      },
    ],
  },
  {
    id: "art",
    kind: "fixed",
    titleKey: "sheet.art",
    durationOptions: [60, 90],
    rows: [
      {
        id: "art_60",
        durationMinutes: 60,
        pricing: {
          perClass: 33,
          package20: 660,
          package50: 1500,
          materialFees: { pack20: 70, pack50: 100 },
        },
        match: {
          subjects: ["Art"],
          durationMinutes: 60,
          lessonType: "group",
        },
      },
      {
        id: "art_90",
        durationMinutes: 90,
        pricing: {
          perClass: 43,
          package20: 860,
          package50: 2000,
          materialFees: { pack20: 70, pack50: 100 },
        },
        match: {
          subjects: ["Art"],
          durationMinutes: 90,
          lessonType: "group",
        },
      },
    ],
  },
  {
    id: "art_1v1",
    kind: "fixed",
    titleKey: "sheet.art1v1",
    durationOptions: [60, 90],
    rows: [
      {
        id: "art_1v1_60",
        durationMinutes: 60,
        pricing: { perClass: 70, package20: 1400, package50: 3350 },
        match: {
          subjects: ["1-to-1 Art", "Special Education"],
          durationMinutes: 60,
          lessonType: "private",
        },
      },
      {
        id: "art_1v1_90",
        durationMinutes: 90,
        pricing: { perClass: 85, package20: 1700, package50: 4100 },
        match: {
          subjects: ["1-to-1 Art", "Special Education"],
          durationMinutes: 90,
          lessonType: "private",
        },
      },
    ],
  },
  {
    id: "dance",
    kind: "fixed",
    titleKey: "sheet.dance",
    durationOptions: [60, 90],
    rows: [
      {
        id: "dance_60",
        durationMinutes: 60,
        pricing: { perClass: 29, package20: 580, package50: 1300 },
        match: {
          subjects: ["Jazz Dance", "Jazz", "Chinese Dance", "Dance — Hip Hop"],
          durationMinutes: 60,
          lessonType: "group",
        },
      },
      {
        id: "dance_90",
        durationMinutes: 90,
        pricing: {
          perClass: 32.5,
          package20: 650,
          package50: 1500,
          materialFees: {
            pack20: 0,
            pack50: 50,
            labelKey: "sheet.danceBagAdd",
          },
        },
        match: {
          subjects: ["Jazz Dance", "Jazz", "Chinese Dance", "Dance — Hip Hop"],
          durationMinutes: 90,
          lessonType: "group",
        },
      },
    ],
  },
];

export function level1v1Pricing(
  durationMinutes: 45 | 60,
  gradeTier: GradeLevelOption,
): SheetPricing {
  return LEVEL_1V1_PRICE_MATRIX[durationMinutes][gradeTier];
}

export type MatchableClass = {
  id: number;
  subject: string;
  duration_minutes: number | null;
  lesson_type: string | null;
  is_active: boolean;
};

function subjectEquals(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function normalizeSubjectKey(subject: string) {
  return subject
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\(\s*class\s*\d+\s*\)\s*$/i, "")
    .trim();
}

/** Modeling 1/2, Catwalk, Cat walk, Model / Catwalk (Class 1), 模特走秀, … */
export function isModelingCatwalkSubject(subject: string) {
  const normalized = normalizeSubjectKey(subject);
  if (!normalized) return false;
  if (/模特|走秀/.test(subject)) return true;
  if (/\bcat\s*-?\s*walks?\b/.test(normalized)) return true;
  return /\bmodel(?:ing|s)?\b/.test(normalized);
}

function subjectsMatch(sheetSubject: string, classSubject: string) {
  if (subjectEquals(sheetSubject, classSubject)) return true;
  if (normalizeSubjectKey(sheetSubject) === normalizeSubjectKey(classSubject)) {
    return true;
  }
  return (
    isModelingCatwalkSubject(sheetSubject) &&
    isModelingCatwalkSubject(classSubject)
  );
}

function lessonTypeMatches(
  classLessonType: string | null,
  expected: ClassMatchHint["lessonType"],
) {
  if (!expected) return true;
  return (classLessonType ?? "").toLowerCase() === expected;
}

/** Find DB classes that belong to a sheet match hint. */
export function findMatchingClasses(
  classes: MatchableClass[],
  match: ClassMatchHint,
) {
  return classes.filter((row) => {
    if (row.lesson_type === "trial") return false;
    if (!match.subjects.some((s) => subjectsMatch(s, row.subject))) {
      return false;
    }
    if (
      match.durationMinutes != null &&
      row.duration_minutes !== match.durationMinutes
    ) {
      return false;
    }
    return lessonTypeMatches(row.lesson_type, match.lessonType);
  });
}

/** Classes covered by the official sheet (for “other classes” remainder). */
export function collectSheetMatchedClassIds(classes: MatchableClass[]) {
  const ids = new Set<number>();

  for (const section of PRICE_SHEET_SECTIONS) {
    if (section.kind === "level_1v1") {
      for (const duration of LEVEL_1V1_DURATIONS) {
        for (const row of findMatchingClasses(classes, {
          subjects: [section.subject],
          durationMinutes: duration,
          lessonType: "private",
        })) {
          ids.add(row.id);
        }
      }
      // Also match private with null duration for the subject.
      for (const row of findMatchingClasses(classes, {
        subjects: [section.subject],
        durationMinutes: null,
        lessonType: "private",
      })) {
        if (row.duration_minutes == null) ids.add(row.id);
      }
      continue;
    }

    for (const sheetRow of section.rows) {
      for (const row of findMatchingClasses(classes, sheetRow.match)) {
        ids.add(row.id);
      }
    }
  }

  return ids;
}

/** Unique subject names referenced by the official price sheet. */
export function listPriceSheetSubjects() {
  const subjects = new Set<string>();

  for (const section of PRICE_SHEET_SECTIONS) {
    if (section.kind === "level_1v1") {
      subjects.add(section.subject);
      continue;
    }
    for (const row of section.rows) {
      for (const subject of row.match.subjects) {
        subjects.add(subject);
      }
    }
  }

  return [...subjects].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/** Official-sheet rate for a scheduled class, or null if it is off-sheet. */
export function sheetPricingForClass(
  classRow: Pick<MatchableClass, "subject" | "duration_minutes" | "lesson_type">,
): SheetPricing | null {
  if (isTrialLesson(classRow.lesson_type)) return null;

  const asMatchable: MatchableClass = {
    id: 0,
    subject: classRow.subject,
    duration_minutes: classRow.duration_minutes,
    lesson_type: classRow.lesson_type,
    is_active: true,
  };

  for (const section of PRICE_SHEET_SECTIONS) {
    if (section.kind === "level_1v1") {
      const duration =
        classRow.duration_minutes === 45 || classRow.duration_minutes === 60
          ? classRow.duration_minutes
          : null;
      if (duration == null) continue;
      const matches = findMatchingClasses([asMatchable], {
        subjects: [section.subject],
        durationMinutes: duration,
        lessonType: "private",
      });
      if (matches.length > 0) {
        return level1v1Pricing(duration, DEFAULT_GRADE_LEVEL);
      }
      continue;
    }

    for (const sheetRow of section.rows) {
      if (findMatchingClasses([asMatchable], sheetRow.match).length > 0) {
        return sheetRow.pricing;
      }
    }
  }

  return null;
}

/**
 * Stored class prices win; otherwise use the official sheet (so Modeling 1 and
 * Modeling 2 share one rate even when only one class has cents saved).
 */
export function resolveTuitionPricingForClass(
  classRow: Pick<MatchableClass, "subject" | "duration_minutes" | "lesson_type">,
  stored?: StoredClassPricing | null,
): TuitionPricing {
  const built = buildTuitionPricing(
    classRow.duration_minutes,
    classRow.lesson_type,
    stored,
  );

  if (isTrialLesson(classRow.lesson_type)) return built;
  if (stored?.single_price_cents != null && stored.single_price_cents > 0) {
    return built;
  }

  const sheet = sheetPricingForClass(classRow);
  if (!sheet) return built;

  return {
    perClass: sheet.perClass,
    package20: sheet.package20,
    package50: sheet.package50,
  };
}
