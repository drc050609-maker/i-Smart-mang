export default function ScheduleLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 rounded bg-gray-200 dark:bg-white/10" />
      <div className="mt-2 h-4 w-72 rounded bg-gray-100 dark:bg-white/5" />
      <div className="mt-6 flex gap-6">
        <div className="hidden w-56 shrink-0 space-y-2 xl:block">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-9 rounded-md bg-gray-100 dark:bg-white/5"
            />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex gap-2">
            <div className="h-9 w-28 rounded-md bg-gray-100 dark:bg-white/5" />
            <div className="h-9 w-20 rounded-md bg-gray-100 dark:bg-white/5" />
            <div className="h-9 w-48 rounded-md bg-gray-100 dark:bg-white/5" />
          </div>
          <div className="h-[32rem] rounded-lg border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5" />
        </div>
      </div>
    </div>
  );
}
