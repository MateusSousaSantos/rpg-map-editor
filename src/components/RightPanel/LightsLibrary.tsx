import type { IconType } from "react-icons";
import { FiSun, FiSquare } from "react-icons/fi";
import { TbCone } from "react-icons/tb";
import { useTranslation } from "../../hooks/useTranslation";
import type { LightType } from "../../types/map";

/**
 * LightsLibrary — the "Lights" segment of the right-panel library.
 *
 * Three draggable cards (point / spot / area). Dragging a card onto the canvas
 * places a light of that type at the drop point, mirroring how props are
 * dragged from PropsLibrary (see MapCanvas.handleDrop). The payload key is
 * "lightType".
 */

interface LightCard {
  type: LightType;
  Icon: IconType;
}

const LIGHT_CARDS: LightCard[] = [
  { type: "point", Icon: FiSun },
  { type: "spot", Icon: TbCone },
  { type: "area", Icon: FiSquare },
];

const handleDragStart = (e: React.DragEvent, type: LightType) => {
  e.dataTransfer.setData("lightType", type);
  e.dataTransfer.effectAllowed = "copy";
};

export const LightsLibrary = () => {
  const { t } = useTranslation();

  const typeLabel: Record<LightType, string> = {
    point: t("light.typePoint"),
    spot: t("light.typeSpot"),
    area: t("light.typeArea"),
  };

  const typeDesc: Record<LightType, string> = {
    point: t("light.pointDesc"),
    spot: t("light.spotDesc"),
    area: t("light.areaDesc"),
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-ink-secondary">
        {t("light.libraryHeading")}
      </span>

      <div className="grid grid-cols-3 gap-2">
        {LIGHT_CARDS.map(({ type, Icon }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            className="group flex flex-col items-center gap-1.5 rounded border border-edge bg-canvas p-3 cursor-grab active:cursor-grabbing hover:border-accent-light hover:bg-raised transition-colors"
            title={typeDesc[type]}
          >
            <Icon size={26} className="text-ink-secondary group-hover:text-accent transition-colors" />
            <span className="text-[11px] text-ink-muted group-hover:text-ink transition-colors">
              {typeLabel[type]}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink-muted mt-2">💡 {t("light.dragHint")}</p>
    </div>
  );
};
