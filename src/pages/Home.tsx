import { Link } from "react-router-dom";
import { Navbar } from "../components/Layout/Navbar";
import { FiLayers, FiDownload, FiGrid, FiBox } from "react-icons/fi";
import { useTranslation } from "../hooks/useTranslation";
import type { TranslationKey } from "../i18n";

const BENTO_FEATURES: {
  id: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: typeof FiLayers;
  color: string;
  bg: string;
}[] = [
  {
    id: "layers",
    titleKey: "home.features.layers.title",
    descKey: "home.features.layers.description",
    icon: FiLayers,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    id: "autotile",
    titleKey: "home.features.autotile.title",
    descKey: "home.features.autotile.description",
    icon: FiGrid,
    color: "text-tile-sel",
    bg: "bg-tile-sel/10",
  },
  {
    id: "props",
    titleKey: "home.features.props.title",
    descKey: "home.features.props.description",
    icon: FiBox,
    color: "text-prop",
    bg: "bg-prop/10",
  },
  {
    id: "export",
    titleKey: "home.features.export.title",
    descKey: "home.features.export.description",
    icon: FiDownload,
    color: "text-ok",
    bg: "bg-ok/10",
  },
];

function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-canvas selectable">
      <Navbar />

      {/* Split hero */}
      <section className="flex-1 flex items-center px-6 py-16 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/20 text-accent text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {t("home.badge")}
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-tight mb-5">
              {t("home.heroPrefix")}
              <span className="text-accent">{t("home.heroHighlight")}</span>
            </h1>
            <p className="text-ink-secondary text-lg mb-8 leading-relaxed">
              {t("home.heroDescription")}
            </p>
            <Link
              to="/vault"
              className="inline-block px-6 py-3 bg-accent hover:bg-accent-light text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {t("home.cta")}
            </Link>
          </div>

          {/* Right: feature cards */}
          <div className="grid grid-cols-2 gap-4">
            {BENTO_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.id}
                  className={`${feature.bg} rounded-2xl border border-edge p-6 flex flex-col gap-3 hover:border-edge-strong transition-colors`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-canvas/60 flex items-center justify-center ${feature.color}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink text-sm mb-1">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="text-ink-muted text-xs leading-relaxed">
                      {t(feature.descKey)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-edge px-6 py-6 text-center">
        <p className="text-ink-muted text-xs">{t("home.footer")}</p>
      </footer>
    </div>
  );
}

export default Home;
