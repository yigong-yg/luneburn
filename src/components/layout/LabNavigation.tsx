export type LabRoute = "assumptions" | "estimands";

interface LabNavigationProps {
  readonly activeRoute: LabRoute;
}

const routes: ReadonlyArray<{
  readonly id: LabRoute;
  readonly href: string;
  readonly label: string;
}> = [
  { id: "assumptions", href: "#/assumptions", label: "Assumption stress" },
  { id: "estimands", href: "#/estimands", label: "Estimand contracts" },
];

export const LabNavigation = ({
  activeRoute,
}: LabNavigationProps): JSX.Element => (
  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
    <a
      href="#/assumptions"
      className="font-display text-lg font-bold text-lunar-ink no-underline"
    >
      luneburn
    </a>
    <nav aria-label="Lab pages" className="flex items-center gap-1">
      {routes.map((route) => {
        const active = route.id === activeRoute;
        return (
          <a
            key={route.id}
            href={route.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lunar-primary sm:text-xs ${
              active
                ? "border-lunar-primary text-lunar-ink"
                : "border-transparent text-lunar-muted hover:border-lunar-border hover:text-lunar-ink"
            }`}
          >
            {route.label}
          </a>
        );
      })}
    </nav>
  </div>
);
