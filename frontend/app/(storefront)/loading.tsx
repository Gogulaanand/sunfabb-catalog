const Line = ({ className = '' }: { className?: string }) => (
  <div className={`rounded-sm bg-home-stone/80 ${className}`} />
);

export default function StorefrontLoading() {
  return (
    <div
      className="motion-safe:animate-pulse bg-home-paper"
      aria-label="Loading the Sunfabb homepage"
      role="status"
    >
      <div className="min-h-[100svh] bg-home-walnut-soft" />

      <section className="mx-auto grid min-h-[46.875rem] max-w-(--spacing-container-max) gap-10 px-5 py-16 md:grid-cols-[45%_55%] md:gap-16 md:px-(--spacing-margin-desktop) md:py-24">
        <div className="flex flex-col justify-center">
          <Line className="h-3 w-28" />
          <Line className="mt-6 h-12 w-5/6" />
          <Line className="mt-3 h-12 w-3/4" />
          <Line className="mt-8 h-5 w-full max-w-md" />
          <Line className="mt-3 h-5 w-4/5 max-w-sm" />
          <div className="mt-10 space-y-4 border-t border-home-graphite/15 pt-6">
            <Line className="h-5 w-full" />
            <Line className="h-5 w-full" />
            <Line className="h-5 w-full" />
          </div>
        </div>
        <div className="min-h-96 rounded-sm bg-home-stone" />
      </section>

      <section className="min-h-[65.625rem] bg-home-walnut px-5 py-16 md:px-(--spacing-margin-desktop) md:py-28">
        <div className="mx-auto max-w-(--spacing-container-max)">
          <Line className="h-12 w-72 bg-white/20" />
          <div className="mt-12 min-h-[28.5rem] rounded-sm bg-white/10" />
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="min-h-60 rounded-sm bg-white/10" />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex min-h-[56.25rem] max-w-(--spacing-container-max) flex-col justify-center px-5 md:px-(--spacing-margin-desktop)">
        <Line className="h-12 w-72" />
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="aspect-[3/4] rounded-sm bg-home-stone" />
              <Line className="mt-5 h-5 w-3/4" />
            </div>
          ))}
        </div>
      </section>

      <section className="grid min-h-[53.125rem] bg-home-stone md:grid-cols-[60%_40%]">
        <div className="min-h-96 bg-home-walnut-soft/50" />
        <div className="flex flex-col justify-center bg-home-paper px-6 py-14 md:px-16">
          <Line className="h-3 w-24" />
          <Line className="mt-6 h-12 w-full" />
          <Line className="mt-3 h-12 w-4/5" />
          <Line className="mt-8 h-5 w-3/4" />
        </div>
      </section>

      <section className="mx-auto grid min-h-[53.125rem] max-w-(--spacing-container-max) gap-10 px-5 py-16 md:px-(--spacing-margin-desktop) md:py-32 lg:grid-cols-[55%_45%] lg:gap-16">
        <div className="min-h-96 rounded-sm bg-home-stone" />
        <div className="flex flex-col justify-center">
          <Line className="h-12 w-5/6" />
          <div className="mt-12 space-y-6 border-t border-home-graphite/15 pt-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Line key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid min-h-[46.875rem] max-w-(--spacing-container-max) gap-10 bg-white px-5 py-16 md:grid-cols-2 md:gap-12 md:px-(--spacing-margin-desktop) md:py-20">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index}>
            <div className="h-[26rem] rounded-sm bg-home-stone" />
            <Line className="mt-7 h-8 w-40" />
            <Line className="mt-4 h-5 w-4/5" />
          </div>
        ))}
      </section>

      <section className="min-h-[40.625rem] bg-home-walnut-soft" />
    </div>
  );
}
