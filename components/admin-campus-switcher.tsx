"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

import { setActiveCampus } from "@/app/(dashboard)/campus-actions";
import { useLanguage } from "@/components/language-provider";
import {
  formatStaffLocationLabel,
  type StaffLocation,
} from "@/lib/staff-location";

const campuses: StaffLocation[] = ["brooklyn", "staten_island"];

export function AdminCampusSwitcher({
  activeCampus,
  canSwitch = false,
}: {
  activeCampus: StaffLocation;
  canSwitch?: boolean;
}) {
  const { language } = useLanguage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const label = formatStaffLocationLabel(activeCampus, language);

  if (!canSwitch) {
    return (
      <p className="text-sm font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
        {label}
      </p>
    );
  }

  function selectCampus(location: StaffLocation) {
    if (location === activeCampus || pending) return;

    startTransition(async () => {
      await setActiveCampus(location);
      router.refresh();
    });
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        disabled={pending}
        className="inline-flex items-center gap-1 text-sm font-medium uppercase tracking-wide text-indigo-600 hover:text-indigo-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 disabled:opacity-60 dark:text-indigo-400 dark:hover:text-indigo-300 dark:focus:outline-indigo-500"
      >
        {label}
        <ChevronDownIcon aria-hidden="true" className="size-4" />
        <span className="sr-only">Change campus</span>
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom start"
        className="z-50 mt-2 w-48 origin-top-left rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:opacity-0 dark:bg-gray-900 dark:outline-white/10"
      >
        {campuses.map((location) => {
          const selected = location === activeCampus;

          return (
            <MenuItem key={location}>
              <button
                type="button"
                onClick={() => selectCampus(location)}
                className={`block w-full px-3 py-2 text-left text-sm data-focus:bg-gray-50 dark:data-focus:bg-white/5 ${
                  selected
                    ? "font-semibold text-indigo-600 dark:text-indigo-400"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {formatStaffLocationLabel(location, language)}
              </button>
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
}
