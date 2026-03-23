import type { ReactNode } from "react";

interface EmptyStateProps {
  children: ReactNode;
}

export function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className="chat:flex chat:flex-1 chat:items-center chat:justify-center">
      {children}
    </div>
  );
}
