import { createContext, useContext, useState } from "react";

export type Workstream = "all" | "dental" | "pharmacy" | "housing";

export const WORKSTREAM_OPTIONS: { value: Workstream; label: string }[] = [
  { value: "all",      label: "All workstreams" },
  { value: "dental",   label: "Dental" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "housing",  label: "Housing" },
];

interface WorkstreamContextValue {
  workstream: Workstream;
  setWorkstream: (w: Workstream) => void;
}

const WorkstreamContext = createContext<WorkstreamContextValue | null>(null);

export function WorkstreamProvider({ children }: { children: React.ReactNode }) {
  const [workstream, setWorkstream] = useState<Workstream>("all");
  return (
    <WorkstreamContext.Provider value={{ workstream, setWorkstream }}>
      {children}
    </WorkstreamContext.Provider>
  );
}

export function useWorkstream() {
  const ctx = useContext(WorkstreamContext);
  if (!ctx) throw new Error("useWorkstream must be used within WorkstreamProvider");
  return ctx;
}
