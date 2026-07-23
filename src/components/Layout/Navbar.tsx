import { Link, useLocation } from "react-router-dom";
import { FiHome, FiFolder } from "react-icons/fi";
import { useTranslation } from "../../hooks/useTranslation";
import { LanguageSelector } from "./LanguageSelector";
import type { TranslationKey } from "../../i18n";

const NAV_LINKS: { path: string; labelKey: TranslationKey; icon: typeof FiHome }[] = [
  { path: "/", labelKey: "nav.home", icon: FiHome },
  { path: "/vault", labelKey: "nav.myMaps", icon: FiFolder },
];

export const Navbar = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="h-14 bg-panel border-b border-edge flex items-center px-6 gap-4 shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mr-2">
        <span className="text-accent text-base select-none">⬡</span>
        <span className="text-ink font-bold text-sm tracking-wide select-none">
          {t("nav.brand")}
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-0.5">
        {NAV_LINKS.map(({ path, labelKey, icon: Icon }) => {
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
              {t(labelKey)}
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />

      <LanguageSelector />
    </nav>
  );
};
