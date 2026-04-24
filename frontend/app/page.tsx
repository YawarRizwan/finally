import { Suspense } from "react";
import { Workstation } from "@/components/Workstation";

// Static export: no SSR, no dynamic params. Client reads `?ticker=XYZ`
// from the URL inside <Workstation />.
export default function Home() {
  return (
    <Suspense fallback={<Fallback />}>
      <Workstation />
    </Suspense>
  );
}

function Fallback() {
  return (
    <main className="flex flex-1 items-center justify-center text-text-muted">
      <span className="text-[11px] uppercase tracking-[0.2em]">Loading workstation...</span>
    </main>
  );
}
