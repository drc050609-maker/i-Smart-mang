"use client";

import { ClassScheduleDialog } from "@/components/edit-class-schedule-dialog";
import { DeleteClassScheduleButton } from "@/components/delete-class-schedule-button";
import { useLanguage } from "@/components/language-provider";
import {
  formatClassSchedule,
  sortClassSchedules,
  type ClassScheduleRow,
} from "@/lib/class-schedule";

export function ClassSchedulesSection({
  classId,
  durationMinutes,
  schedules,
}: {
  classId: number;
  durationMinutes: number | null;
  schedules: ClassScheduleRow[];
}) {
  const { language, t } = useLanguage();
  const sortedSchedules = sortClassSchedules(schedules);

  return (
    <section className="mt-8 border-b border-gray-200 pb-8 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.schedule")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.scheduleHelp")}
          </p>
        </div>
        <ClassScheduleDialog
          classId={classId}
          durationMinutes={durationMinutes}
        />
      </div>

      {sortedSchedules.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noMeetingTimesAdd")}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-200 dark:divide-white/10">
          {sortedSchedules.map((schedule) => (
            <li
              key={schedule.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
            >
              <p className="text-sm text-gray-900 dark:text-white">
                {formatClassSchedule(schedule, {
                  includeRecurrenceLabel: true,
                  language,
                })}
              </p>
              <div className="flex items-center gap-4">
                <ClassScheduleDialog
                  classId={classId}
                  durationMinutes={durationMinutes}
                  schedule={schedule}
                  triggerLabel={t("common.edit")}
                  triggerVariant="text"
                />
                <DeleteClassScheduleButton
                  classId={classId}
                  scheduleId={schedule.id}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
