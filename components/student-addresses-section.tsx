"use client";

import { useState } from "react";

import {
  EditStudentAddressDialog,
  type StudentAddress,
} from "@/components/add-student-address-dialog";
import { DeleteAddressButton } from "@/components/delete-address-button";
import { useLanguage } from "@/components/language-provider";

function formatStreet(address: StudentAddress) {
  return address["street 2"]
    ? `${address["street 1"]}, ${address["street 2"]}`
    : address["street 1"];
}

export function StudentAddressesSection({
  studentId,
  addresses,
}: {
  studentId: number;
  addresses: StudentAddress[];
}) {
  const { t } = useLanguage();
  const [editingAddress, setEditingAddress] = useState<StudentAddress | null>(
    null,
  );

  return (
    <>
      {addresses.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noAddresses")}
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
                      {t("common.street")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.city")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.state")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.zip")}
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
                  {addresses.map((address) => (
                    <tr key={address.id}>
                      <td className="py-4 pr-3 pl-4 text-sm text-gray-900 sm:pl-0 dark:text-white">
                        {formatStreet(address)}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {address.city ?? t("common.notAvailable")}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {address.state ?? t("common.notAvailable")}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {address["zip code"] ?? t("common.notAvailable")}
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setEditingAddress(address)}
                            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            {t("common.edit")}
                          </button>
                          <DeleteAddressButton
                            studentId={studentId}
                            addressId={address.id}
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

      {editingAddress ? (
        <EditStudentAddressDialog
          studentId={studentId}
          address={editingAddress}
          open={Boolean(editingAddress)}
          onClose={() => setEditingAddress(null)}
        />
      ) : null}
    </>
  );
}
