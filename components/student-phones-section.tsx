"use client";

import { useState } from "react";

import {
  EditStudentPhoneDialog,
  type StudentPhoneContact,
} from "@/components/add-student-phone-dialog";
import { DeletePhoneButton } from "@/components/delete-phone-button";
import { useLanguage } from "@/components/language-provider";
import { phoneOwnerRoleLabelKey } from "@/lib/phone-owner";

export function StudentPhonesSection({
  studentId,
  phones,
}: {
  studentId: number;
  phones: StudentPhoneContact[];
}) {
  const { t } = useLanguage();
  const [editingPhone, setEditingPhone] = useState<StudentPhoneContact | null>(
    null,
  );

  return (
    <>
      {phones.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noPhones")}
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
                      {t("common.phone")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.phoneOwner")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.ownerName")}
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
                  {phones.map((phone) => (
                    <tr key={phone.id}>
                      <td className="py-4 pr-3 pl-4 text-sm text-gray-900 sm:pl-0 dark:text-white">
                        <span className="font-medium">{phone.phone_number}</span>
                        {phone.is_primary ? (
                          <span className="ml-2 inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {t("common.primaryPhone")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {t(phoneOwnerRoleLabelKey(phone.owner_role))}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {phone.owner_name?.trim() || t("common.notAvailable")}
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setEditingPhone(phone)}
                            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            {t("common.edit")}
                          </button>
                          <DeletePhoneButton
                            studentId={studentId}
                            phoneId={phone.id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editingPhone ? (
        <EditStudentPhoneDialog
          studentId={studentId}
          contact={editingPhone}
          open={Boolean(editingPhone)}
          onClose={() => setEditingPhone(null)}
        />
      ) : null}
    </>
  );
}
