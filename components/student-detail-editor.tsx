"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  DocumentArrowUpIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

import {
  deleteStudentReceipt,
  saveStudentDetails,
  uploadStudentReceipt,
  type ActionState,
  type SaveStudentDetailsState,
} from "@/app/(dashboard)/students/actions";
import {
  ClassMultiCombobox,
  type ClassOption,
} from "@/components/class-multi-combobox";
import { AddStudentClassesDialog } from "@/components/add-student-classes-dialog";
import { DeleteStudentButton } from "@/components/delete-student-button";
import { useLanguage } from "@/components/language-provider";
import { SelectChevron, selectFieldClassName } from "@/components/select-chevron";
import { StudentAttendanceHistorySection } from "@/components/student-attendance-history-section";
import { StudentClassCreditsSection } from "@/components/student-class-credits-section";
import type { StudentOption } from "@/components/student-combobox";
import {
  GRADE_LEVEL_OPTIONS,
  formatClassSubject,
  formatClassSubjectWithGrade,
} from "@/lib/class-subject";
import { formatTrialFormat } from "@/lib/class-lesson-type";
import type { StudentClassCreditRow } from "@/lib/class-session-credits";
import {
  PHONE_OWNER_ROLES,
  phoneOwnerRoleLabelKey,
  type PhoneOwnerRole,
} from "@/lib/phone-owner";
import { classHref } from "@/lib/return-to";
import {
  formatReceiptUploadedAt,
  type StudentReceiptView,
} from "@/lib/student-receipt";
import type { StudentAttendanceHistoryRow } from "@/lib/student-attendance-history";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "text-sm font-medium text-gray-500 dark:text-gray-400";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export type StudentDetailProfile = {
  id: number;
  firstName: string;
  lastName: string | null;
  dob: string | null;
  experience: string | null;
  gender: string | null;
  parentName: string | null;
  trialTimePreference: string | null;
  isActive: boolean;
  startingClassCredits: number;
  notes: string | null;
};

export type StudentDetailPhone = {
  id: number;
  phoneNumber: string;
  ownerRole: PhoneOwnerRole;
  ownerName: string | null;
  isPrimary: boolean;
};

export type StudentDetailAddress = {
  id: number;
  street1: string;
  street2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
};

export type StudentDetailEnrollment = {
  id: number;
  classId: number;
  subject: string;
  lessonType: string | null;
  trialFormat: string | null;
  teacherName: string | null;
  roomNumber: string | null;
  gradeLevel: string | null;
  isActive: boolean;
};

type PhoneDraft = {
  key: string;
  id: number | null;
  phoneNumber: string;
  ownerRole: PhoneOwnerRole;
  ownerName: string;
  isPrimary: boolean;
};

type AddressDraft = {
  key: string;
  id: number | null;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zipCode: string;
};

type EnrollmentDraft = StudentDetailEnrollment & { removed: boolean };

type StudentDraft = {
  firstName: string;
  lastName: string;
  dob: string;
  isActive: boolean;
  notes: string;
  experience: string;
  startingClassCredits: number;
  gender: string;
  parentName: string;
  trialTimePreference: string;
  phones: PhoneDraft[];
  deletedPhoneIds: number[];
  addresses: AddressDraft[];
  deletedAddressIds: number[];
  enrollments: EnrollmentDraft[];
  newClasses: ClassOption[];
  credits: StudentClassCreditRow[];
  receiptNotes: Record<number, string>;
};

const initialSaveState: SaveStudentDetailsState = {};
const initialUploadState: ActionState = {};

