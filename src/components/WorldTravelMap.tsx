import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { City, TransportRates } from '../types';
import { 
  Plane, 
  Train, 
  Ship, 
  Car, 
  Clock, 
  Zap, 
  MapPin, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  LocateFixed,
  Move,
  Ban,
  Radar
} from 'lucide-react';

interface MapTransform {
  zoom: number;
  pan: { x: number; y: number };
}

export const WorldTravelMap: React.FC = () => {
  const { character, travelMap, initiateTravel, cancelTravel, isMapLoading } = useGame();

  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [transportMode, setTransportMode] = useState<'air' | 'rail' | 'water' | 'road'>('air');
  const [isTraveling, setIsTraveling] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [travelMessage, setTravelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Zoom & Pan State
  const [transform, setTransform] = useState<MapTransform>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  }>({ startX: 0, startY: 0, panX: 0, panY: 0 });
  const hasDraggedRef = useRef(false);

  const touchStartRef = useRef<{
    touches: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    initialDist: number;
    initialZoom: number;
  }>({
    touches: 0,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
    initialDist: 0,
    initialZoom: 1,
  });

  const cities = travelMap?.cities || [];
  const railConnections = travelMap?.rail_connections || [];
  const waterRoutes = travelMap?.water_routes || [];
  const rates = travelMap?.rates || {
    air: { ap: 1, credits: 50 },
    rail: { ap: 2, credits: 30 },
    water: { ap: 3, credits: 20 },
    road: { ap: 4, credits: 10 },
  };

  // Find origin city
  const originCity = useMemo(() => {
    if (!character?.current_city_id) return null;
    return cities.find((c) => c.id === character.current_city_id) || null;
  }, [cities, character?.current_city_id]);

  // Find destination city
  const destCity = useMemo(() => {
    if (!selectedCityId) return null;
    return cities.find((c) => c.id === selectedCityId) || null;
  }, [cities, selectedCityId]);

  // Pixel distance calculation: sqrt((x2 - x1)^2 + (y2 - y1)^2)
  const distance = useMemo(() => {
    if (!originCity || !destCity || originCity.id === destCity.id) return 0;
    const dx = destCity.map_x - originCity.map_x;
    const dy = destCity.map_y - originCity.map_y;
    return Math.sqrt(dx * dx + dy * dy);
  }, [originCity, destCity]);

  // Route Eligibility check
  const routeValidation = useMemo(() => {
    if (!originCity || !destCity || originCity.id === destCity.id) {
      return { eligible: false, reason: 'Select a destination sector' };
    }

    if (transportMode === 'air') {
      if (!originCity.has_airport) return { eligible: false, reason: `${originCity.name} has no international airport` };
      if (!destCity.has_airport) return { eligible: false, reason: `${destCity.name} has no international airport` };
      return { eligible: true, reason: `Direct commercial flight lane available between ${originCity.name} and ${destCity.name}` };
    }

    if (transportMode === 'rail') {
      if (!originCity.has_rail) return { eligible: false, reason: `${originCity.name} has no continental rail terminal` };
      if (!destCity.has_rail) return { eligible: false, reason: `${destCity.name} has no continental rail terminal` };
      const hasConnection = railConnections.some(
        (rc) =>
          (rc.city_a_id === originCity.id && rc.city_b_id === destCity.id) ||
          (rc.city_a_id === destCity.id && rc.city_b_id === originCity.id)
      );
      if (!hasConnection) {
        return { eligible: false, reason: `No direct rail track between ${originCity.name} and ${destCity.name}` };
      }
      return { eligible: true, reason: `Direct high-speed rail corridor active between ${originCity.name} and ${destCity.name}` };
    }

    if (transportMode === 'water') {
      if (!originCity.has_port) return { eligible: false, reason: `${originCity.name} has no maritime shipping port` };
      if (!destCity.has_port) return { eligible: false, reason: `${destCity.name} has no maritime shipping port` };
      const hasRoute = waterRoutes.some(
        (wr) =>
          (wr.city_a_id === originCity.id && wr.city_b_id === destCity.id) ||
          (wr.city_a_id === destCity.id && wr.city_b_id === originCity.id)
      );
      if (!hasRoute) {
        return { eligible: false, reason: `No navigable maritime route between ${originCity.name} and ${destCity.name}` };
      }
      return { eligible: true, reason: `Direct maritime shipping route open between ${originCity.name} and ${destCity.name}` };
    }

    if (transportMode === 'road') {
      return { eligible: true, reason: `Ground transport road access available` };
    }

    return { eligible: false, reason: 'Invalid mode' };
  }, [originCity, destCity, transportMode, railConnections, waterRoutes]);

  // Cost calculation with Math.ceil (strictly rounded up per game rule)
  const currentRate = rates[transportMode];
  const apCost = distance > 0 ? Math.ceil((distance / 100) * currentRate.ap) : 0;
  const creditCost = distance > 0 ? Math.ceil((distance / 100) * currentRate.credits) : 0;

  const currentAp = character?.action_points?.current_ap ?? 0;
  const currentCredits = character?.credits ?? 0;
  const apDeficit = Math.max(0, apCost - currentAp);

  const canAfford = currentAp >= 1 && currentCredits >= creditCost;

  // Non-passive wheel event listener for smooth zooming centered on pointer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      setTransform((prev) => {
        const nextZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.75), 4.5);
        if (Math.abs(nextZoom - prev.zoom) < 0.001) return prev;

        const scaleRatio = nextZoom / prev.zoom;
        const nextPanX = px - (px - prev.pan.x) * scaleRatio;
        const nextPanY = py - (py - prev.pan.y) * scaleRatio;

        return {
          zoom: nextZoom,
          pan: { x: nextPanX, y: nextPanY },
        };
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: transform.pan.x,
      panY: transform.pan.y,
    };
    hasDraggedRef.current = false;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      if (Math.hypot(dx, dy) > 4) {
        hasDraggedRef.current = true;
      }
      setTransform((prev) => ({
        ...prev,
        pan: {
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy,
        },
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 50);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Touch support for pinch-to-zoom and drag-to-pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = {
        touches: 1,
        startX: t.clientX,
        startY: t.clientY,
        panX: transform.pan.x,
        panY: transform.pan.y,
        initialDist: 0,
        initialZoom: transform.zoom,
      };
      hasDraggedRef.current = false;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartRef.current = {
        touches: 2,
        startX: (t1.clientX + t2.clientX) / 2,
        startY: (t1.clientY + t2.clientY) / 2,
        panX: transform.pan.x,
        panY: transform.pan.y,
        initialDist: dist,
        initialZoom: transform.zoom,
      };
      hasDraggedRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartRef.current.touches === 1) {
      const t = e.touches[0];
      const dx = t.clientX - touchStartRef.current.startX;
      const dy = t.clientY - touchStartRef.current.startY;
      if (Math.hypot(dx, dy) > 5) {
        hasDraggedRef.current = true;
      }
      setTransform((prev) => ({
        ...prev,
        pan: {
          x: touchStartRef.current.panX + dx,
          y: touchStartRef.current.panY + dy,
        },
      }));
    } else if (e.touches.length === 2 && touchStartRef.current.touches === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (touchStartRef.current.initialDist > 0) {
        const scale = dist / touchStartRef.current.initialDist;
        const nextZoom = Math.min(Math.max(touchStartRef.current.initialZoom * scale, 0.75), 4.5);
        setTransform((prev) => ({
          ...prev,
          zoom: nextZoom,
        }));
      }
    }
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  };

  // Zoom and Pan Button Controls
  const handleZoomIn = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setTransform((prev) => {
      const nextZoom = Math.min(prev.zoom * 1.25, 4.5);
      const scaleRatio = nextZoom / prev.zoom;
      return {
        zoom: nextZoom,
        pan: {
          x: cx - (cx - prev.pan.x) * scaleRatio,
          y: cy - (cy - prev.pan.y) * scaleRatio,
        },
      };
    });
  };

  const handleZoomOut = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setTransform((prev) => {
      const nextZoom = Math.max(prev.zoom / 1.25, 0.75);
      const scaleRatio = nextZoom / prev.zoom;
      return {
        zoom: nextZoom,
        pan: {
          x: cx - (cx - prev.pan.x) * scaleRatio,
          y: cy - (cy - prev.pan.y) * scaleRatio,
        },
      };
    });
  };

  const handleResetView = () => {
    setTransform({ zoom: 1, pan: { x: 0, y: 0 } });
  };

  const handleCenterStation = () => {
    if (!originCity || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cityNormX = originCity.map_x / 1440;
    const cityNormY = originCity.map_y / 720;
    const targetZoom = Math.max(transform.zoom, 1.6);
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setTransform({
      zoom: targetZoom,
      pan: {
        x: cx - cityNormX * rect.width * targetZoom,
        y: cy - cityNormY * rect.height * targetZoom,
      },
    });
  };

  const handleDepart = async () => {
    if (character?.travel_status === 'in_transit') {
      setTravelMessage({ type: 'error', text: 'Operative is currently in transit. Await arrival or cancel travel first.' });
      return;
    }
    if (character?.travel_status === 'in_surveillance') {
      setTravelMessage({ type: 'error', text: 'Operative is in surveillance mode. Complete or abort surveillance before traveling.' });
      return;
    }
    if (!selectedCityId || !routeValidation.eligible || !canAfford) return;
    setIsTraveling(true);
    setTravelMessage(null);

    try {
      const res = await initiateTravel(selectedCityId, transportMode);
      setTravelMessage({
        type: 'success',
        text: res.message || `Successfully departed for ${destCity?.name}`,
      });
    } catch (err: any) {
      setTravelMessage({
        type: 'error',
        text: err?.message || 'Failed to initiate travel',
      });
    } finally {
      setIsTraveling(false);
    }
  };

  const handleCancelTravel = async () => {
    setIsCanceling(true);
    setTravelMessage(null);
    try {
      const res = await cancelTravel();
      setShowCancelConfirm(false);
      setTravelMessage({
        type: 'success',
        text: res.message || 'Travel cancelled. Operative remains at departure station.',
      });
    } catch (err: any) {
      setTravelMessage({
        type: 'error',
        text: err?.message || 'Failed to cancel travel',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Travel Engine Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <span>Global Transport & Strategic Relocation</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            25 International Sectors. Travel consumes AP and Swiss Bank Credits. Round-up rates strictly enforced.
          </p>
        </div>

        {originCity && (
          <div className="text-xs bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-neutral-500">Current Station:</span>
            <span className="text-amber-400 font-bold">{originCity.name}, {originCity.country}</span>
          </div>
        )}
      </div>

      {travelMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            travelMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          {travelMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{travelMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Interactive Map + Travel Booking Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SVG Interactive World Map (7 Cols) */}
        <div className="lg:col-span-8 bg-neutral-950 border border-neutral-800 rounded-2xl p-4 relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-4 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Current Station</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Destination Target</span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-emerald-500/60" />
                <span>Rail Track</span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-blue-500/60" />
                <span>Maritime Route</span>
              </span>
            </div>

            <span className="text-[10px] text-neutral-600">
              Coordinates: 1400 × 700 px Grid
            </span>
          </div>

          {/* SVG Canvas Map */}
          <div 
            id="world-travel-map-container"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`w-full aspect-[14/7] bg-neutral-900/60 border border-neutral-800/80 rounded-xl relative overflow-hidden select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Grid overlay */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #a3a3a3 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Tactical Map HUD Controls (Zoom In, Out, Reset, Center Station) */}
            <div 
              className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-neutral-950/90 backdrop-blur-md p-1.5 rounded-xl border border-neutral-800 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                id="map-btn-zoom-in"
                onClick={handleZoomIn}
                title="Zoom In (or Scroll Up)"
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="map-btn-zoom-indicator"
                onClick={handleResetView}
                title="Zoom Level (Click to reset 100%)"
                className="text-[10px] font-mono font-bold text-center text-neutral-400 hover:text-neutral-200 cursor-pointer py-0.5 select-none"
              >
                {Math.round(transform.zoom * 100)}%
              </button>
              <button
                type="button"
                id="map-btn-zoom-out"
                onClick={handleZoomOut}
                title="Zoom Out (or Scroll Down)"
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="w-full h-px bg-neutral-800 my-0.5" />
              {originCity && (
                <button
                  type="button"
                  id="map-btn-center-station"
                  onClick={handleCenterStation}
                  title={`Center Station: ${originCity.name}`}
                  className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                id="map-btn-reset-view"
                onClick={handleResetView}
                title="Reset Map View"
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Gesture Hint Badge */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-neutral-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-800/90 text-[10px] text-neutral-400 shadow-lg pointer-events-none select-none">
              <Move className="w-3 h-3 text-cyan-400" />
              <span>Drag to Pan</span>
              <span className="text-neutral-600">•</span>
              <span>Wheel to Zoom</span>
            </div>

            {/* Scalable & Pannable Vector Layer */}
            <div
              style={{
                width: '100%',
                height: '100%',
                transform: `translate(${transform.pan.x}px, ${transform.pan.y}px) scale(${transform.zoom})`,
                transformOrigin: '0 0',
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                willChange: 'transform',
              }}
            >
              <svg
                viewBox="0 0 1440 720"
                className="w-full h-full select-none pointer-events-auto"
              >
                {/* Rail Connections */}
                {railConnections.map((rc) => {
                  const cityA = cities.find((c) => c.id === rc.city_a_id);
                  const cityB = cities.find((c) => c.id === rc.city_b_id);
                  if (!cityA || !cityB) return null;
                  return (
                    <line
                      key={`rail-${rc.id}`}
                      x1={cityA.map_x}
                      y1={cityA.map_y}
                      x2={cityB.map_x}
                      y2={cityB.map_y}
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      opacity="0.45"
                    />
                  );
                })}

                {/* Water Routes */}
                {waterRoutes.map((wr) => {
                  const cityA = cities.find((c) => c.id === wr.city_a_id);
                  const cityB = cities.find((c) => c.id === wr.city_b_id);
                  if (!cityA || !cityB) return null;
                  return (
                    <line
                      key={`water-${wr.id}`}
                      x1={cityA.map_x}
                      y1={cityA.map_y}
                      x2={cityB.map_x}
                      y2={cityB.map_y}
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                      opacity="0.35"
                    />
                  );
                })}

                {/* Active Flight Path Arc if Air Selected */}
                {originCity && destCity && transportMode === 'air' && routeValidation.eligible && (
                  <path
                    d={`M ${originCity.map_x} ${originCity.map_y} Q ${(originCity.map_x + destCity.map_x) / 2} ${Math.min(originCity.map_y, destCity.map_y) - 60} ${destCity.map_x} ${destCity.map_y}`}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                )}

                {/* Active Ground Path if Road Selected */}
                {originCity && destCity && transportMode === 'road' && (
                  <line
                    x1={originCity.map_x}
                    y1={originCity.map_y}
                    x2={destCity.map_x}
                    y2={destCity.map_y}
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    className="animate-pulse"
                  />
                )}

                {/* Cities Nodes */}
                {cities.map((city) => {
                  const isCurrent = originCity?.id === city.id;
                  const isSelected = destCity?.id === city.id;

                  return (
                    <g
                      key={city.id}
                      className="cursor-pointer transition-transform hover:scale-125"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasDraggedRef.current) return;
                        if (!isCurrent) setSelectedCityId(city.id);
                      }}
                    >
                      {/* Ring for Current City */}
                      {isCurrent && (
                        <circle
                          cx={city.map_x}
                          cy={city.map_y}
                          r="12"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          className="animate-ping"
                          opacity="0.7"
                        />
                      )}

                      {/* Target Reticle for Selected City */}
                      {isSelected && (
                        <circle
                          cx={city.map_x}
                          cy={city.map_y}
                          r="10"
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* City Marker Node */}
                      <circle
                        cx={city.map_x}
                        cy={city.map_y}
                        r={isCurrent ? "5" : isSelected ? "5" : "3.5"}
                        fill={isCurrent ? "#f59e0b" : isSelected ? "#06b6d4" : "#737373"}
                        stroke="#171717"
                        strokeWidth="1"
                      />

                      {/* City Label */}
                      <text
                        x={city.map_x + 6}
                        y={city.map_y - 4}
                        fill={isCurrent ? "#fbbf24" : isSelected ? "#22d3ee" : "#a3a3a3"}
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight={isCurrent || isSelected ? "bold" : "normal"}
                      >
                        {city.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-neutral-400 gap-2">
            <span>Click any destination node on the grid to calculate vector and initiate transfer.</span>
            <span className="text-neutral-500">Mode rules: Road (Universal), Air (Airports), Rail (Connected Tracks), Water (Sea lanes).</span>
          </div>
        </div>

        {/* Travel Control Terminal (4 Cols) */}
        <div className="lg:col-span-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider border-b border-neutral-800 pb-2">
              Dispatch Terminal // Flight & Route Booking
            </h3>

            {/* In-Transit Active State Card */}
            {character?.travel_status === 'in_transit' && (
              <div className="bg-amber-950/40 border border-amber-600/70 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    Operative In Transit
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 border border-amber-700 text-amber-200 uppercase font-bold">
                    {typeof character.transport_mode === 'string' ? character.transport_mode : 'Transit'}
                  </span>
                </div>

                <div className="text-xs text-neutral-300 space-y-1.5 bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Departure Station:</span>
                    <span className="text-neutral-200 font-bold">{originCity?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Destination Sector:</span>
                    <span className="text-amber-400 font-bold">
                      {cities.find(c => c.id === character.destination_city_id)?.name || 'Transit Target'}
                    </span>
                  </div>
                  {character.arrives_at && (
                    <div className="flex justify-between text-[11px] pt-1.5 border-t border-neutral-800">
                      <span className="text-neutral-500">Scheduled Arrival:</span>
                      <span className="text-neutral-300">{new Date(character.arrives_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                {showCancelConfirm ? (
                  <div className="bg-rose-950/70 border border-rose-800 rounded-lg p-3 space-y-2 text-xs text-rose-200">
                    <div className="font-bold text-rose-300 flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-rose-400" />
                      <span>Confirm Travel Cancellation</span>
                    </div>
                    <p className="text-[11px] text-rose-200/90 leading-relaxed">
                      All AP and Money paid to initiate Travel is lost. The operative will terminate journey and remain at {originCity?.name}.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isCanceling}
                        onClick={() => setShowCancelConfirm(false)}
                        className="flex-1 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-bold cursor-pointer"
                      >
                        Keep Traveling
                      </button>
                      <button
                        type="button"
                        disabled={isCanceling}
                        onClick={handleCancelTravel}
                        className="flex-1 py-1.5 rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1"
                      >
                        {isCanceling ? 'Canceling...' : 'Confirm Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-2 px-3 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-400" />
                    <span>Cancel Ongoing Journey</span>
                  </button>
                )}
              </div>
            )}

            {/* In-Surveillance Alert */}
            {character?.travel_status === 'in_surveillance' && (
              <div className="bg-cyan-950/40 border border-cyan-500/60 rounded-xl p-3 text-xs text-cyan-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <Radar className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>Surveillance Mode Active</span>
                </div>
                <p className="text-[11px] text-cyan-300/80 leading-relaxed">
                  Operative is deployed in surveillance mode. Global travel is locked until the intelligence probe finishes or is aborted in the Intel Terminal.
                </p>
              </div>
            )}

            {/* Origin & Destination Selectors */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Departure Station</label>
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-bold">{originCity?.name || 'Loading station...'}</span>
                  <span className="text-neutral-500 text-[11px]">({originCity?.country})</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Destination Sector</label>
                <select
                  value={selectedCityId || ''}
                  onChange={(e) => setSelectedCityId(e.target.value || null)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Select Destination City --</option>
                  {cities
                    .filter((c) => c.id !== originCity?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}, {c.country} ({c.continent})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Transport Mode Buttons */}
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1.5">Mode of Transport</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Air */}
                <button
                  type="button"
                  onClick={() => setTransportMode('air')}
                  className={`p-2 rounded-lg border flex items-center gap-2 transition-colors cursor-pointer ${
                    transportMode === 'air'
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Plane className="w-4 h-4 text-cyan-400" />
                  <div className="text-left">
                    <div className="leading-none">Air</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">1 AP / $50</div>
                  </div>
                </button>

                {/* Rail */}
                <button
                  type="button"
                  onClick={() => setTransportMode('rail')}
                  className={`p-2 rounded-lg border flex items-center gap-2 transition-colors cursor-pointer ${
                    transportMode === 'rail'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Train className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <div className="leading-none">Rail</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">2 AP / $30</div>
                  </div>
                </button>

                {/* Water */}
                <button
                  type="button"
                  onClick={() => setTransportMode('water')}
                  className={`p-2 rounded-lg border flex items-center gap-2 transition-colors cursor-pointer ${
                    transportMode === 'water'
                      ? 'bg-blue-950/60 border-blue-500 text-blue-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Ship className="w-4 h-4 text-blue-400" />
                  <div className="text-left">
                    <div className="leading-none">Water</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">3 AP / $20</div>
                  </div>
                </button>

                {/* Road */}
                <button
                  type="button"
                  onClick={() => setTransportMode('road')}
                  className={`p-2 rounded-lg border flex items-center gap-2 transition-colors cursor-pointer ${
                    transportMode === 'road'
                      ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Car className="w-4 h-4 text-amber-400" />
                  <div className="text-left">
                    <div className="leading-none">Road</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">4 AP / $10</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Route Status & Eligibility */}
            <div className={`p-3 rounded-lg border text-xs ${
              routeValidation.eligible
                ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                {routeValidation.eligible ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{routeValidation.eligible ? 'Route Verified' : 'Route Requirement'}</span>
              </div>
              <p className="text-[11px] leading-tight text-neutral-400">
                {routeValidation.reason}
              </p>
            </div>

            {/* Cost & Deficit Breakdown */}
            {destCity && (
              <div className="bg-neutral-950 rounded-xl p-3 border border-neutral-800 text-xs space-y-2">
                <div className="flex justify-between text-neutral-400">
                  <span>Vector Distance:</span>
                  <strong className="text-neutral-200">{Math.round(distance)} px</strong>
                </div>

                <div className="flex justify-between text-neutral-400">
                  <span>Action Points Required:</span>
                  <span className="font-bold text-amber-400">
                    {apCost} AP {currentAp < apCost && `(Have: ${currentAp})`}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-400">
                  <span>Financial Fare:</span>
                  <span className={`font-bold ${currentCredits < creditCost ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ${creditCost.toLocaleString()} Credits
                  </span>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex justify-between text-[11px]">
                  <span>Transit Duration:</span>
                  {apDeficit === 0 ? (
                    <strong className="text-emerald-400">Immediate Arrival (0h)</strong>
                  ) : (
                    <strong className="text-amber-400">{apDeficit}h In-Transit Deficit</strong>
                  )}
                </div>

                {apDeficit > 0 && (
                  <div className="text-[10px] text-amber-300/80 bg-amber-950/30 p-2 rounded border border-amber-900/50 leading-tight">
                    * Deficit transit count-down starts the moment you depart ({apDeficit}h duration). Operatives recover deficit while in transit, arriving at destination once the journey timer completes.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-4 pt-3 border-t border-neutral-800">
            <button
              type="button"
              disabled={!routeValidation.eligible || !canAfford || isTraveling || character?.travel_status === 'in_transit' || character?.travel_status === 'in_surveillance'}
              onClick={handleDepart}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg"
            >
              {character?.travel_status === 'in_transit'
                ? 'Operative Already In Transit'
                : character?.travel_status === 'in_surveillance'
                ? 'Relocation Locked (In Surveillance)'
                : isTraveling
                ? 'Relocating Operative...'
                : !destCity
                ? 'Select Destination Sector'
                : !routeValidation.eligible
                ? 'Mode Ineligible For Route'
                : currentAp < 1
                ? 'Min 1 AP Required To Depart'
                : currentCredits < creditCost
                ? 'Insufficient Credits'
                : apDeficit === 0
                ? `Immediate Transfer to ${destCity.name}`
                : `Depart for ${destCity.name} (${apDeficit}h In-Transit)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
