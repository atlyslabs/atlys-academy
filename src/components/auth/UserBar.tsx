import { auth, signOut } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/config";
import { AtlysMark } from "@/components/ui/AtlysMark";
import { Button } from "@/components/ui/Button";
export async function UserBar() {
  if (!isAuthConfigured) return null;

  const session = await auth();
  if (!session?.user?.email) return null;

  return (
    <div className="relative z-20 border-b border-hairline bg-page/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-2.5 sm:px-8">
        {/* Grouped so `justify-between` still splits identity from sign-out;
            `min-w-0` is what lets the email truncate instead of overflowing. */}
        <div className="flex min-w-0 items-center gap-3">
          <AtlysMark size={18} className="shrink-0 text-ink" />
          <p className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            {session.user.email}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
