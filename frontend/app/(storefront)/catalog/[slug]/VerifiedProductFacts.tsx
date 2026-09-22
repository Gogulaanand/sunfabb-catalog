interface VerifiedProductFactsProps {
  measuredWidthCm: number;
  measuredLengthCm: number;
  setContents: string;
}

/** Customer-visible facts that must be owner-recorded before publication. */
export function VerifiedProductFacts({
  measuredWidthCm,
  measuredLengthCm,
  setContents,
}: VerifiedProductFactsProps) {
  return (
    <>
      <div className="flex gap-x-6 py-2.5 text-body-sm transition-colors hover:bg-surface-container/50 rounded px-1">
        <dt className="text-on-surface-variant w-20 shrink-0">Measured</dt>
        <dd className="text-on-surface">
          {measuredWidthCm} × {measuredLengthCm} cm
        </dd>
      </div>
      <div className="flex gap-x-6 py-2.5 text-body-sm transition-colors hover:bg-surface-container/50 rounded px-1">
        <dt className="text-on-surface-variant w-20 shrink-0">In the set</dt>
        <dd className="text-on-surface">{setContents}</dd>
      </div>
    </>
  );
}
