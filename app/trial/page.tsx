import { TrialClassForm } from "@/components/trial-class-form";
import { BrandLogo } from "@/components/brand-logo";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatTeacherName, sortTeachers } from "@/lib/person-name";
import {
  formatTrialPrice,
  TRIAL_CLASS_DURATION_MINUTES,
  TRIAL_CLASS_SUBJECTS,
  type TrialTeacherOption,
} from "@/lib/trial-class";

export default async function TrialPage() {
  let teachers: TrialTeacherOption[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("is_active", true)
      .order("first_name");

    if (error) {
      loadError = error.message;
    } else {
      teachers = sortTeachers((data as TrialTeacherOption[] | null) ?? []);
    }
  } catch {
    loadError =
      "Trial signup is temporarily unavailable. Please contact the school.";
  }

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex flex-col items-center gap-1">
          <BrandLogo
            className="h-auto w-full max-w-sm rounded-sm bg-white"
            priority
          />
          <p className="text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Brooklyn, NY
          </p>
        </div>

        <h1 className="mt-6 text-center text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-white">
          Book a trial class
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {formatTrialPrice()} · {TRIAL_CLASS_DURATION_MINUTES} minutes ·
          one-on-one with your teacher
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white px-6 py-10 shadow-sm sm:rounded-lg sm:px-10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
          {loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : teachers.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No teachers are available for trial classes right now. Please
              contact the school to schedule.
            </p>
          ) : (
            <TrialClassForm
              subjects={[...TRIAL_CLASS_SUBJECTS]}
              teachers={teachers.map((teacher) => ({
                id: teacher.id,
                name: formatTeacherName(teacher),
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
