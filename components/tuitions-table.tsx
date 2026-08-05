"use client";

import { useMemo, useState } from "react";

import { EditClassPricingDialog } from "@/components/edit-class-pricing-dialog";
import { DeleteClassPricingButton } from "@/components/delete-class-pricing-button";
import { DeleteCourseButton } from "@/components/delete-course-button";
import { AddTuitionCourseDialog } from "@/components/add-tuition-course-dialog";
import { RenameCourseDialog } from "@/components/rename-course-dialog";
import { useLanguage } from "@/components/language-provider";
import {
  SelectChevron,
  selectFieldClassName,
} from "@/components/select-chevron";
import {
  formatClassSubject,
  formatClassSubjectWithGrade,
  GRADE_LEVEL_OPTIONS,
} from "@/lib/class-subject";
import { formatLessonType, type LessonType } from "@/lib/class-lesson-type";
import type { AppLanguage } from "@/lib/language";
import type { TranslationKey } from "@/lib/i18n";
import { type TeacherNameFields } from "@/lib/person-name";
import {
  formatTuition,
  artMaterialFeeNote,
  type TuitionPricing,
} from "@/lib/tuition";
import {
  collectSheetMatchedClassIds,
  findMatchingClasses,
  gradeTierLabelKey,
  LEVEL_1V1_DURATIONS,
  level1v1Pricing,
  PRICE_SHEET_SECTIONS,
  type GradeLevelOption,
  type MatchableClass,
  type SheetPricing,
} from "@/lib/tuition-price-sheet";

export type TuitionClassRow = {
  id: number;
  subject: string;
  duration_minutes: number | null;
  lesson_type: string | null;
  class_track: string | null;
  is_active: boolean;
  teacher: TeacherNameFields | null;
  pricing: TuitionPricing;
  activePromotionName?: string | null;
};

function formatDuration(
  minutes: number | null,
  t: (
    key:
      | "common.notAvailable"
      | "common.hour"
      | "common.hours"
      | "common.minutes",
    params?: Record<string, string | number>,
  ) => string,
) {
  if (!minutes) return t("common.notAvailable");
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1
      ? t("common.hour")
      : t("common.hours", { count: hours });
  }
  return t("common.minutes", { count: minutes });
}

function CourseLabel({
  label,
  editClass,
  note,
}: {
  label: string;
  editClass?: TuitionClassRow | null;
  note?: string | null;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-1">
        <span>{label}</span>
        {editClass ? (
          <>
            <RenameCourseDialog
              classId={editClass.id}
              subject={editClass.subject}
            />
            <DeleteCourseButton
              classId={editClass.id}
              subject={editClass.subject}
            />
          </>
        ) : null}
      </div>
      {note ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{note}</p>
      ) : null}
    </div>
  );
}

function primaryMatchedClass(
  matches: MatchableClass[],
  classesById: Map<number, TuitionClassRow>,
): TuitionClassRow | null {
  for (const match of matches) {
    const full = classesById.get(match.id);
    if (full) return full;
  }
  return null;
}

