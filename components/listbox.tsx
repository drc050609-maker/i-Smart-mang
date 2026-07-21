"use client";

import * as Headless from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/16/solid";
import type { ReactNode } from "react";

const buttonClassName =
  "relative block w-full max-w-xs cursor-default rounded-md bg-white py-2 pr-10 pl-3 text-left text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const optionsClassName =
  "z-20 mt-1 max-h-60 w-(--button-width) overflow-auto rounded-md bg-white py-1 text-sm shadow-lg outline outline-black/5 transition duration-100 ease-in data-closed:data-leave:opacity-0 dark:bg-gray-900 dark:outline-white/10";

const optionClassName =
  "group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-focus:bg-indigo-600 data-focus:text-white dark:text-white dark:data-focus:bg-indigo-500";

export function Listbox<T extends string | number>({
  className,
  placeholder,
  autoFocus,
  "aria-label": ariaLabel,
  children,
  ...props
}: {
  className?: string;
  placeholder?: ReactNode;
  autoFocus?: boolean;
  "aria-label"?: string;
  children?: ReactNode;
} & Omit<
  Headless.ListboxProps<"div", T>,
  "as" | "multiple" | "children"
>) {
  return (
    <Headless.Listbox {...props} as="div" multiple={false}>
      <Headless.ListboxButton
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        className={className ? `${buttonClassName} ${className}` : buttonClassName}
      >
        <Headless.ListboxSelectedOption
          options={children}
          placeholder={
            placeholder ? (
              <span className="block truncate text-gray-500 dark:text-gray-400">
                {placeholder}
              </span>
            ) : null
          }
        />
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon
            aria-hidden="true"
            className="size-4 text-gray-500 dark:text-gray-400"
          />
        </span>
      </Headless.ListboxButton>
      <Headless.ListboxOptions
        transition
        anchor="bottom start"
        className={optionsClassName}
      >
        {children}
      </Headless.ListboxOptions>
    </Headless.Listbox>
  );
}

export function ListboxOption<T extends string | number>({
  className,
  children,
  ...props
}: { className?: string; children?: ReactNode } & Omit<
  Headless.ListboxOptionProps<"div", T>,
  "as" | "className" | "children"
>) {
  return (
    <Headless.ListboxOption
      {...props}
      className={className ? `${optionClassName} ${className}` : optionClassName}
    >
      {({ selected }) => (
        <>
          <span className="block truncate group-data-selected:font-semibold">
            {children}
          </span>
          {selected ? (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 group-data-focus:text-white dark:text-indigo-400">
              <CheckIcon aria-hidden="true" className="size-4" />
            </span>
          ) : null}
        </>
      )}
    </Headless.ListboxOption>
  );
}

export function ListboxLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      {...props}
      className={className ? `block truncate ${className}` : "block truncate"}
    />
  );
}
