import { AuthBrowserRepository } from "@/features/auth/repositories/auth-browser.repository";

// Client-side counterpart to AuthService. Kept in a separate module from
// auth.service.ts so that Client Components never transitively pull in the
// server client's next/headers import via a shared file.
export const AuthBrowserService = {
  async hasRecoverySession(): Promise<boolean> {
    const session = await AuthBrowserRepository.getSession();
    return session !== null;
  },

  syncSessionFromUrl(): void {
    AuthBrowserRepository.syncSessionFromUrl();
  },
};
