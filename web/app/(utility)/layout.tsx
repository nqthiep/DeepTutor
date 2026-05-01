import UtilitySidebar from "@/components/sidebar/UtilitySidebar";
import { AuthGuard } from "@/components/auth";
import { SubjectProvider } from "@/context/SubjectContext";

export default function UtilityLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <SubjectProvider>
        <div className="flex h-screen overflow-hidden">
          <UtilitySidebar />
          <main className="flex-1 overflow-hidden bg-[var(--background)]">
            {children}
          </main>
        </div>
      </SubjectProvider>
    </AuthGuard>
  );
}
