// Deliberately outside the (auth) route group and its "redirect if already
// logged in" guard: completing a password reset requires an active
// (recovery) session, which the (auth) layout would otherwise treat as
// "already logged in" and redirect away before the user can set a new
// password. See UpdatePasswordForm for the client-side validity check.
export default function UpdatePasswordLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
