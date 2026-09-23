import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/stock", label: "Stock", icon: SearchIcon },
  { to: "/bulk", label: "Bulk Entry", icon: StackIcon },
  { to: "/containers", label: "Containers", icon: BoxIcon },
  { to: "/products", label: "Products", icon: TagIcon },
  { to: "/transactions", label: "History", icon: ClockIcon },
];

export function NavBar() {
  return (
    <>
      {/* Desktop / tablet top nav */}
      <header className="sticky top-0 z-30 hidden border-b border-slate-200 bg-white/90 backdrop-blur sm:block">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2.5">
          <span className="mr-4 shrink-0 text-base font-bold text-slate-900">Platina Stock</span>
          <nav className="flex flex-1 items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        <span className="text-base font-bold text-slate-900">Platina Stock</span>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium leading-tight ${
                isActive ? "text-brand-600" : "text-slate-500"
              }`
            }
          >
            <l.icon className="h-5 w-5 shrink-0" />
            <span className="max-w-full truncate px-0.5">{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
function StackIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m12 3 8 4-8 4-8-4 8-4Z" strokeLinejoin="round" />
      <path d="m4 12 8 4 8-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m4 16 8 4 8-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BoxIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" strokeLinejoin="round" />
      <path d="M3 8l9 5 9-5M12 13v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M20 12 12.5 4.5a2 2 0 0 0-1.4-.6H5a1 1 0 0 0-1 1v6.1a2 2 0 0 0 .6 1.4L12 20l8-8Z" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.3" />
    </svg>
  );
}
function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
