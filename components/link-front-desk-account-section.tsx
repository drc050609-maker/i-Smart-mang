"use client";

import { useActionState, useEffect, useState } from "react";

import {
  linkFrontDeskAccountToTeacher,
  unlinkFrontDeskAccountFromTeacher,
  type ActionState,
} from "@/app/(dashboard)/settings/actions";
import { useLanguage } from "@/components/language-provider";

export type LinkableFrontDeskAccount = {
  id: string;
  email: string;
  full_name: string | null;
};

const selectClassName =
  "block w-full min-h-[2.375rem] rounded-md bg-white px-3 py-1.5 text-base leading-6 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const initialState: ActionState = {};

function accountLabel(account: LinkableFrontDeskAccount) {
  const name = account.full_name?.trim();
  return name ? `${name} (${account.email})` : account.email;
}

export function LinkFrontDeskAccountSection({
  teacherId,
  linkedAccount,
  availableAccounts,
}: {
  teacherId: number;
  linkedAccount: LinkableFrontDeskAccount | null;
  availableAccounts: LinkableFrontDeskAccount[];
}) {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState(
    availableAccounts[0]?.id ?? "",
  );
  const [linkState, linkAction, linkPending] = useActionState(
    linkFrontDeskAccountToTeacher,
    initialState,
  );
  const [unlinkState, unlinkAction, unlinkPending] = useActionState(
    unlinkFrontDeskAccountFromTeacher,
    initialState,
  );

  useEffect(() => {
    if (linkState.error) setError(linkState.error);
    if (linkState.success) setError(null);
  }, [linkState.error, linkState.success]);

  useEffect(() => {
    if (unlinkState.error) setError(unlinkState.error);
    if (unlinkState.success) setError(null);
  }, [unlinkState.error, unlinkState.success]);

  useEffect(() => {
    if (
      selectedStaffId &&
      !availableAccounts.some((account) => account.id === selectedStaffId)
    ) {
      setSelectedStaffId(availableAccounts[0]?.id ?? "");
    }
  }, [availableAccounts, selectedStaffId]);

  return (
    <section className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-white/10">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        {t("common.linkedLoginAccount")}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("common.linkedLoginAccountHelp")}
      </p>

      {linkedAccount ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {accountLabel(linkedAccount)}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t("common.hoursSyncHint")}
            </p>
          </div>
          <form action={unlinkAction}>
            <input type="hidden" name="staffId" value={linkedAccount.id} />
            <input type="hidden" name="teacherId" value={teacherId} />
            <button
              type="submit"
              disabled={unlinkPending}
              className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-red-600 shadow-xs inset-ring inset-ring-gray-300 hover:bg-red-50 disabled:opacity-60 dark:bg-white/10 dark:text-red-400 dark:inset-ring-white/5 dark:hover:bg-white/20"
            >
              {unlinkPending ? t("common.saving") : t("common.unlinkAccount")}
            </button>
          </form>
        </div>
      ) : availableAccounts.length > 0 ? (
        <form action={linkAction} className="mt-4 space-y-3">
          <input type="hidden" name="teacherId" value={teacherId} />
          <div>
            <label
              htmlFor={`link-front-desk-${teacherId}`}
              className="block text-sm/6 font-medium text-gray-900 dark:text-white"
            >
              {t("common.chooseFrontDeskAccount")}
            </label>
            <div className="mt-2">
              <select
                id={`link-front-desk-${teacherId}`}
                name="staffId"
                required
                value={selectedStaffId}
                onChange={(event) => setSelectedStaffId(event.target.value)}
                className={selectClassName}
              >
                {availableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {accountLabel(account)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={linkPending || !selectedStaffId}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60"
          >
            {linkPending ? t("common.saving") : t("common.linkAccount")}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noUnlinkedFrontDeskAccounts")}
        </p>
      )}

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </section>
  );
}
