import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useWorkstream, WORKSTREAM_OPTIONS, type Workstream } from "@/contexts/WorkstreamContext";

export function WorkstreamFilter() {
  const { workstream, setWorkstream } = useWorkstream();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = WORKSTREAM_OPTIONS.find((o) => o.value === workstream) ?? WORKSTREAM_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3 rounded-lg border bg-white text-sm font-medium transition-colors",
          "hover:bg-muted/40 hover:border-border/80",
          open && "border-primary/50 ring-1 ring-primary/20",
          workstream !== "all" && "border-primary/60 text-primary bg-primary/5"
        )}
      >
        {selected.label}
        <ChevronDown size={13} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-white border rounded-lg shadow-lg py-1">
          {WORKSTREAM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setWorkstream(opt.value as Workstream); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
                workstream === opt.value && "bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
