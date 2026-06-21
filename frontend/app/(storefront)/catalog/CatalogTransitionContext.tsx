"use client";

import { createContext, useContext, useTransition, type ReactNode, type TransitionStartFunction } from "react";

interface CatalogTransitionValue {
  isPending: boolean;
  startCatalogTransition: TransitionStartFunction;
}

const CatalogTransitionContext = createContext<CatalogTransitionValue | null>(null);

export function CatalogTransitionProvider({ children }: { children: ReactNode }) {
  const [isPending, startCatalogTransition] = useTransition();
  return (
    <CatalogTransitionContext.Provider value={{ isPending, startCatalogTransition }}>
      {children}
    </CatalogTransitionContext.Provider>
  );
}

export function useCatalogTransition() {
  const ctx = useContext(CatalogTransitionContext);
  if (!ctx) {
    throw new Error("useCatalogTransition must be used within a CatalogTransitionProvider");
  }
  return ctx;
}
