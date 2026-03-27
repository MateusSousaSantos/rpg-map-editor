import { Link, useLocation } from "react-router-dom";
import { FiHome, FiFolder, FiSettings } from "react-icons/fi";

const NAV_LINKS = [
  { path: "/", label: "Home", icon: FiHome },
  { path: "/vault", label: "My Maps", icon: FiFolder },
  { path: "/settings", label: "Settings", icon: FiSettings },
];

export const Navbar = () => {
  const { pathname } = useLocation();

  return (
    <nav className="h-14 bg-panel border-b border-edge flex items-center px-6 gap-4 shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mr-2">
        <span className="text-accent text-base select-none">⬡</span>
        <span className="text-ink font-bold text-sm tracking-wide select-none">
          RPG Map Editor
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-0.5">
        {NAV_LINKS.map(({ path, label, icon: Icon }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-ink-muted hover:text-ink hover:bg-raised"
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />
    </nav>
  );
};
