export const SLOT_DURATION_MINUTES = [30, 45, 60] as const;

export const DEFAULT_SLOT_DURATION_MINUTES = 45;

export function durationSelectOptions(currentMinutes?: number | null) {
  const options: number[] = [...SLOT_DURATION_MINUTES];
  if (
    currentMinutes != null &&
    Number.isInteger(currentMinutes) &&
    currentMinutes > 0 &&
    !options.includes(currentMinutes)
  ) {
    options.push(currentMinutes);
    options.sort((a, b) => a - b);
  }
  return options;
}
