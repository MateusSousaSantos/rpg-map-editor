import { Link } from "react-router-dom";
import { Navbar } from "../components/Layout/Navbar";
import {
  FiLayers,
  FiZoomIn,
  FiDownload,
  FiCpu,
  FiGrid,
  FiBox,
} from "react-icons/fi";

const BENTO_FEATURES = [
  {
    id: "layers",
    title: "Edição baseada em Layers",
    description:
      "Empilhe camadas ilimitadas de tiles e props. Mostre, oculte, bloqueie e reordene — edição não destrutiva no seu núcleo.",
    icon: FiLayers,
    color: "text-accent",
    bg: "bg-accent/10",
    span: "col-span-1 row-span-2",
    large: true,
  },
  {
    id: "autotile",
    title: "Autotiling",
    description:
      "Conexões inteligentes de tiles. Coloque o terreno e deixe o motor lidar automaticamente com variantes de canto e borda.",
    icon: FiGrid,
    color: "text-tile-sel",
    bg: "bg-tile-sel/10",
    span: "row-span-2",
    large: false,
  },
  {
    id: "props",
    title: "Props & Objetos",
    description:
      "Posicione livremente props decorativos com z-index, opacidade, rotação e escala.",
    icon: FiBox,
    color: "text-prop",
    bg: "bg-prop/10",
    span: "",
    large: false,
  },
  {
    id: "export",
    title: "Exportar PNG / JPEG",
    description:
      "Exporte mapas em resolução 1x, 2x ou 4x com sobreposição de grade opcional.",
    icon: FiDownload,
    color: "text-ok",
    bg: "bg-ok/10",
    span: "",
    large: false,
  },
  {
    id: "zoom",
    title: "Zoom & Pan",
    description:
      "Role para dar zoom de 0,1x a 5x. Espaço+arrastar para mover. Atalhos de teclado para navegação fluida.",
    icon: FiZoomIn,
    color: "text-vis",
    bg: "bg-vis/10",
    span: "",
    large: false,
  },
  {
    id: "renderer",
    title: "Renderizador Canvas Nativo",
    description:
      "Renderização de tiles com viewport-culled via a API Canvas 2D nativa. Lida com mapas grandes sem perder frames.",
    icon: FiCpu,
    color: "text-lock",
    bg: "bg-lock/10",
    span: "col-span-2",
    large: false,
  },
];

const COMMUNITY_MAPS = [
  {
    id: "1",
    name: "Dragon's Keep",
    author: "Pedro",
    width: 64,
    height: 48,
    gradient: "from-indigo-900/80 to-canvas",
    tags: ["dungeon", "medieval"],
  },
  {
    id: "2",
    name: "Forest Village",
    author: "System",
    width: 32,
    height: 32,
    gradient: "from-emerald-900/80 to-canvas",
    tags: ["outdoor", "village"],
  },
  {
    id: "3",
    name: "Sea Port Town",
    author: "System",
    width: 48,
    height: 64,
    gradient: "from-cyan-900/80 to-canvas",
    tags: ["urban", "water"],
  },
  {
    id: "4",
    name: "Desert Ruins",
    author: "System",
    width: 40,
    height: 40,
    gradient: "from-orange-900/80 to-canvas",
    tags: ["desert", "ruins"],
  },
  {
    id: "5",
    name: "Mystic Caverns",
    author: "System",
    width: 32,
    height: 24,
    gradient: "from-violet-900/80 to-canvas",
    tags: ["cave", "magic"],
  },
  {
    id: "6",
    name: "Sky Realm",
    author: "System",
    width: 64,
    height: 64,
    gradient: "from-rose-900/80 to-canvas",
    tags: ["aerial", "fantasy"],
  },
];

function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas selectable">
      <Navbar />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-28 overflow-hidden">
        <div className="absolute inset-0 hero-grid-bg pointer-events-none" />
        <div className="absolute inset-0 flex items-start justify-center pointer-events-none">
          <div className="hero-glow w-150 h-96 rounded-full bg-accent/20 blur-3xl -translate-y-1/3" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/20 text-accent text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Early Access - v0.0.0
          </div>
          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight text-ink leading-none mb-6">
            Construa seus mapas de RPG no navegador usando o
            <br />
            <span className="text-accent">Ordem Paranormal map editor</span>
          </h1>
          <p className="text-ink-secondary text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Uma ferramente completa para a sua mesa feita por um fã de RPG para
            fãs de RPG. Crie mapas das suas campanhas com uma interface
            intuitiva, exporte para PNG/JPEG e compartilhe com seus amigos. Dê
            vida as suas historias e missoes com o tematica de ordem!
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/vault"
              className="px-6 py-3 bg-accent hover:bg-accent-light text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Abrir meus mapas
            </Link>
            <a
              href="#discover"
              className="px-6 py-3 bg-raised hover:bg-overlay border border-edge text-ink-secondary hover:text-ink font-medium rounded-xl text-sm transition-colors"
            >
              Ver Comunidade
            </a>
          </div>
        </div>
      </section>

      {/* Features Bento */}
      <section className="px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-3">
            Tudo o que você precisa para construir seus mapas de Ordem
          </h2>
          <p className="text-ink-muted">
            Um conjunto completo de ferramentas para criação de mapas 2D
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 auto-rows-fr">
          {BENTO_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className={`${feature.span} ${feature.bg} rounded-2xl border border-edge p-6 flex flex-col gap-3 hover:border-edge-strong transition-colors`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-canvas/60 flex items-center justify-center ${feature.color}`}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <h3
                    className={`font-semibold text-ink mb-1 ${feature.large ? "text-xl" : "text-sm"}`}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className={`text-ink-muted leading-relaxed ${feature.large ? "text-sm" : "text-xs"}`}
                  >
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Discovery */}
      <section id="discover" className="px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-ink">Mapas da Comunidade</h2>
            <p className="text-ink-muted text-sm mt-1">
              Explore mapas compartilhados pela comunidade
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-ok/15 border border-ok/30 text-ok text-xs font-medium">
            Em breve
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {COMMUNITY_MAPS.map((map) => (
            <div
              key={map.id}
              className="rounded-xl border border-edge overflow-hidden opacity-70 cursor-not-allowed"
            >
              <div
                className={`h-32 bg-linear-to-br ${map.gradient} hero-grid-bg relative`}
              >
                <div className="absolute inset-0 flex items-end p-3">
                  <div className="flex gap-1 flex-wrap">
                    {map.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 bg-canvas/70 rounded text-[10px] text-ink-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-3 bg-panel">
                <p className="text-sm font-semibold text-ink">{map.name}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {map.width}x{map.height} tiles by {map.author}
                </p>
              </div>
            </div>
          ))}
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
