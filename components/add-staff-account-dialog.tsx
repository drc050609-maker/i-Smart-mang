"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  createStaffAccount,
  type CreateStaffAccountState,
} from "@/app/(dashboard)/settings/actions";
import { useLanguage } from "@/components/language-provider";
import { STAFF_ROLES, formatStaffRole, type StaffRole } from "@/lib/staff-role";
import {
  STAFF_LOCATIONS,
  formatStaffLocation,
  type StaffLocation,
} from "@/lib/staff-location";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: CreateStaffAccountState = {};

export type FrontDeskTeacherOption = {
  id: number;
  first_name: string;
  last_name: string | null;
  location_slug: StaffLocation;
  hourly_rate_cents: number | null;
};

function teacherLabel(teacher: FrontDeskTeacherOption) {
  const name = [teacher.first_name, teacher.last_name].filter(Boolean).join(" ");
  return name || `Front desk #${teacher.id}`;
}

export function AddStaffAccountDialog({
  defaultLocation = "brooklyn",
  frontDeskTeachers = [],
}: {
  defaultLocation?: StaffLocation;
  frontDeskTeachers?: FrontDeskTeacherOption[];
}) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<StaffRole>("manager");
  const [location, setLocation] = useState<StaffLocation>(defaultLocation);
  const [teacherId, setTeacherId] = useState("new");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createStaffAccount,
    initialState,
  );

  const isStatenIsland = defaultLocation === "staten_island";
  const availableRoles = isStatenIsland
    ? STAFF_ROLES.filter((value) => value === "manager" || value === "front_desk")
    : STAFF_ROLES;

  const teachersForCampus = useMemo(
    () =>
      frontDeskTeachers.filter((teacher) => teacher.location_slug === location),
    [frontDeskTeachers, location],
  );

  function openDialog() {
    setError(null);
    setRole(isStatenIsland ? "manager" : "manager");
    setLocation(defaultLocation);
    setTeacherId("new");
    setOpen(true);
  }

  function closeDialog() {
    setError(null);
    setOpen(false);
  }

  useEffect(() => {
    if (state.error) {
      setError(state.error);
    }

    if (state.success) {
      formRef.current?.reset();
      setError(null);
      setOpen(false);
    }
  }, [state.error, state.success]);

  useEffect(() => {
    setLocation(defaultLocation);
  }, [defaultLocation]);

  useEffect(() => {
    if (teacherId !== "new" && !teachersForCampus.some((row) => String(row.id) === teacherId)) {
      setTeacherId("new");
    }
  }, [teachersForCampus, teacherId]);

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
      >
        <PlusIcon aria-hidden="true" className="size-4" />
        {t("common.addStaffAccount")}
      </button>

      <Dialog open={open} onClose={closeDialog} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/50 transition-opacity duration-200 ease-out data-closed:opacity-0"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
            >
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:bg-gray-900 dark:hover:text-gray-300"
                >
                  <span className="sr-only">{t("common.close")}</span>
                  <XMarkIcon aria-hidden="true" className="size-6" />
                </button>
              </div>

              <DialogTitle
                as="h3"
                className="text-base font-semibold text-gray-900 dark:text-white"
              >
                {isStatenIsland
                  ? t("common.addStatenIslandManager")
                  : t("common.addStaffAccount")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {role === "front_desk"
                  ? t("common.frontDeskAccountHelp")
                  : t("settings.staffAccountsDescription")}
              </p>

              <form
                key={`${defaultLocation}-${role}`}
                ref={formRef}
                action={formAction}
                className="mt-6 space-y-4"
              >
                <div>
                  <label htmlFor="fullName" className={labelClassName}>
                    {t("common.name")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required={role === "front_desk" && teacherId === "new"}
                      autoComplete="name"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className={labelClassName}>
                    {t("common.auth.emailAddress")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className={labelClassName}>
                    {t("common.auth.password")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="role" className={labelClassName}>
                    {t("common.role")}
                  </label>
                  <div className="mt-2">
                    {isStatenIsland && availableRoles.length === 1 ? (
                      <>
                        <input type="hidden" name="role" value={availableRoles[0]} />
                        <div className={inputClassName}>
                          {formatStaffRole(availableRoles[0]!, language)}
                        </div>
                      </>
                    ) : (
                      <select
                        id="role"
                        name="role"
                        required
                        value={role}
                        onChange={(event) =>
                          setRole(event.target.value as StaffRole)
                        }
                        className={inputClassName}
                      >
                        {availableRoles.map((value) => (
                          <option key={value} value={value}>
                            {formatStaffRole(value, language)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {!isStatenIsland ? (
                  <div>
                    <label htmlFor="location" className={labelClassName}>
                      {t("common.campus")}
                    </label>
                    <div className="mt-2">
                      <select
                        id="location"
                        name="location"
                        required
                        value={location}
                        onChange={(event) =>
                          setLocation(event.target.value as StaffLocation)
                        }
                        className={inputClassName}
                      >
                        {STAFF_LOCATIONS.map((value) => (
                          <option key={value} value={value}>
                            {formatStaffLocation(value, language)} iSmart
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <input type="hidden" name="location" value="staten_island" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("common.campus")}:{" "}
                      {formatStaffLocation("staten_island", language)} iSmart
                    </p>
                  </>
                )}

                {role === "front_desk" ? (
                  <>
                    <div>
                      <label htmlFor="teacherId" className={labelClassName}>
                        {t("common.linkFrontDeskTeacher")}
                      </label>
                      <div className="mt-2">
                        <select
                          id="teacherId"
                          name="teacherId"
                          required
                          value={teacherId}
                          onChange={(event) => setTeacherId(event.target.value)}
                          className={inputClassName}
                        >
                          <option value="new">
                            {t("common.createNewFrontDeskTeacher")}
                          </option>
                          {teachersForCampus.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacherLabel(teacher)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {teachersForCampus.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {t("common.noFrontDeskTeachers")}
                        </p>
                      ) : null}
                    </div>

                    {teacherId === "new" ? (
                      <div>
                        <label htmlFor="hourlyRate" className={labelClassName}>
                          {t("common.hourlyRate")}
                        </label>
                        <div className="mt-2">
                          <input
                            id="hourlyRate"
                            name="hourlyRate"
                            type="text"
                            inputMode="decimal"
                            required
                            placeholder={t("common.hourlyRatePlaceholder")}
                            className={inputClassName}
                          />
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                ) : null}

                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse sm:gap-3">
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 sm:w-auto dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
                  >
                    {pending ? t("common.creating") : t("common.createAccount")}
                  </button>
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
