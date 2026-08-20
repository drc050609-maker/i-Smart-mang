"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

import {
  bookTrialClass,
  type BookTrialClassState,
} from "@/app/trial/actions";
import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import {
  formatTrialPrice,
  TRIAL_CLASS_DURATION_MINUTES,
  TRIAL_CLASS_PRICE_USD,
  TRIAL_FEE_OPTIONS_USD,
  TRIAL_FEE_PROMO_USD,
} from "@/lib/trial-class";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const selectClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const initialState: BookTrialClassState = {};

type TeacherOption = {
  id: number;
  name: string;
};

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TrialClassForm({
  subjects,
  teachers,
  language = "en",
  onBookAnother,
}: {
  subjects: string[];
  teachers: TeacherOption[];
  language?: AppLanguage;
  onBookAnother?: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const formRef = useRef<HTMLFormElement>(null);
  const [durationMinutes, setDurationMinutes] = useState(
    String(TRIAL_CLASS_DURATION_MINUTES),
  );
  const [trialFeeUsd, setTrialFeeUsd] = useState(String(TRIAL_CLASS_PRICE_USD));
  const [state, formAction, pending] = useActionState(
    bookTrialClass,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setDurationMinutes(String(TRIAL_CLASS_DURATION_MINUTES));
      setTrialFeeUsd(String(TRIAL_CLASS_PRICE_USD));
    }
  }, [state.success]);

  if (state.success) {
    return (
      <div className="text-center">
        <CheckCircleIcon
          aria-hidden="true"
          className="mx-auto size-12 text-green-500"
        />
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t("trial.booked")}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t("trial.bookedHelp")}
        </p>
        <button
          type="button"
          onClick={() =>
            onBookAnother ? onBookAnother() : window.location.reload()
          }
          className="mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {t("trial.bookAnother")}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {t("trial.title")}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t("trial.intro")}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClassName}>
            {t("trial.childName")}
          </label>
          <div className="mt-2">
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              className={inputClassName}
            />
          </div>
        </div>
        <div>
          <label htmlFor="lastName" className={labelClassName}>
            {t("trial.lastName")}
          </label>
          <div className="mt-2">
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="dob" className={labelClassName}>
          {t("trial.dob")}
        </label>
        <div className="mt-2">
          <input id="dob" name="dob" type="date" className={inputClassName} />
        </div>
      </div>

      <fieldset>
        <legend className={labelClassName}>{t("trial.gender")}</legend>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
            <input
              type="radio"
              name="gender"
              value="male"
              className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            {t("trial.genderMale")}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
            <input
              type="radio"
              name="gender"
              value="female"
              className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            {t("trial.genderFemale")}
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="parentName" className={labelClassName}>
          {t("trial.parentName")}
        </label>
        <div className="mt-2">
          <input
            id="parentName"
            name="parentName"
            type="text"
            autoComplete="name"
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="parentPhone" className={labelClassName}>
          {t("trial.phone")}
        </label>
        <div className="mt-2">
          <input
            id="parentPhone"
            name="parentPhone"
            type="tel"
            autoComplete="tel"
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className={labelClassName}>
          {t("trial.address")}
        </label>
        <div className="mt-2">
          <input
            id="address"
            name="address"
            type="text"
            autoComplete="street-address"
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className={labelClassName}>
          {t("trial.subject")}
        </label>
        <div className="mt-2">
          <select
            id="subject"
            name="subject"
            required
            defaultValue=""
            className={selectClassName}
          >
            <option value="" disabled>
              {t("trial.subject")}
            </option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={labelClassName}>{t("common.type")}</legend>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
            <input
              type="radio"
              name="trialFormat"
              value="private"
              required
              className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            {t("trial.oneToOne")}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
            <input
              type="radio"
              name="trialFormat"
              value="group"
              required
              className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            {t("trial.groupClass")}
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="experience" className={labelClassName}>
          {t("trial.haveStudied")}
        </label>
        <div className="mt-2">
          <textarea
            id="experience"
            name="experience"
            rows={3}
            placeholder={t("trial.haveStudiedPlaceholder")}
            className={inputClassName}
          />
        </div>
      </div>

      <fieldset>
        <legend className={labelClassName}>{t("trial.suitableTime")}</legend>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
            <input
              type="radio"
              name="trialTimePreference"
              value="weekday"
              className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            {t("trial.weekday")}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
            <input
              type="radio"
              name="trialTimePreference"
              value="weekend"
              className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            {t("trial.weekend")}
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="durationMinutes" className={labelClassName}>
          {t("trial.duration")}
        </label>
        <div className="mt-2">
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={15}
            max={180}
            step={1}
            required
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
            className={inputClassName}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("trial.durationUnit")}
        </p>
      </div>

      <fieldset>
        <legend className={labelClassName}>{t("trial.fee")}</legend>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("trial.feePromoHelp")}
        </p>
        <div className="mt-2 flex gap-4">
          {TRIAL_FEE_OPTIONS_USD.map((amount) => (
            <label
              key={amount}
              className="flex items-center gap-2 text-sm text-gray-900 dark:text-white"
            >
              <input
                type="radio"
                name="trialFeeUsd"
                value={amount}
                required
                checked={trialFeeUsd === String(amount)}
                onChange={(event) => setTrialFeeUsd(event.target.value)}
                className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              {formatTrialPrice(amount)}
              {amount === TRIAL_FEE_PROMO_USD ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({t("trial.feePromo")})
                </span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="teacherId" className={labelClassName}>
          {t("trial.teacher")}
        </label>
        <div className="mt-2">
          <select
            id="teacherId"
            name="teacherId"
            required
            defaultValue=""
            className={selectClassName}
          >
            <option value="" disabled>
              {t("trial.teacher")}
            </option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="scheduleDate" className={labelClassName}>
            {t("trial.date")}
          </label>
          <div className="mt-2">
            <input
              id="scheduleDate"
              name="scheduleDate"
              type="date"
              required
              min={todayInputValue()}
              className={inputClassName}
            />
          </div>
        </div>
        <div>
          <label htmlFor="scheduleStartTime" className={labelClassName}>
            {t("trial.startTime")}
          </label>
          <div className="mt-2">
            <input
              id="scheduleStartTime"
              name="scheduleStartTime"
              type="time"
              required
              step={900}
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
      >
        {pending ? t("trial.booking") : t("trial.submit")}
      </button>
    </form>
  );
}
