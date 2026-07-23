import {
  gradeTierLabelKey,
  resolveGradeTier,
  type GradeLevelOption,
} from "@/lib/class-subject";
import type { TuitionPricing } from "@/lib/tuition";

export type { GradeLevelOption };
export { gradeTierLabelKey, resolveGradeTier };

export type SheetPricing = TuitionPricing & {
  /** Band-style monthly fee with no lesson packs. */
  monthlyOnly?: boolean;
  /** Art material fees added on top of packs. */
  materialFees?: { pack20: number; pack50: number };
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
        | "sheet.smartPianoGroup"
        | "sheet.otherInstrument1v1"
        | "sheet.ensembleGroup"
        | "sheet.specialtyGroup"
        | "sheet.art"
        | "sheet.dance"
        | "sheet.band"
        | "sheet.specialEducation";
      /** When set, UI shows a duration dropdown over these options. */
      durationOptions?: readonly number[];
      rows: Array<{
        id: string;
        durationMinutes: number;
        pricing: SheetPricing;
        match: ClassMatchHint;
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
    id: "smart_piano_group",
    kind: "fixed",
    titleKey: "sheet.smartPianoGroup",
    rows: [
      {
        id: "smart_piano_60",
        durationMinutes: 60,
        pricing: { perClass: 50, package20: 1000, package50: 2350 },
        match: {
          subjects: ["Smart Piano", "Acoustic Piano", "Violin Group"],
          durationMinutes: 60,
          lessonType: "group",
        },
      },
    ],
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
        pricing: { perClass: 65, package20: 1300, package50: 3100 },
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
    id: "ensemble_group",
    kind: "fixed",
    titleKey: "sheet.ensembleGroup",
    rows: [
      {
        id: "ensemble_60",
        durationMinutes: 60,
        pricing: { perClass: 53, package20: 1060, package50: 2500 },
        match: {
          subjects: ["Guitar Group", "Drums Group", "Vocal Group"],
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
        id: "specialty_60",
        durationMinutes: 60,
        pricing: { perClass: 45, package20: 900, package50: 2100 },
        match: {
          subjects: ["Sing & Play", "Model / Catwalk", "Music Theory"],
          durationMinutes: 60,
          lessonType: "group",
        },
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
    id: "dance",
    kind: "fixed",
    titleKey: "sheet.dance",
    rows: [
      {
        id: "dance_90",
        durationMinutes: 90,
        pricing: { perClass: 38, package20: 760, package50: 1750 },
        match: {
          subjects: ["Jazz Dance", "Chinese Dance", "Dance — Hip Hop"],
          durationMinutes: 90,
          lessonType: "group",
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
        id: "band_90",
        durationMinutes: 90,
        pricing: {
          perClass: 40,
          package20: null,
          package50: null,
          monthlyOnly: true,
        },
        match: {
          subjects: ["Band"],
          durationMinutes: 90,
          lessonType: "group",
        },
      },
    ],
  },
  {
    id: "special_education",
    kind: "fixed",
    titleKey: "sheet.specialEducation",
    rows: [
      {
        id: "special_ed_60",
        durationMinutes: 60,
        pricing: { perClass: 70, package20: 1400, package50: 3350 },
        match: {
          subjects: ["Special Education"],
          durationMinutes: 60,
          lessonType: "private",
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
    if (!match.subjects.some((s) => subjectEquals(s, row.subject))) {
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

