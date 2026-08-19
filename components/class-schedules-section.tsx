"use client";

import Link from "next/link";

import { ClassScheduleDialog } from "@/components/edit-class-schedule-dialog";
import { DeleteClassScheduleButton } from "@/components/delete-class-schedule-button";
import { useLanguage } from "@/components/language-provider";
import type { StudentOption } from "@/components/student-combobox";
import {
  formatScheduleDate,
  formatTime12Hour,
  formatWeekday,
  hasClassSchedule,
  sortClassSchedules,
  type ClassScheduleRow,
} from "@/lib/class-schedule";
import { formatStudentName } from "@/lib/person-name";

function formatScheduleTimeRange(schedule: ClassScheduleRow) {
  if (!hasClassSchedule(schedule)) return "—";
  return `${formatTime12Hour(schedule.schedule_start_time!)} – ${formatTime12Hour(schedule.schedule_end_time!)}`;
}

export function ClassSchedulesSection({
  classId,
  durationMinutes,
  schedules,
  enrolledStudents,
}: {
  classId: number;
  durationMinutes: number | null;
  schedules: ClassScheduleRow[];
  enrolledStudents: StudentOption[];
}) {
  const { language, t } = useLanguage();
  const studentById = new Map(
    enrolledStudents.map((student) => [student.id, student]),
  );
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
          enrolledStudents={enrolledStudents}
        />
      </div>

      {sortedSchedules.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noMeetingTimesAdd")}
        </p>
      ) : (
        <div className="mt-4 flow-root">
          <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white"
                    >
                      {t("common.student")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.day")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.time")}
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white"
                    >
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {sortedSchedules.map((schedule) => {
                    const student =
                      schedule.student_id != null
                        ? studentById.get(schedule.student_id)
                        : null;

                    return (
                      <tr key={schedule.id}>
                        <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                          {student ? (
                            <Link
                              href={`/students/${student.id}`}
                              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              {formatStudentName(student)}
                            </Link>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">
                              {t("common.unassigned")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {schedule.is_recurring &&
                          schedule.schedule_day_of_week !== null
                            ? formatWeekday(schedule.schedule_day_of_week, language)
                            : schedule.schedule_date
                              ? formatScheduleDate(schedule.schedule_date, language)
                              : t("common.notAvailable")}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {formatScheduleTimeRange(schedule)}
                          <span className="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">
                            {schedule.is_recurring
                              ? t("common.repeatsWeekly")
                              : t("common.oneTime")}
                          </span>
                        </td>
                        <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                          <div className="flex items-center justify-end gap-4">
                            <ClassScheduleDialog
                              classId={classId}
                              durationMinutes={durationMinutes}
                              schedule={schedule}
                              enrolledStudents={enrolledStudents}
                              copy
                              triggerLabel={t("common.copy")}
                              triggerVariant="text"
                            />
                            <ClassScheduleDialog
                              classId={classId}
                              durationMinutes={durationMinutes}
                              schedule={schedule}
                              enrolledStudents={enrolledStudents}
                              triggerLabel={t("common.edit")}
                              triggerVariant="text"
                            />
                            <DeleteClassScheduleButton
                              classId={classId}
                              scheduleId={schedule.id}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
