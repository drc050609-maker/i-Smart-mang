import { TrialClassForm } from "@/components/trial-class-form";
import { BrandLogo } from "@/components/brand-logo";
import { createTranslator } from "@/lib/i18n";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatTeacherName, sortTeachers } from "@/lib/person-name";
import {
  formatTrialPrice,
  TRIAL_CLASS_PRICE_USD,
  TRIAL_CLASS_SUBJECTS,
  type TrialTeacherOption,
} from "@/lib/trial-class";

export default async function TrialPage() {
  const t = createTranslator("en");
  let teachers: TrialTeacherOption[] = [];
  let trialPriceUsd: number | undefined;
  let loadError: string | null = null;

  try {
    const supabase = createSupabaseServiceClient();
    const { data: campus, error: campusError } = await supabase
      .from("locations")
      .select("id, trial_price_cents")
      .eq("slug", "brooklyn")
      .maybeSingle();

    if (campusError) {
      loadError = campusError.message;
    } else {
      trialPriceUsd = campus?.trial_price_cents
        ? campus.trial_price_cents / 100
        : undefined;
      const query = supabase
        .from("teachers")
        .select("id, first_name, last_name")
        .eq("is_active", true)
        .eq("position", "teacher")
        .order("first_name");

      const { data, error } = campus?.id
        ? await query.eq("location_id", campus.id)
        : await query;

      if (error) {
        loadError = error.message;
      } else {
        teachers = sortTeachers((data as TrialTeacherOption[] | null) ?? []);
      }
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
          {t("trial.title")}
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {t("trial.fee")}: {formatTrialPrice(trialPriceUsd ?? TRIAL_CLASS_PRICE_USD)}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white px-6 py-10 shadow-sm sm:rounded-lg sm:px-10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
          {loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : teachers.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("trial.noTeachers")}
            </p>
          ) : (
            <TrialClassForm
              subjects={[...TRIAL_CLASS_SUBJECTS]}
              teachers={teachers.map((teacher) => ({
                id: teacher.id,
                name: formatTeacherName(teacher),
              }))}
              language="en"
              trialPriceUsd={trialPriceUsd ?? TRIAL_CLASS_PRICE_USD}
            />
          )}
        </div>
      </div>
    </div>
  );
}
