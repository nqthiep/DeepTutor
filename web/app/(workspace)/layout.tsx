import WorkspaceSidebar from "@/components/sidebar/WorkspaceSidebar";
import { UnifiedChatProvider } from "@/context/UnifiedChatContext";
import { SubjectProvider } from "@/context/SubjectContext";
import { AuthGuard } from "@/components/auth";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <UnifiedChatProvider>
        <SubjectProvider>
          <div className="flex h-screen overflow-hidden">
            <WorkspaceSidebar />
            <main className="flex-1 overflow-hidden bg-[var(--background)]">
              {children}
            </main>
          </div>
        </SubjectProvider>
      </UnifiedChatProvider>
    </AuthGuard>
  );
}
