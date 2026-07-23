import { useState, type ReactNode } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  /** Optional control rendered on the right side of the header (e.g. a toggle). */
  headerRight?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}

/**
 * Uniform collapsible section used to stack the right-panel regions
 * (Tile Tint, Objects, Layers) with consistent compact headers.
 */
export const CollapsibleSection = ({
  title,
  count,
  defaultOpen = true,
  headerRight,
  children,
  bodyClassName = "",
}: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-edge">
      <div className="flex items-center gap-1 px-2.5 py-1.5">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left group"
        >
          {open ? (
            <FiChevronDown size={12} className="text-ink-muted shrink-0" />
          ) : (
            <FiChevronRight size={12} className="text-ink-muted shrink-0" />
          )}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted group-hover:text-ink-secondary transition-colors truncate">
            {title}
            {count !== undefined && (
              <span className="ml-1.5 font-normal normal-case tracking-normal">({count})</span>
            )}
          </span>
        </button>
        {headerRight}
      </div>
      {open && <div className={bodyClassName}>{children}</div>}
    </div>
  );
};
