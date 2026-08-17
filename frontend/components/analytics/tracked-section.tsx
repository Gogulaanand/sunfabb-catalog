"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { trackHomeSectionView } from "@/lib/analytics";

interface TrackedSectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
  sectionId: string;
  position: number;
}

/** Reports meaningful homepage depth once at 35% visibility. */
export function TrackedSection({
  children,
  className,
  id,
  labelledBy,
  sectionId,
  position,
}: TrackedSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasTracked.current) return;
        hasTracked.current = true;
        trackHomeSectionView(sectionId, position);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [sectionId, position]);

  return (
    <section
      ref={sectionRef}
      className={className}
      id={id}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  );
}