function PriceCells({
  pricing,
  language,
  t,
  editClass,
}: {
  pricing: SheetPricing;
  language: AppLanguage;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  editClass?: TuitionClassRow | null;
}) {
  const editPricing = editClass?.pricing ?? null;
  const canEdit = Boolean(editClass && editPricing);
  const trial = editClass ? editClass.lesson_type === "trial" : false;
  const displayPricing: SheetPricing = editPricing
    ? {
        perClass: editPricing.perClass,
        package20: editPricing.package20 ?? pricing.package20,
        package50: editPricing.package50 ?? pricing.package50,
        monthlyOnly: pricing.monthlyOnly,
        materialFees: pricing.materialFees,
      }
    : pricing;
  const dialogPricing: TuitionPricing | null = editPricing
    ? {
        perClass: displayPricing.perClass,
        package20: displayPricing.package20,
        package50: displayPricing.package50,
      }
    : null;

  return (
    <>
      <td className="px-3 py-4 text-right text-sm font-semibold whitespace-nowrap text-red-600 dark:text-red-400">
        <span className="inline-flex items-center justify-end gap-0.5">
          {formatTuition(displayPricing.perClass, language)}
          {canEdit && editClass && dialogPricing ? (
            <>
              <EditClassPricingDialog
                classId={editClass.id}
                subject={editClass.subject}
                lessonType={editClass.lesson_type}
                pricing={dialogPricing}
                field="single"
              />
              <DeleteClassPricingButton
                classId={editClass.id}
                subject={editClass.subject}
                field="single"
              />
            </>
          ) : null}
        </span>
        {displayPricing.monthlyOnly ? (
          <span className="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">
            {t("sheet.perMonth")}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-4 text-right text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
        {displayPricing.package20 != null ? (
          <>
            <span className="inline-flex items-center justify-end gap-0.5 font-medium text-gray-900 dark:text-white">
              {formatTuition(displayPricing.package20, language)}
              {canEdit && !trial && editClass && dialogPricing ? (
                <>
                  <EditClassPricingDialog
                    classId={editClass.id}
                    subject={editClass.subject}
                    lessonType={editClass.lesson_type}
                    pricing={dialogPricing}
                    field="package20"
                  />
                  <DeleteClassPricingButton
                    classId={editClass.id}
                    subject={editClass.subject}
                    field="package20"
                  />
                </>
              ) : null}
            </span>
            {displayPricing.materialFees ? (
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                {t("sheet.materialFeeAdd", {
                  amount: displayPricing.materialFees.pack20,
                })}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">
            {displayPricing.monthlyOnly
              ? t("common.monthlyRateOnly")
              : t("common.notAvailable")}
          </span>
        )}
      </td>
      <td className="px-3 py-4 text-right text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
        {displayPricing.package50 != null ? (
          <>
            <span className="inline-flex items-center justify-end gap-0.5 font-medium text-gray-900 dark:text-white">
              {formatTuition(displayPricing.package50, language)}
              {canEdit && !trial && editClass && dialogPricing ? (
                <>
                  <EditClassPricingDialog
                    classId={editClass.id}
                    subject={editClass.subject}
                    lessonType={editClass.lesson_type}
                    pricing={dialogPricing}
                    field="package50"
                  />
                  <DeleteClassPricingButton
                    classId={editClass.id}
                    subject={editClass.subject}
                    field="package50"
                  />
                </>
              ) : null}
            </span>
            {displayPricing.materialFees ? (
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                {t("sheet.materialFeeAdd", {
                  amount: displayPricing.materialFees.pack50,
                })}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">
            {displayPricing.monthlyOnly
              ? t("common.monthlyRateOnly")
              : t("common.notAvailable")}
          </span>
        )}
      </td>
    </>
  );
}

function MatchedClassActions({
  matches,
}: {
  matches: MatchableClass[];
  classesById: Map<number, TuitionClassRow>;
}) {
  const { t } = useLanguage();
  if (matches.length === 0) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {t("common.noLinkedClass")}
      </span>
    );
  }

  if (matches.some((m) => !m.is_active)) {
    return <span className="text-xs text-gray-400">{t("common.inactive")}</span>;
  }

  return null;
}

function Level1v1Block({
  subject,
  titleKey,
  classes,
  classesById,
}: {
  subject: string;
  titleKey: "sheet.piano1v1" | "sheet.violin1v1";
  classes: MatchableClass[];
  classesById: Map<number, TuitionClassRow>;
}) {
  const { language, t } = useLanguage();
  const [duration, setDuration] = useState<45 | 60>(45);
  const [grade, setGrade] = useState<GradeLevelOption>("G0-2");
  const pricing = level1v1Pricing(duration, grade);

  const matches = useMemo(
    () =>
      findMatchingClasses(classes, {
        subjects: [subject],
        durationMinutes: duration,
        lessonType: "private",
      }),
    [classes, duration, subject],
  );

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-violet-950 dark:text-violet-100">
            {t(titleKey)}
          </h3>
          <p className="mt-1 text-xs text-violet-800/80 dark:text-violet-200/70">
            {t("sheet.level1v1Hint")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label
              htmlFor={`${subject}-duration`}
              className="block text-xs font-medium text-violet-900 dark:text-violet-200"
            >
              {t("common.duration")}
            </label>
            <div className="relative mt-1 grid grid-cols-1">
              <select
                id={`${subject}-duration`}
                value={duration}
                onChange={(e) =>
                  setDuration(Number(e.target.value) as 45 | 60)
                }
                className={selectFieldClassName}
              >
                {LEVEL_1V1_DURATIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {t("common.minutes", { count: minutes })}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
          <div>
            <label
              htmlFor={`${subject}-grade`}
              className="block text-xs font-medium text-violet-900 dark:text-violet-200"
            >
              {t("common.gradeLevel")}
            </label>
            <div className="relative mt-1 grid grid-cols-1">
              <select
                id={`${subject}-grade`}
                value={grade}
                onChange={(e) =>
                  setGrade(e.target.value as GradeLevelOption)
                }
                className={selectFieldClassName}
              >
                {GRADE_LEVEL_OPTIONS.map((tier) => (
                  <option key={tier} value={tier}>
                    {t(gradeTierLabelKey(tier))}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs font-semibold text-violet-900/80 dark:text-violet-200/80">
              <th className="pr-3 pb-2">{t("common.class")}</th>
              <th className="px-3 pb-2 text-right">{t("common.perClass")}</th>
              <th className="px-3 pb-2 text-right">
                {t("common.packageCountPack", { count: 20 })}
              </th>
              <th className="px-3 pb-2 text-right">
                {t("common.packageCountPack", { count: 50 })}
              </th>
              <th className="pl-3 pb-2 text-right">{t("common.active")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                <CourseLabel
                  label={formatClassSubjectWithGrade(subject, grade, language)}
                  editClass={primaryMatchedClass(matches, classesById)}
                />
              </td>
              <PriceCells
                pricing={pricing}
                language={language}
                t={t}
                editClass={primaryMatchedClass(matches, classesById)}
              />
              <td className="py-2 pl-3 text-right">
                <MatchedClassActions
                  matches={matches}
                  classesById={classesById}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DurationOptionBlock({
  titleKey,
  durationOptions,
  rows,
  classes,
  classesById,
}: {
  titleKey: TranslationKey;
  durationOptions: readonly number[];
  rows: Extract<
    (typeof PRICE_SHEET_SECTIONS)[number],
    { kind: "fixed" }
  >["rows"];
  classes: MatchableClass[];
  classesById: Map<number, TuitionClassRow>;
}) {
  const { language, t } = useLanguage();
  const [duration, setDuration] = useState(durationOptions[0]!);
  const row = rows.find((r) => r.durationMinutes === duration) ?? rows[0]!;
  const matches = findMatchingClasses(classes, row.match);

  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 dark:border-indigo-500/25 dark:bg-indigo-500/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
          {t(titleKey)}
        </h3>
        <div>
          <label
            htmlFor={`${titleKey}-duration`}
            className="sr-only"
          >
            {t("common.duration")}
          </label>
          <div className="relative grid grid-cols-1">
            <select
              id={`${titleKey}-duration`}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={selectFieldClassName}
            >
              {durationOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {t("common.minutes", { count: minutes })}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs font-semibold text-indigo-900/80 dark:text-indigo-200/80">
              <th className="pr-3 pb-2">{t("common.duration")}</th>
              <th className="px-3 pb-2 text-right">{t("common.perClass")}</th>
              <th className="px-3 pb-2 text-right">
                {t("common.packageCountPack", { count: 20 })}
              </th>
              <th className="px-3 pb-2 text-right">
                {t("common.packageCountPack", { count: 50 })}
              </th>
              <th className="pl-3 pb-2 text-right">{t("common.active")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 pr-3 text-sm text-gray-700 dark:text-gray-300">
                {(() => {
                  const editClass = primaryMatchedClass(matches, classesById);
                  const durationLabel = formatDuration(row.durationMinutes, t);
                  const materialNote = row.pricing.materialFees
                    ? artMaterialFeeNote(t)
                    : null;
                  return (
                    <CourseLabel
                      label={
                        editClass
                          ? formatClassSubject(editClass.subject, language)
                          : durationLabel
                      }
                      editClass={editClass}
                      note={
                        editClass
                          ? [durationLabel, materialNote]
                              .filter(Boolean)
                              .join(" · ")
                          : materialNote
                      }
                    />
                  );
                })()}
              </td>
              <PriceCells
                pricing={row.pricing}
                language={language}
                t={t}
                editClass={primaryMatchedClass(matches, classesById)}
              />
              <td className="py-2 pl-3 text-right">
                <MatchedClassActions
                  matches={matches}
                  classesById={classesById}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FixedSectionBlock({
  titleKey,
  rows,
  classes,
  classesById,
}: {
  titleKey: TranslationKey;
  rows: Extract<
    (typeof PRICE_SHEET_SECTIONS)[number],
    { kind: "fixed" }
  >["rows"];
  classes: MatchableClass[];
  classesById: Map<number, TuitionClassRow>;
}) {
  const { language, t } = useLanguage();

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {t(titleKey)}
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
              <th className="pr-3 pb-2">{t("common.duration")}</th>
              <th className="px-3 pb-2 text-right">{t("common.perClass")}</th>
              <th className="px-3 pb-2 text-right">
                {t("common.packageCountPack", { count: 20 })}
              </th>
              <th className="px-3 pb-2 text-right">
                {t("common.packageCountPack", { count: 50 })}
              </th>
              <th className="pl-3 pb-2 text-right">{t("common.active")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {rows.map((row) => {
              const matches = findMatchingClasses(classes, row.match);
              return (
                <tr key={row.id}>
                  <td className="py-3 pr-3 text-sm text-gray-700 dark:text-gray-300">
                    {(() => {
                      const editClass = primaryMatchedClass(
                        matches,
                        classesById,
                      );
                      const durationLabel = formatDuration(
                        row.durationMinutes,
                        t,
                      );
                      const monthlyNote = row.pricing.monthlyOnly
                        ? t("sheet.bandMonthlyNote")
                        : null;
                      return (
                        <CourseLabel
                          label={
                            editClass
                              ? formatClassSubject(editClass.subject, language)
                              : durationLabel
                          }
                          editClass={editClass}
                          note={
                            editClass
                              ? [durationLabel, monthlyNote]
                                  .filter(Boolean)
                                  .join(" · ")
                              : monthlyNote
                          }
                        />
                      );
                    })()}
                  </td>
                  <PriceCells
                    pricing={row.pricing}
                    language={language}
                    t={t}
                    editClass={primaryMatchedClass(matches, classesById)}
                  />
                  <td className="py-3 pl-3 text-right">
                    <MatchedClassActions
                      matches={matches}
                      classesById={classesById}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OtherClassesBlock({
  classes,
}: {
  classes: TuitionClassRow[];
}) {
  const { language, t } = useLanguage();

  if (classes.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {t("sheet.otherClasses")}
      </h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {t("sheet.otherClassesSubtitle")}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
              <th className="pr-3 pb-2">{t("common.courseName")}</th>
              <th className="px-3 pb-2 text-right">{t("common.perClass")}</th>
              <th className="px-3 pb-2 text-right">
                {t("common.packageCountPack", { count: 20 })}
              </th>
              <th className="px-3 pb-2 text-right">
                {t("common.packageCountPack", { count: 50 })}
              </th>
              <th className="pl-3 pb-2 text-right">{t("common.active")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {classes.map((row) => (
              <tr key={row.id}>
                <td className="py-3 pr-3 text-sm text-gray-700 dark:text-gray-300">
                  <CourseLabel
                    label={formatClassSubject(row.subject, language)}
                    editClass={row}
                    note={[
                      formatDuration(row.duration_minutes, t),
                      formatLessonType(
                        row.lesson_type as LessonType | null,
                        language,
                      ),
                      row.is_active ? null : t("common.inactive"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </td>
                <PriceCells
                  pricing={{
                    perClass: row.pricing.perClass,
                    package20: row.pricing.package20,
                    package50: row.pricing.package50,
                  }}
                  language={language}
                  t={t}
                  editClass={row}
                />
                <td className="py-3 pl-3 text-right text-xs text-gray-500 dark:text-gray-400">
                  {row.is_active ? t("common.active") : t("common.inactive")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TuitionsTable({ classes }: { classes: TuitionClassRow[] }) {
  const { t } = useLanguage();

  const matchable: MatchableClass[] = useMemo(
    () =>
      classes.map((row) => ({
        id: row.id,
        subject: row.subject,
        duration_minutes: row.duration_minutes,
        lesson_type: row.lesson_type,
        is_active: row.is_active,
      })),
    [classes],
  );

  const classesById = useMemo(() => {
    const map = new Map<number, TuitionClassRow>();
    for (const row of classes) map.set(row.id, row);
    return map;
  }, [classes]);

  const otherClasses = useMemo(() => {
    const matchedIds = collectSheetMatchedClassIds(matchable);
    return classes
      .filter((row) => !matchedIds.has(row.id))
      .sort((a, b) =>
        a.subject.localeCompare(b.subject, undefined, {
          sensitivity: "base",
        }),
      );
  }, [classes, matchable]);

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 dark:border-violet-500/30 dark:from-violet-500/10 dark:to-indigo-500/10 sm:flex-1">
          <p className="text-sm font-semibold text-violet-950 dark:text-violet-100">
            {t("sheet.officialTitle")}
          </p>
          <p className="mt-1 text-xs text-violet-800/80 dark:text-violet-200/70">
            {t("sheet.officialSubtitle")}
          </p>
        </div>
        <AddTuitionCourseDialog />
      </div>

      <div className="space-y-4">
        {PRICE_SHEET_SECTIONS.map((section) => {
          if (section.kind === "level_1v1") {
            return (
              <Level1v1Block
                key={section.id}
                subject={section.subject}
                titleKey={section.titleKey}
                classes={matchable}
                classesById={classesById}
              />
            );
          }

          if (section.durationOptions && section.durationOptions.length > 1) {
            return (
              <DurationOptionBlock
                key={section.id}
                titleKey={section.titleKey}
                durationOptions={section.durationOptions}
                rows={section.rows}
                classes={matchable}
                classesById={classesById}
              />
            );
          }

          return (
            <FixedSectionBlock
              key={section.id}
              titleKey={section.titleKey}
              rows={section.rows}
              classes={matchable}
              classesById={classesById}
            />
          );
        })}

        <OtherClassesBlock classes={otherClasses} />
      </div>
    </div>
  );
}
