import { Sidebar } from "@/components/atlas/Sidebar";
import { Topbar } from "@/components/atlas/Topbar";
import { OnboardingHost } from "@/components/onboarding/OnboardingHost";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bone text-ink">
      <Topbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <OnboardingHost />
    </div>
  );
}
