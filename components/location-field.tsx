"use client";

import { useLanguage } from "@/components/language-provider";
import type { CampusLocation } from "@/lib/campus-location";

const selectClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

export function LocationField({
  locations,
  defaultValue,
  name = "locationId",
  id = "locationId",
}: {
  locations: CampusLocation[];
  defaultValue?: number | null;
  name?: string;
  id?: string;
}) {
  const { t } = useLanguage();

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {t("common.location")}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        className={`${selectClassName} mt-2`}
      >
        <option value="">{t("common.noLocation")}</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </div>
  );
}
