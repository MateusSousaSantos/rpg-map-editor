/**
 * useKeyboardShortcuts - Handle keyboard shortcuts for prop manipulation and undo/redo
 */

import { useEffect } from 'react';
import { useMapStore } from '../stores/mapStore';
import { useUISelectionStore } from '../stores/uiSelectionStore';
import { useViewportStore } from '../stores/viewportStore';
import { useHistoryStore } from '../stores/historyStore';
import { useToolStore } from '../stores/toolStore';
import type { MapAction } from '../types/map';

export const useKeyboardShortcuts = () => {
  const { selectedPropIds, selectedLayerId, selectionMode, clearSelection } = useUISelectionStore();
  const { updateProp, removeProp, map } = useMapStore();
  const { resetViewport } = useViewportStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        useHistoryStore.getState().undo();
        return;
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z  or  Ctrl+Y / Cmd+Y
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        useHistoryStore.getState().redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        useHistoryStore.getState().redo();
        return;
      }

      // Only handle prop shortcuts if props are selected
      if (selectionMode !== 'props' || selectedPropIds.size === 0 || !selectedLayerId || !map) {
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
        const historyActions: MapAction[] = [];

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

          const changes = { x: newX, y: newY };
          const previousChanges = { x: prop.x, y: prop.y };

          updateProp(selectedLayerId, prop.id, changes);
          historyActions.push({
            type: 'UPDATE_PROP',
            layerId: selectedLayerId,
            propId: prop.id,
            changes,
            previousChanges,
          });
        });

        if (historyActions.length === 1) {
          useHistoryStore.getState().addAction(historyActions[0]);
        } else if (historyActions.length > 1) {
          useHistoryStore.getState().addAction({ type: 'BATCH', actions: historyActions });
        }
      }

      // Delete key to remove props
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();

        if (confirm(`Delete ${selectedProps.length} prop(s)?`)) {
          const historyActions: MapAction[] = [];

          selectedProps.forEach(prop => {
            historyActions.push({
              type: 'REMOVE_PROP',
              layerId: selectedLayerId,
              propId: prop.id,
              removedProp: { ...prop },
            });
            removeProp(selectedLayerId, prop.id);
          });

          if (historyActions.length === 1) {
            useHistoryStore.getState().addAction(historyActions[0]);
          } else if (historyActions.length > 1) {
            useHistoryStore.getState().addAction({ type: 'BATCH', actions: historyActions });
          }

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
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const store = useToolStore.getState();
        store.setRandomBrushEnabled(!store.randomBrushEnabled);
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