function studentName(firstName: string, lastName: string | null) {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

function formatDob(dob: string | null, locale: string) {
  if (!dob) return "—";
  return new Date(`${dob}T00:00:00`).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStreet(address: StudentDetailAddress) {
  return address.street2
    ? `${address.street1}, ${address.street2}`
    : address.street1;
}

function createDraft(
  student: StudentDetailProfile,
  phones: StudentDetailPhone[],
  addresses: StudentDetailAddress[],
  enrollments: StudentDetailEnrollment[],
  credits: StudentClassCreditRow[],
  receipts: StudentReceiptView[],
): StudentDraft {
  return {
    firstName: student.firstName,
    lastName: student.lastName ?? "",
    dob: student.dob ?? "",
    isActive: student.isActive,
    notes: student.notes ?? "",
    experience: student.experience ?? "",
    startingClassCredits: student.startingClassCredits,
    gender: student.gender ?? "",
    parentName: student.parentName ?? "",
    trialTimePreference: student.trialTimePreference ?? "",
    phones: phones.map((phone) => ({
      key: `phone-${phone.id}`,
      id: phone.id,
      phoneNumber: phone.phoneNumber,
      ownerRole: phone.ownerRole,
      ownerName: phone.ownerName ?? "",
      isPrimary: phone.isPrimary,
    })),
    deletedPhoneIds: [],
    addresses: addresses.map((address) => ({
      key: `address-${address.id}`,
      id: address.id,
      street1: address.street1,
      street2: address.street2 ?? "",
      city: address.city ?? "",
      state: address.state ?? "",
      zipCode: address.zipCode ?? "",
    })),
    deletedAddressIds: [],
    enrollments: enrollments.map((enrollment) => ({
      ...enrollment,
      removed: false,
    })),
    newClasses: [],
    credits: credits.map((row) => ({
      ...row,
      balance: { ...row.balance },
    })),
    receiptNotes: Object.fromEntries(
      receipts.map((receipt) => [receipt.id, receipt.note ?? ""]),
    ),
  };
}

export function StudentDetailEditor({
  student,
  phones,
  addresses,
  enrollments,
  availableClasses,
  creditRows,
  studentOptions,
  receipts,
  totalClassesTaken,
  classesTakenByClass,
  attendanceHistoryRows,
  attendanceHistoryError,
  phonesError,
  addressError,
  enrollmentError,
  allClassesError,
  creditsError,
  receiptsError,
}: {
  student: StudentDetailProfile;
  phones: StudentDetailPhone[];
  addresses: StudentDetailAddress[];
  enrollments: StudentDetailEnrollment[];
  availableClasses: ClassOption[];
  creditRows: StudentClassCreditRow[];
  studentOptions: StudentOption[];
  receipts: StudentReceiptView[];
  totalClassesTaken: number;
  classesTakenByClass: Array<{ classId: number; classSubject: string; count: number }>;
  attendanceHistoryRows: StudentAttendanceHistoryRow[];
  attendanceHistoryError: string | null;
  phonesError: string | null;
  addressError: string | null;
  enrollmentError: string | null;
  allClassesError: string | null;
  creditsError: string | null;
  receiptsError: string | null;
}) {
  const { language, t } = useLanguage();
  const locale = language === "zh" ? "zh-CN" : "en-US";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StudentDraft>(() =>
    createDraft(student, phones, addresses, enrollments, creditRows, receipts),
  );
  const [error, setError] = useState<string | null>(null);
  const payloadRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveState, saveAction, savePending] = useActionState(
    saveStudentDetails,
    initialSaveState,
  );
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadStudentReceipt,
    initialUploadState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteStudentReceipt,
    initialUploadState,
  );

  const displayName = editing
    ? studentName(draft.firstName, draft.lastName || null)
    : studentName(student.firstName, student.lastName);

  function startEditing() {
    setError(null);
    setDraft(
      createDraft(student, phones, addresses, enrollments, creditRows, receipts),
    );
    setEditing(true);
  }

  function cancelEditing() {
    setError(null);
    setEditing(false);
    setDraft(
      createDraft(student, phones, addresses, enrollments, creditRows, receipts),
    );
  }

  useEffect(() => {
    if (saveState.error) setError(saveState.error);
    if (saveState.success) {
      setError(null);
      setEditing(false);
    }
  }, [saveState.error, saveState.success]);

  useEffect(() => {
    if (uploadState.error) setError(uploadState.error);
    if (uploadState.success) {
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [uploadState.error, uploadState.success]);

  useEffect(() => {
    if (deleteState.error) setError(deleteState.error);
    if (deleteState.success) setError(null);
  }, [deleteState.error, deleteState.success]);

  const visibleEnrollments = editing
    ? draft.enrollments.filter((enrollment) => !enrollment.removed)
    : enrollments;
  const removedClassIds = new Set(
    draft.enrollments.filter((row) => row.removed).map((row) => row.classId),
  );
  const visibleCredits = editing
    ? draft.credits.filter((row) => !removedClassIds.has(row.classId))
    : creditRows;

  const comboboxClasses = useMemo(() => {
    const enrolledIds = new Set(
      draft.enrollments
        .filter((row) => !row.removed)
        .map((row) => row.classId),
    );
    return availableClasses.filter((classRow) => !enrolledIds.has(classRow.id));
  }, [availableClasses, draft.enrollments]);

  const showTrialFields =
    editing ||
    Boolean(
      student.gender || student.parentName || student.trialTimePreference,
    );

  function writePayload() {
    if (!payloadRef.current) return;
    payloadRef.current.value = JSON.stringify({
      firstName: draft.firstName,
      lastName: draft.lastName,
      dob: draft.dob,
      isActive: draft.isActive,
      notes: draft.notes,
      experience: draft.experience,
      startingClassCredits: draft.startingClassCredits,
      gender: draft.gender,
      parentName: draft.parentName,
      trialTimePreference: draft.trialTimePreference,
      phones: draft.phones
        .filter((phone) => phone.id || phone.phoneNumber.trim())
        .map((phone) => ({
          id: phone.id,
          phoneNumber: phone.phoneNumber,
          ownerRole: phone.ownerRole,
          ownerName: phone.ownerName,
          isPrimary: phone.isPrimary,
        })),
      deletedPhoneIds: draft.deletedPhoneIds,
      addresses: draft.addresses
        .filter((address) => address.id || address.street1.trim())
        .map((address) => ({
          id: address.id,
          street1: address.street1,
          street2: address.street2,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
        })),
      deletedAddressIds: draft.deletedAddressIds,
      enrollments: draft.enrollments
        .filter((enrollment) => !enrollment.removed)
        .map((enrollment) => ({
          id: enrollment.id,
          gradeLevel: enrollment.gradeLevel,
          isActive: enrollment.isActive,
        })),
      removedEnrollmentIds: draft.enrollments
        .filter((enrollment) => enrollment.removed)
        .map((enrollment) => enrollment.id),
      newClassIds: draft.newClasses.map((classRow) => classRow.id),
      credits: visibleCredits.map((row) => ({
        classId: row.classId,
        sessionsTotal: row.balance.sessions_total,
        sessionsRemaining: row.balance.sessions_remaining,
        sessionsUsed: row.balance.sessions_used,
        absenceCount: row.balance.absence_count,
      })),
      receiptNotes: receipts.map((receipt) => ({
        id: receipt.id,
        note: draft.receiptNotes[receipt.id] ?? receipt.note ?? "",
      })),
    });
  }

  const pending = savePending || uploadPending || deletePending;
  const returnTo = `/students/${student.id}`;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/students"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {t("common.backToStudents")}
        </Link>
      </div>

      <div className="sticky top-[4.5rem] z-30 mb-5 rounded-lg border border-gray-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur lg:top-0 dark:border-white/10 dark:bg-gray-950/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {editing ? t("common.editStudent") : displayName}
            </p>
            {editing ? (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {t("common.editPageHelp")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={savePending}
                  className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:opacity-60 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  form="student-edit-form"
                  disabled={savePending}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {savePending ? t("common.saving") : t("common.saveChanges")}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {t("common.editStudent")}
                </button>
                <DeleteStudentButton
                  studentId={student.id}
                  studentName={displayName}
                />
              </>
            )}
          </div>
        </div>
        {error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      <form
        id="student-edit-form"
        action={saveAction}
        onSubmit={writePayload}
        className={editing ? undefined : "hidden"}
      >
        <input type="hidden" name="studentId" value={student.id} />
        <input ref={payloadRef} type="hidden" name="payload" value="" />
      </form>

      <div className="border-b border-gray-200 pb-5 dark:border-white/10">
        {editing ? null : (
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {displayName}
          </h1>
        )}

        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {editing ? (
            <>
              <EditField label={t("common.firstName")}>
                <input
                  value={draft.firstName}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  className={inputClassName}
                  required
                />
              </EditField>
              <EditField label={t("common.lastName")}>
                <input
                  value={draft.lastName}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </EditField>
            </>
          ) : null}

          <EditField label={t("common.dateOfBirth")}>
            {editing ? (
              <input
                type="date"
                value={draft.dob}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, dob: event.target.value }))
                }
                className={inputClassName}
              />
            ) : (
              <span>{formatDob(student.dob, locale)}</span>
            )}
          </EditField>

          {showTrialFields ? (
            <>
              <EditField label={t("trial.gender")}>
                {editing ? (
                  <div className="relative grid grid-cols-1">
                    <select
                      value={draft.gender}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          gender: event.target.value,
                        }))
                      }
                      className={selectFieldClassName}
                    >
                      <option value="">{t("common.notAvailable")}</option>
                      <option value="male">{t("trial.genderMale")}</option>
                      <option value="female">{t("trial.genderFemale")}</option>
                    </select>
                    <SelectChevron />
                  </div>
                ) : (
                  <span>
                    {student.gender === "male"
                      ? t("trial.genderMale")
                      : student.gender === "female"
                        ? t("trial.genderFemale")
                        : "—"}
                  </span>
                )}
              </EditField>
              <EditField label={t("trial.parentName")}>
                {editing ? (
                  <input
                    value={draft.parentName}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        parentName: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                ) : (
                  <span>{student.parentName?.trim() || "—"}</span>
                )}
              </EditField>
              <EditField label={t("trial.suitableTime")}>
                {editing ? (
                  <div className="relative grid grid-cols-1">
                    <select
                      value={draft.trialTimePreference}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          trialTimePreference: event.target.value,
                        }))
                      }
                      className={selectFieldClassName}
                    >
                      <option value="">{t("common.notAvailable")}</option>
                      <option value="weekday">{t("trial.weekday")}</option>
                      <option value="weekend">{t("trial.weekend")}</option>
                    </select>
                    <SelectChevron />
                  </div>
                ) : (
                  <span>
                    {student.trialTimePreference === "weekday"
                      ? t("trial.weekday")
                      : student.trialTimePreference === "weekend"
                        ? t("trial.weekend")
                        : "—"}
                  </span>
                )}
              </EditField>
            </>
          ) : null}

          <EditField label={t("common.status")}>
            {editing ? (
              <div className="relative grid grid-cols-1">
                <select
                  value={draft.isActive ? "true" : "false"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      isActive: event.target.value === "true",
                    }))
                  }
                  className={selectFieldClassName}
                >
                  <option value="true">{t("common.active")}</option>
                  <option value="false">{t("common.inactive")}</option>
                </select>
                <SelectChevron />
              </div>
            ) : (
              <span
                className={
                  student.isActive
                    ? "text-green-700 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400"
                }
              >
                {student.isActive ? t("common.active") : t("common.inactive")}
              </span>
            )}
          </EditField>

          <EditField label={t("common.startingClassSessions")}>
            {editing ? (
              <input
                type="number"
                min={0}
                max={500}
                step={1}
                value={draft.startingClassCredits}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startingClassCredits: Number(event.target.value) || 0,
                  }))
                }
                className={inputClassName}
              />
            ) : (
              <span>{student.startingClassCredits}</span>
            )}
          </EditField>

          <EditField label={t("common.totalClassesTaken")}>
            <span className="font-semibold">{totalClassesTaken}</span>
          </EditField>

          <EditField label={t("common.studentId")}>
            <span>{student.id}</span>
          </EditField>
        </dl>

        <div className="mt-4">
          <p className={labelClassName}>{t("leads.experience")}</p>
          {editing ? (
            <textarea
              rows={3}
              value={draft.experience}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  experience: event.target.value,
                }))
              }
              placeholder={t("leads.experiencePlaceholder")}
              className={`${inputClassName} mt-1`}
            />
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
              {student.experience?.trim() || t("common.notAvailable")}
            </p>
          )}
        </div>

        <div className="mt-4">
          <p className={labelClassName}>{t("common.notes")}</p>
          {editing ? (
            <textarea
              rows={4}
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder={t("common.studentNotesPlaceholder")}
              className={`${inputClassName} mt-1`}
            />
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
              {student.notes?.trim() ? student.notes : t("common.noStudentNotes")}
            </p>
          )}
        </div>

        {receiptsError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", {
              entity: t("common.receipts"),
              message: receiptsError,
            })}
          </p>
        ) : null}
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.phones")}
          </h2>
          {editing ? (
            <button
              type="button"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  phones: [
                    ...current.phones,
                    {
                      key: `phone-new-${Date.now()}`,
                      id: null,
                      phoneNumber: "",
                      ownerRole: "mother",
                      ownerName: "",
                      isPrimary: current.phones.length === 0,
                    },
                  ],
                }))
              }
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              {t("common.addPhone")}
            </button>
          ) : null}
        </div>
        {phonesError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", {
              entity: t("common.phones"),
              message: phonesError,
            })}
          </p>
        ) : editing ? (
          draft.phones.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t("common.noPhones")}
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {draft.phones.map((phone) => (
                <div
                  key={phone.key}
                  className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-4 dark:border-white/10"
                >
                  <input
                    type="tel"
                    value={phone.phoneNumber}
                    placeholder={t("common.phone")}
                    onChange={(event) =>
                      updatePhone(phone.key, { phoneNumber: event.target.value })
                    }
                    className={inputClassName}
                  />
                  <div className="relative grid grid-cols-1">
                    <select
                      value={phone.ownerRole}
                      onChange={(event) =>
                        updatePhone(phone.key, {
                          ownerRole: event.target.value as PhoneOwnerRole,
                        })
                      }
                      className={selectFieldClassName}
                    >
                      {PHONE_OWNER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(phoneOwnerRoleLabelKey(role))}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </div>
                  <input
                    value={phone.ownerName}
                    placeholder={t("common.ownerName")}
                    onChange={(event) =>
                      updatePhone(phone.key, { ownerName: event.target.value })
                    }
                    className={inputClassName}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={phone.isPrimary}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            phones: current.phones.map((row) => ({
                              ...row,
                              isPrimary:
                                row.key === phone.key
                                  ? event.target.checked
                                  : event.target.checked
                                    ? false
                                    : row.isPrimary,
                            })),
                          }))
                        }
                      />
                      {t("common.primaryPhone")}
                    </label>
                    <button
                      type="button"
                      onClick={() => removePhone(phone)}
                      className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                    >
                      {t("common.remove")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : phones.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t("common.noPhones")}
          </p>
        ) : (
          <PhoneTable phones={phones} />
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.address")}
          </h2>
          {editing ? (
            <button
              type="button"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  addresses: [
                    ...current.addresses,
                    {
                      key: `address-new-${Date.now()}`,
                      id: null,
                      street1: "",
                      street2: "",
                      city: "",
                      state: "",
                      zipCode: "",
                    },
                  ],
                }))
              }
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              {t("common.addAddress")}
            </button>
          ) : null}
        </div>
        {addressError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", {
              entity: t("common.address"),
              message: addressError,
            })}
          </p>
        ) : editing ? (
          draft.addresses.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t("common.noAddresses")}
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {draft.addresses.map((address) => (
                <div
                  key={address.key}
                  className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-2 dark:border-white/10"
                >
                  <input
                    value={address.street1}
                    placeholder={t("common.street1")}
                    onChange={(event) =>
                      updateAddress(address.key, { street1: event.target.value })
                    }
                    className={`${inputClassName} sm:col-span-2`}
                  />
                  <input
                    value={address.street2}
                    placeholder={t("common.street2")}
                    onChange={(event) =>
                      updateAddress(address.key, { street2: event.target.value })
                    }
                    className={`${inputClassName} sm:col-span-2`}
                  />
                  <input
                    value={address.city}
                    placeholder={t("common.city")}
                    onChange={(event) =>
                      updateAddress(address.key, { city: event.target.value })
                    }
                    className={inputClassName}
                  />
                  <div className="relative grid grid-cols-1">
                    <select
                      value={address.state}
                      onChange={(event) =>
                        updateAddress(address.key, { state: event.target.value })
                      }
                      className={selectFieldClassName}
                    >
                      <option value="">{t("common.selectState")}</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </div>
                  <input
                    value={address.zipCode}
                    placeholder={t("common.zip")}
                    onChange={(event) =>
                      updateAddress(address.key, { zipCode: event.target.value })
                    }
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    onClick={() => removeAddress(address)}
                    className="text-left text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                  >
                    {t("common.remove")}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : addresses.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t("common.noAddresses")}
          </p>
        ) : (
          <AddressTable addresses={addresses} />
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.classes")}
          </h2>
          {editing ? null : (
            <AddStudentClassesDialog
              studentId={student.id}
              classes={availableClasses}
            />
          )}
        </div>
        {allClassesError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", {
              entity: t("nav.classes"),
              message: allClassesError,
            })}
          </p>
        ) : null}
        {enrollmentError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", {
              entity: t("common.classes"),
              message: enrollmentError,
            })}
          </p>
        ) : visibleEnrollments.length === 0 && !(editing && draft.newClasses.length) ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t("common.notEnrolled")}
          </p>
        ) : (
          <EnrollmentTable
            enrollments={
              editing
                ? visibleEnrollments
                : enrollments
            }
            editing={editing}
            language={language}
            studentId={student.id}
            onGradeChange={(id, gradeLevel) =>
              setDraft((current) => ({
                ...current,
                enrollments: current.enrollments.map((row) =>
                  row.id === id ? { ...row, gradeLevel } : row,
                ),
              }))
            }
            onActiveChange={(id, isActive) =>
              setDraft((current) => ({
                ...current,
                enrollments: current.enrollments.map((row) =>
                  row.id === id ? { ...row, isActive } : row,
                ),
              }))
            }
            onRemove={(id) =>
              setDraft((current) => ({
                ...current,
                enrollments: current.enrollments.map((row) =>
                  row.id === id ? { ...row, removed: true } : row,
                ),
              }))
            }
          />
        )}
        {editing ? (
          <div className="mt-4">
            <p className={`${labelClassName} mb-2`}>{t("common.assignClasses")}</p>
            <ClassMultiCombobox
              id="student-detail-new-classes"
              classes={comboboxClasses}
              selected={draft.newClasses}
              onChange={(newClasses) =>
                setDraft((current) => ({ ...current, newClasses }))
              }
            />
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.classCredits")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {editing
              ? t("common.editClassCreditsHelp")
              : t("common.enrollToTrack")}
          </p>
        </div>
        {creditsError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", {
              entity: t("common.classCredits"),
              message: creditsError,
            })}
          </p>
        ) : (
          <StudentClassCreditsSection
            rows={visibleCredits}
            studentOptions={studentOptions}
            returnTo={returnTo}
            editing={editing}
            onCreditChange={(classId, field, value) =>
              setDraft((current) => ({
                ...current,
                credits: current.credits.map((row) =>
                  row.classId === classId
                    ? {
                        ...row,
                        balance: { ...row.balance, [field]: value },
                      }
                    : row,
                ),
              }))
            }
          />
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("common.receipts")}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.receiptsHelp")}
        </p>

        {receipts.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t("common.noReceiptsYet")}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {receipts.map((receipt) => (
              <li
                key={receipt.id}
                className="flex gap-3 rounded-lg border border-gray-200 p-3 dark:border-white/10"
              >
                {receipt.url ? (
                  <a href={receipt.url} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receipt.url}
                      alt={receipt.file_name}
                      className="size-16 rounded-md object-cover"
                    />
                  </a>
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-white/10">
                    <PhotoIcon className="size-6 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {receipt.file_name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {formatReceiptUploadedAt(receipt.created_at, language)}
                  </p>
                  {editing ? (
                    <input
                      value={draft.receiptNotes[receipt.id] ?? ""}
                      maxLength={200}
                      placeholder={t("common.receiptNotePlaceholder")}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          receiptNotes: {
                            ...current.receiptNotes,
                            [receipt.id]: event.target.value,
                          },
                        }))
                      }
                      className={`${inputClassName} mt-2`}
                    />
                  ) : receipt.note?.trim() ? (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {receipt.note}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {receipt.url ? (
                      <a
                        href={receipt.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                      >
                        {t("common.viewReceipt")}
                      </a>
                    ) : null}
                    <form action={deleteAction}>
                      <input type="hidden" name="studentId" value={student.id} />
                      <input type="hidden" name="receiptId" value={receipt.id} />
                      <button
                        type="submit"
                        disabled={pending}
                        className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-60 dark:text-red-400"
                      >
                        {t("common.delete")}
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form action={uploadAction} className="mt-4 space-y-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-white/15">
          <input type="hidden" name="studentId" value={student.id} />
          <div>
            <label htmlFor={`student-receipt-${student.id}`} className={labelClassName}>
              {t("common.receiptPhoto")}
            </label>
            <input
              ref={fileInputRef}
              id={`student-receipt-${student.id}`}
              name="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
              required
              className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-indigo-700 dark:text-gray-300 dark:file:bg-indigo-500/10 dark:file:text-indigo-300"
            />
          </div>
          <input
            name="note"
            type="text"
            maxLength={200}
            placeholder={t("common.receiptNotePlaceholder")}
            className={inputClassName}
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500"
          >
            <DocumentArrowUpIcon aria-hidden="true" className="size-4" />
            {uploadPending ? t("common.saving") : t("common.saveReceipt")}
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("common.classHistory")}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.classHistoryHelp")}
        </p>

        {classesTakenByClass.length > 0 ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t("common.allTimeByClass")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {classesTakenByClass.map((summary) => (
                <li key={summary.classId}>
                  <Link
                    href={classHref(summary.classId, returnTo)}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  >
                    <span>
                      {formatClassSubject(summary.classSubject, language)}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {summary.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {attendanceHistoryError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", {
              entity: t("common.classHistory"),
              message: attendanceHistoryError,
            })}
          </p>
        ) : (
          <StudentAttendanceHistorySection
            rows={attendanceHistoryRows}
            returnTo={returnTo}
          />
        )}
      </section>
    </div>
  );

  function updatePhone(key: string, patch: Partial<PhoneDraft>) {
    setDraft((current) => ({
      ...current,
      phones: current.phones.map((phone) =>
        phone.key === key ? { ...phone, ...patch } : phone,
      ),
    }));
  }

  function removePhone(phone: PhoneDraft) {
    setDraft((current) => ({
      ...current,
      phones: current.phones.filter((row) => row.key !== phone.key),
      deletedPhoneIds: phone.id
        ? [...current.deletedPhoneIds, phone.id]
        : current.deletedPhoneIds,
    }));
  }

  function updateAddress(key: string, patch: Partial<AddressDraft>) {
    setDraft((current) => ({
      ...current,
      addresses: current.addresses.map((address) =>
        address.key === key ? { ...address, ...patch } : address,
      ),
    }));
  }

  function removeAddress(address: AddressDraft) {
    setDraft((current) => ({
      ...current,
      addresses: current.addresses.filter((row) => row.key !== address.key),
      deletedAddressIds: address.id
        ? [...current.deletedAddressIds, address.id]
        : current.deletedAddressIds,
    }));
  }
}

function EditField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className={labelClassName}>{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{children}</dd>
    </div>
  );
}

