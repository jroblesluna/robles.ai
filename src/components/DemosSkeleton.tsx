import { Skeleton } from "@/components/ui/skeleton";

/** Card placeholder matching DemoCard: 16:9 preview + family, title, description, benefit, CTA. */
function CardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-5 w-3/4" />
        <Skeleton className="mt-3 h-3.5 w-full" />
        <Skeleton className="mt-2 h-3.5 w-full" />
        <Skeleton className="mt-2 h-3.5 w-2/3" />
        <Skeleton className="mt-4 h-3.5 w-1/2" />
        <Skeleton className="mt-6 h-4 w-20" />
      </div>
    </div>
  );
}

// Mirrors the /demos layout (DemosCatalog "lab" variant) while its chunk loads.
// ponytail: card counts are fixed (10 live, 3 soon); they only need to roughly match the catalog.
export default function DemosSkeleton() {
  return (
    <section role="status" aria-busy="true" aria-label="Loading demos" className="bg-white">
      <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto max-w-[max(80rem,70vw)] px-6 pb-14 pt-20 md:pt-24">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="mt-5 h-10 w-full max-w-3xl md:h-14" />
          <Skeleton className="mt-5 h-5 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-5 w-2/3 max-w-xl" />
          <div className="mt-10 grid max-w-2xl grid-cols-3 divide-x divide-gray-200 rounded-2xl bg-white/80 ring-1 ring-gray-200/80">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-5 py-4">
                <Skeleton className="h-7 w-10" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-100 bg-white">
        <div className="container mx-auto flex max-w-[max(80rem,70vw)] flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-1 overflow-hidden">
            {[16, 20, 24, 18, 24, 24].map((w, i) => (
              <Skeleton key={i} className="h-8 shrink-0 rounded-full" style={{ width: `${w * 4}px` }} />
            ))}
          </div>
          <Skeleton className="h-9 w-full rounded-full md:w-72" />
        </div>
      </div>

      <div className="container mx-auto max-w-[max(80rem,70vw)] px-6 py-14">
        <Skeleton className="mb-6 h-6 w-40" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 10 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
        <Skeleton className="mb-2 mt-16 h-6 w-36" />
        <Skeleton className="mb-6 h-4 w-64" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    </section>
  );
}
