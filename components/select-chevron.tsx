import { ChevronDownIcon } from "@heroicons/react/16/solid";

/** Down-arrow overlay for native `<select>` elements using `appearance-none`. */
export function SelectChevron() {
  return (
    <ChevronDownIcon
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
    />
  );
}

export const selectFieldClassName =
  "col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800 dark:focus-visible:outline-indigo-500";
