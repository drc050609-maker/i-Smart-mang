import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";

export const CLASS_TRACKS = [
  "instrumental",
  "vocal",
  "composition",
  "dance",
  "music_education",
  "other",
] as const;

export type ClassTrack = (typeof CLASS_TRACKS)[number];

const CLASS_TRACK_LABEL_KEYS = {
  instrumental: "enum.classTrack.instrumental",
  vocal: "enum.classTrack.vocal",
  composition: "enum.classTrack.composition",
  dance: "enum.classTrack.dance",
  music_education: "enum.classTrack.music_education",
  other: "enum.classTrack.other",
} as const;

export const CLASS_TRACK_OPTIONS: {
  value: ClassTrack;
  label: string;
  description?: string;
}[] = [
  {
    value: "instrumental",
    label: "Instrumental",
    description: "Piano, strings, winds, drums, and other instruments",
  },
  {
    value: "vocal",
    label: "Vocal",
    description: "Voice, choir, and singing lessons",
  },
  {
    value: "composition",
    label: "Composition",
    description: "Songwriting and original music creation",
  },
  {
    value: "dance",
    label: "Dance",
    description: "Ballet, hip hop, tap, and movement classes",
  },
  {
    value: "music_education",
    label: "Music education",
    description: "Music theory, musical theater, and ensemble skills",
  },
  {
    value: "other",
    label: "Other",
    description: "Classes that do not fit the tracks above",
  },
];

const CLASS_TRACK_DESCRIPTION_KEYS = {
  instrumental: "enum.classTrack.instrumentalDesc",
  vocal: "enum.classTrack.vocalDesc",
  composition: "enum.classTrack.compositionDesc",
  dance: "enum.classTrack.danceDesc",
  music_education: "enum.classTrack.music_educationDesc",
  other: "enum.classTrack.otherDesc",
} as const;

export function getClassTrackOptions(language: AppLanguage = "en") {
  return CLASS_TRACKS.map((value) => ({
    value,
    label: formatClassTrack(value, language),
    description: translate(language, CLASS_TRACK_DESCRIPTION_KEYS[value]),
  }));
}

export function formatClassTrack(
  track: ClassTrack | string | null | undefined,
  language: AppLanguage = "en",
) {
  if (!track) return translate(language, "common.notAvailable");
  if (CLASS_TRACKS.includes(track as ClassTrack)) {
    return translate(language, CLASS_TRACK_LABEL_KEYS[track as ClassTrack]);
  }
  return track;
}

export function parseClassTrack(value: FormDataEntryValue | null) {
  const track = value?.toString().trim();
  if (!track) {
    return undefined;
  }

  if (!CLASS_TRACKS.includes(track as ClassTrack)) {
    return null;
  }

  return track as ClassTrack;
}

export function inferClassTrackFromSubject(subject: string): ClassTrack {
  const normalized = subject.toLowerCase();

  if (
    normalized.includes("voice") ||
    normalized.includes("choir") ||
    normalized.includes("singing")
  ) {
    return "vocal";
  }

  if (
    normalized.includes("songwriting") ||
    normalized.includes("composition")
  ) {
    return "composition";
  }

  if (
    normalized.includes("dance") ||
    normalized.includes("ballet") ||
    normalized.includes("tap") ||
    normalized.includes("hip hop") ||
    normalized.includes("rhythms")
  ) {
    return "dance";
  }

  if (
    normalized.includes("theory") ||
    normalized.includes("theater") ||
    normalized.includes("theatre") ||
    normalized.includes("ensemble")
  ) {
    return "music_education";
  }

  if (
    normalized.includes("piano") ||
    normalized.includes("violin") ||
    normalized.includes("viola") ||
    normalized.includes("cello") ||
    normalized.includes("guitar") ||
    normalized.includes("drums") ||
    normalized.includes("percussion") ||
    normalized.includes("flute") ||
    normalized.includes("saxophone") ||
    normalized.includes("trumpet") ||
    normalized.includes("clarinet") ||
    normalized.includes("ukulele")
  ) {
    return "instrumental";
  }

  return "other";
}
