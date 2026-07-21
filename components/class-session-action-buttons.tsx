"use client";

import { useActionState, useEffect, useState } from "react";

import {
  manualDeductClassSession,
  markClassSessionAbsent,
  type ActionState,
} from "@/app/(dashboard)/class-sessions/actions";
import { useLanguage } from "@/components/language-provider";
import { formatSessionDate } from "@/lib/class-session-credits";

const initialState: ActionState = {};

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

export function ClassSessionActionButtons({
  studentId,
  classId,
  scheduleId,
  compact = false,
}: {
  studentId: number;
  classId: number;
  scheduleId?: number | null;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const today = formatSessionDate(new Date());
  const [sessionDate, setSessionDate] = useState(today);
  const [deductState, deductAction, deductPending] = useActionState(
    manualDeductClassSession,
    initialState,
  );
  const [absentState, absentAction, absentPending] = useActionState(
    markClassSessionAbsent,
    initialState,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = deductPending || absentPending;

  useEffect(() => {
    if (deductState.success) {
      setMessage(t("common.classDeducted"));
      setError(null);
    } else if (deductState.error) {
      setError(deductState.error);
      setMessage(null);
    }
  }, [deductState.error, deductState.success, t]);

  useEffect(() => {
    if (absentState.success) {
      setMessage(t("common.markedAbsent"));
      setError(null);
    } else if (absentState.error) {
      setError(absentState.error);
      setMessage(null);
    }
  }, [absentState.error, absentState.success, t]);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className={compact ? "flex flex-wrap items-end gap-2" : "max-w-xs"}>
        <label className="block w-full text-left">
          <span className="sr-only">{t("common.sessionDate")}</span>
          <input
            type="date"
            value={sessionDate}
            onChange={(event) => setSessionDate(event.target.value)}
            className={inputClassName}
            disabled={pending}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={deductAction}>
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="sessionDate" value={sessionDate} />
          {scheduleId ? (
            <input type="hidden" name="scheduleId" value={scheduleId} />
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {deductPending ? t("common.deducting") : t("common.deductClass")}
          </button>
        </form>

        <form action={absentAction}>
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="sessionDate" value={sessionDate} />
          {scheduleId ? (
            <input type="hidden" name="scheduleId" value={scheduleId} />
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:opacity-60 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
          >
            {absentPending ? t("common.saving") : t("common.markAbsent")}
          </button>
        </form>
      </div>

      {message ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">{message}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
