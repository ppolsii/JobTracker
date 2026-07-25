import { Card, CardContent } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";

// "Dashboard screenshots": an illustrative mockup, not a literal screenshot -
// this environment has no way to capture a real one, and presenting a
// fabricated image as an actual product screenshot would be dishonest.
// Built entirely from already-installed UI primitives (Card/Progress), so
// it stays visually consistent with the real app and needs no image asset
// at all (a performance win too - zero bytes to optimize or lazy-load).
export function DashboardMockup() {
  const bars = [40, 65, 30, 80, 55, 90, 70];

  return (
    <Card className="w-full max-w-lg shadow-lg" aria-hidden="true">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Applications", value: "42" },
            { label: "Interviews", value: "9" },
            { label: "Offers", value: "2" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-1.5 rounded-lg border p-3">
          {bars.map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-sm bg-primary/70"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Weekly goal</span>
            <span className="font-medium">7 / 10</span>
          </div>
          <Progress value={70} />
        </div>
      </CardContent>
    </Card>
  );
}
