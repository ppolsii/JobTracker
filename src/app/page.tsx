import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {siteConfig.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Project scaffold ready. Features are implemented in later phases.
        </p>
      </div>
    </main>
  );
}
