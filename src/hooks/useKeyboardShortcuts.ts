/**
 * useKeyboardShortcuts - Handle keyboard shortcuts for prop manipulation
 */

import { useEffect } from 'react';
import { useMapStore } from '../stores/mapStore';
import { useUISelectionStore } from '../stores/uiSelectionStore';
import { useViewportStore } from '../stores/viewportStore';

export const useKeyboardShortcuts = () => {
  const { selectedPropIds, selectedLayerId, selectionMode, clearSelection } = useUISelectionStore();
  const { updateProp, removeProp, map } = useMapStore();
  const { resetViewport } = useViewportStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if props are selected
      if (selectionMode !== 'props' || selectedPropIds.size === 0 || !selectedLayerId || !map) {
        return;
      }

      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const layer = map.layers.find(l => l.id === selectedLayerId);
      if (!layer) return;

      const selectedProps = layer.props.filter(p => selectedPropIds.has(p.id));
      if (selectedProps.length === 0) return;

      // Arrow keys to move
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();

        const moveAmount = e.shiftKey ? 10 : 1;

        selectedProps.forEach(prop => {
          let newX = prop.x;
          let newY = prop.y;

          switch (e.key) {
            case 'ArrowUp':
              newY -= moveAmount;
              break;
            case 'ArrowDown':
              newY += moveAmount;
              break;
            case 'ArrowLeft':
              newX -= moveAmount;
              break;
            case 'ArrowRight':
              newX += moveAmount;
              break;
          }

          updateProp(selectedLayerId, prop.id, { x: newX, y: newY });
        });
      }

      // Delete key to remove props
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();

        if (confirm(`Delete ${selectedProps.length} prop(s)?`)) {
          selectedProps.forEach(prop => {
            removeProp(selectedLayerId, prop.id);
          });
          clearSelection();
        }
      }

      // Escape to deselect props
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      }
    };

    // Also handle Escape when no props selected (for general deselection)
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      }
      if (e.key === 'Home') {
        e.preventDefault();
        resetViewport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleGlobalEscape);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleGlobalEscape);
    };
  }, [selectedPropIds, selectedLayerId, selectionMode, map, updateProp, removeProp, clearSelection, resetViewport]);
};