function PhoneTable({ phones }: { phones: StudentDetailPhone[] }) {
  const { t } = useLanguage();
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
        <thead>
          <tr>
            <th className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white">
              {t("common.phone")}
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
              {t("common.phoneOwner")}
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
              {t("common.ownerName")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
          {phones.map((phone) => (
            <tr key={phone.id}>
              <td className="py-4 pr-3 pl-4 text-sm text-gray-900 sm:pl-0 dark:text-white">
                <span className="font-medium">{phone.phoneNumber}</span>
                {phone.isPrimary ? (
                  <span className="ml-2 inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {t("common.primaryPhone")}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                {t(phoneOwnerRoleLabelKey(phone.ownerRole))}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                {phone.ownerName?.trim() || t("common.notAvailable")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddressTable({ addresses }: { addresses: StudentDetailAddress[] }) {
  const { t } = useLanguage();
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
        <thead>
          <tr>
            <th className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white">
              {t("common.street")}
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
              {t("common.city")}
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
              {t("common.state")}
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
              {t("common.zip")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
          {addresses.map((address) => (
            <tr key={address.id}>
              <td className="py-4 pr-3 pl-4 text-sm text-gray-900 sm:pl-0 dark:text-white">
                {formatStreet(address)}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                {address.city ?? t("common.notAvailable")}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                {address.state ?? t("common.notAvailable")}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                {address.zipCode ?? t("common.notAvailable")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnrollmentTable({
  enrollments,
  editing,
  language,
  studentId,
  onGradeChange,
  onActiveChange,
  onRemove,
}: {
  enrollments: StudentDetailEnrollment[];
  editing: boolean;
  language: import("@/lib/language").AppLanguage;
  studentId: number;
  onGradeChange: (id: number, gradeLevel: string) => void;
  onActiveChange: (id: number, isActive: boolean) => void;
  onRemove: (id: number) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
        <thead>
          <tr>
            <th className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white">
              {t("common.subject")}
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
              {t("common.teacher")}
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
              {t("common.room")}
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
              {t("common.gradeLevel")}
            </th>
            <th className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white">
              {t("common.status")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
          {enrollments.map((enrollment) => {
            const subjectWithGrade = formatClassSubjectWithGrade(
              enrollment.subject,
              enrollment.gradeLevel,
              language,
            );
            const trialFormatLabel = formatTrialFormat(
              enrollment.trialFormat,
              language,
            );
            return (
              <tr key={enrollment.id}>
                <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                  <Link
                    href={classHref(enrollment.classId, `/students/${studentId}`)}
                    className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    {subjectWithGrade}
                  </Link>
                  {enrollment.lessonType === "trial" && trialFormatLabel ? (
                    <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                      · {trialFormatLabel}
                    </span>
                  ) : enrollment.lessonType === "trial" ? (
                    <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                      · {t("common.trialLabel")}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {enrollment.teacherName ?? "—"}
                </td>
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {enrollment.roomNumber ?? "—"}
                </td>
                <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {editing ? (
                    <input
                      list={`grade-options-${enrollment.id}`}
                      value={enrollment.gradeLevel ?? ""}
                      onChange={(event) =>
                        onGradeChange(enrollment.id, event.target.value)
                      }
                      className={inputClassName}
                    />
                  ) : (
                    enrollment.gradeLevel?.trim() || "—"
                  )}
                  {editing ? (
                    <datalist id={`grade-options-${enrollment.id}`}>
                      {GRADE_LEVEL_OPTIONS.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  ) : null}
                </td>
                <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                  {editing ? (
                    <div className="flex flex-col items-end gap-2">
                      <div className="relative grid grid-cols-1">
                        <select
                          value={enrollment.isActive ? "true" : "false"}
                          onChange={(event) =>
                            onActiveChange(
                              enrollment.id,
                              event.target.value === "true",
                            )
                          }
                          className={selectFieldClassName}
                        >
                          <option value="true">{t("common.active")}</option>
                          <option value="false">{t("common.inactive")}</option>
                        </select>
                        <SelectChevron />
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(enrollment.id)}
                        className="font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                  ) : (
                    <span
                      className={
                        enrollment.isActive
                          ? "text-green-700 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                      }
                    >
                      {enrollment.isActive
                        ? t("common.active")
                        : t("common.inactive")}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
