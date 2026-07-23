import { Link } from "react-router-dom";
import { Navbar } from "../components/Layout/Navbar";
import { FiLayers, FiDownload, FiGrid, FiBox } from "react-icons/fi";

const BENTO_FEATURES = [
  {
    id: "layers",
    title: "Edição baseada em Layers",
    description:
      "Empilhe camadas ilimitadas de tiles e props. Edição não destrutiva no seu núcleo.",
    icon: FiLayers,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    id: "autotile",
    title: "Autotiling",
    description:
      "Coloque o terreno e deixe o motor cuidar das variantes de canto e borda.",
    icon: FiGrid,
    color: "text-tile-sel",
    bg: "bg-tile-sel/10",
  },
  {
    id: "props",
    title: "Props & Objetos",
    description:
      "Posicione livremente props com z-index, opacidade, rotação e escala.",
    icon: FiBox,
    color: "text-prop",
    bg: "bg-prop/10",
  },
  {
    id: "export",
    title: "Exportar PNG / JPEG",
    description:
      "Exporte mapas em 1x, 2x ou 4x com sobreposição de grade opcional.",
    icon: FiDownload,
    color: "text-ok",
    bg: "bg-ok/10",
  },
];

function Home() {
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
              Early Access - v0.0.0
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-tight mb-5">
              Construa seus mapas de RPG no navegador com o{" "}
              <span className="text-accent">Ordem Paranormal map editor</span>
            </h1>
            <p className="text-ink-secondary text-lg mb-8 leading-relaxed">
              Feito por um fã de RPG para fãs de RPG. Crie, exporte e
              compartilhe os mapas das suas campanhas de Ordem.
            </p>
            <Link
              to="/vault"
              className="inline-block px-6 py-3 bg-accent hover:bg-accent-light text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Abrir meus mapas
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
                      {feature.title}
                    </h3>
                    <p className="text-ink-muted text-xs leading-relaxed">
                      {feature.description}
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
        <p className="text-ink-muted text-xs">
          RPG Map Editor - Early Access v0.0.0 - Built with React, Konva and
          Tailwind CSS
        </p>
      </footer>
    </div>
  );
}

export default Home;
