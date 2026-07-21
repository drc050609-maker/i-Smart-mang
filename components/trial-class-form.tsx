"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

import {
  bookTrialClass,
  type BookTrialClassState,
} from "@/app/trial/actions";
import {
  formatTrialPrice,
  TRIAL_CLASS_DURATION_MINUTES,
} from "@/lib/trial-class";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const selectClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const sectionHeadingClassName =
  "text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

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
  onBookAnother,
}: {
  subjects: string[];
  teachers: TeacherOption[];
  onBookAnother?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    bookTrialClass,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
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
          Trial class booked
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Thank you! Your {TRIAL_CLASS_DURATION_MINUTES}-minute trial lesson is
          scheduled. We&apos;ll see you soon.
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
          Payment of {formatTrialPrice()} has been recorded. The school will
          confirm your appointment.
        </p>
        <button
          type="button"
          onClick={() =>
            onBookAnother ? onBookAnother() : window.location.reload()
          }
          className="mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Book another trial class
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-8">
      <section className="space-y-5">
        <h2 className={sectionHeadingClassName}>Student information</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={labelClassName}>
              First name
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
              Last name
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
            Date of birth
          </label>
          <div className="mt-2">
            <input
              id="dob"
              name="dob"
              type="date"
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label htmlFor="experience" className={labelClassName}>
            Musical experience
          </label>
          <div className="mt-2">
            <textarea
              id="experience"
              name="experience"
              rows={3}
              placeholder="e.g. played piano for 2 years, first lesson, etc."
              className={inputClassName}
            />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className={sectionHeadingClassName}>Parent / guardian contact</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="parentPhone" className={labelClassName}>
              Phone
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
            <label htmlFor="parentEmail" className={labelClassName}>
              Email
            </label>
            <div className="mt-2">
              <input
                id="parentEmail"
                name="parentEmail"
                type="email"
                autoComplete="email"
                className={inputClassName}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className={sectionHeadingClassName}>Trial class details</h2>

        <div>
          <label htmlFor="subject" className={labelClassName}>
            Subject
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
                Select a subject
              </option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="teacherId" className={labelClassName}>
            Teacher
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
                Select a teacher
              </option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            One-on-one {TRIAL_CLASS_DURATION_MINUTES}-minute lesson with your
            selected teacher.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="scheduleDate" className={labelClassName}>
              Date
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
              Start time
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
      </section>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <div className="rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3 dark:border-indigo-500/20 dark:bg-indigo-500/10">
        <p className="text-sm text-indigo-900 dark:text-indigo-100">
          <span className="font-semibold">{formatTrialPrice()}</span> for a{" "}
          {TRIAL_CLASS_DURATION_MINUTES}-minute private trial lesson. Payment
          will be recorded when you submit this form.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
      >
        {pending ? "Booking…" : "Book trial class"}
      </button>
    </form>
  );
}
