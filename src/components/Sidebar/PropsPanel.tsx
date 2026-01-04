/**
 * PropsPanel - Shows available prop definitions and properties of selected props
 */

import { useMapStore } from '../../stores/mapStore';
import { useToolStore } from '../../stores/toolStore';
import { useUISelectionStore } from '../../stores/uiSelectionStore';
import { FiTrash2, FiEye, FiEyeOff, FiLock, FiUnlock } from 'react-icons/fi';
import { useState } from 'react';

export const PropsPanel = () => {
  const map = useMapStore((state) => state.map);
  const { selectedPropDefinitionId, setSelectedPropDefinition } = useToolStore();
  const { selectedPropIds, selectedLayerId, selectionMode } = useUISelectionStore();
  const updateProp = useMapStore((state) => state.updateProp);
  const removeProp = useMapStore((state) => state.removeProp);
  const [draggedPropId, setDraggedPropId] = useState<string | null>(null);
  
  if (!map) return null;
  
  // Get the selected prop instance if there's exactly one selected
  const selectedProp = selectedPropIds.size === 1 && selectedLayerId
    ? map.layers
        .find(l => l.id === selectedLayerId)
        ?.props.find(p => p.id === Array.from(selectedPropIds)[0])
    : null;
  
  const selectedPropDefinition = selectedProp
    ? map.propDefinitions.find(def => def.id === selectedProp.definitionId)
    : null;
  
  const handleDragStart = (e: React.DragEvent, propDefId: string) => {
    setDraggedPropId(propDefId);
    e.dataTransfer.setData('propDefinitionId', propDefId);
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  const handleDragEnd = () => {
    setDraggedPropId(null);
  };
  
  return (
    <div className="space-y-4">
      {/* Prop Definitions Library */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Prop Library
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {map.propDefinitions.length === 0 ? (
            <p className="col-span-4 text-xs text-slate-500 py-2">No props available</p>
          ) : (
            map.propDefinitions.map((def) => (
              <div
                key={def.id}
                draggable
                onDragStart={(e) => handleDragStart(e, def.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedPropDefinition(def.id)}
                className={`relative border rounded cursor-grab active:cursor-grabbing transition-all ${
                  selectedPropDefinitionId === def.id
                    ? 'border-orange-500 bg-orange-600/20'
                    : draggedPropId === def.id
                    ? 'border-slate-500 opacity-50'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
                title={def.name}
              >
                {/* Prop Preview */}
                <div className="relative w-full aspect-square bg-slate-900/50 rounded overflow-hidden">
                  <img
                    src={def.textureUrl}
                    alt={def.name}
                    className="w-full h-full object-contain"
                    style={{
                      imageRendering: 'pixelated',
                    }}
                  />
                </div>
                {/* Prop Name */}
                <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 px-1 py-0.5">
                  <div className="text-[10px] text-slate-300 truncate text-center">
                    {def.name}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">💡 Drag props onto the canvas</p>
      </div>
      
      {/* Selected Prop Properties */}
      {selectionMode === 'props' && selectedProp && selectedPropDefinition && selectedLayerId && (
        <div className="border-t border-slate-800 pt-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Selected Prop
          </h3>
          
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Name</label>
              <div className="text-sm text-slate-200">{selectedPropDefinition.name}</div>
            </div>
            
            {/* Position - Read only display */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">X</label>
                <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                  {Math.round(selectedProp.x)}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Y</label>
                <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                  {Math.round(selectedProp.y)}
                </div>
              </div>
            </div>
            
            {/* Size - Read only display */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Width</label>
                <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                  {Math.round(selectedProp.width)}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Height</label>
                <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                  {Math.round(selectedProp.height)}
                </div>
              </div>
            </div>
            
            {/* Rotation - Read only display */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Rotation</label>
              <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                {Math.round(selectedProp.rotation)}°
              </div>
            </div>
            
            {/* Scale - Read only display */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Scale X</label>
                <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                  {selectedProp.scaleX.toFixed(2)}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Scale Y</label>
                <div className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-300">
                  {selectedProp.scaleY.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-500 bg-slate-800/50 rounded px-2 py-1.5">
              💡 Use handles on canvas to resize and rotate
            </div>
            
            {/* Opacity */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Opacity: {Math.round(selectedProp.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedProp.opacity}
                onChange={(e) => {
                  const newOpacity = parseFloat(e.target.value);
                  updateProp(selectedLayerId, selectedProp.id, { opacity: newOpacity });
                }}
                className="w-full"
              />
            </div>
            
            {/* Z-Index */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Z-Index (Depth)</label>
              <input
                type="number"
                value={selectedProp.zIndex}
                onChange={(e) => {
                  const newZIndex = parseInt(e.target.value);
                  if (!isNaN(newZIndex)) {
                    updateProp(selectedLayerId, selectedProp.id, { zIndex: newZIndex });
                  }
                }}
                className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-slate-200"
              />
            </div>
            
            {/* Visibility and Lock Controls */}
            <div className="flex items-center gap-2">
              {/* Visibility Toggle */}
              <button
                onClick={() => {
                  updateProp(selectedLayerId, selectedProp.id, { visible: !selectedProp.visible });
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
                  selectedProp.visible
                    ? 'bg-blue-600/20 border border-blue-600/50 text-blue-300 hover:bg-blue-600/30'
                    : 'bg-slate-800 border border-slate-700 text-slate-500 hover:bg-slate-700'
                }`}
                title={selectedProp.visible ? 'Visible' : 'Hidden'}
              >
                {selectedProp.visible ? <FiEye size={16} /> : <FiEyeOff size={16} />}
              </button>
              
              {/* Lock Toggle */}
              <button
                onClick={() => {
                  updateProp(selectedLayerId, selectedProp.id, { locked: !selectedProp.locked });
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
                  selectedProp.locked
                    ? 'bg-orange-600/20 border border-orange-600/50 text-orange-300 hover:bg-orange-600/30'
                    : 'bg-slate-800 border border-slate-700 text-slate-500 hover:bg-slate-700'
                }`}
                title={selectedProp.locked ? 'Locked' : 'Unlocked'}
              >
                {selectedProp.locked ? <FiLock size={16} /> : <FiUnlock size={16} />}
              </button>
            </div>
            
            {/* Delete Button */}
            <button
              onClick={() => {
                if (confirm('Delete this prop?')) {
                  removeProp(selectedLayerId, selectedProp.id);
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 border border-red-600/50 text-red-300 rounded hover:bg-red-600/30 transition-colors"
            >
              <FiTrash2 size={16} />
              <span className="text-sm">Delete Prop</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Multi-selection info */}
      {selectionMode === 'props' && selectedPropIds.size > 1 && (
        <div className="border-t border-slate-800 pt-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Multiple Props Selected
          </h3>
          <p className="text-xs text-slate-500">
            {selectedPropIds.size} props selected
          </p>
        </div>
      )}
    </div>
  );
};
