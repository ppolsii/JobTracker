import { logoutAction } from "@/features/auth/actions/auth.actions";
import { Button } from "@/shared/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline">
        Log out
      </Button>
    </form>
  );
}
