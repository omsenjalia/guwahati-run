import { ParentView } from "@/components/parent-view";

export const metadata = { title: "Trip status - Guwahati Run" };

export default function ParentPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-md px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
      <ParentView />
    </main>
  );
}
