import React, { useState } from 'react';
import { adminApi } from '../adminApi';
import { 
  Train, 
  Ship, 
  Plane, 
  Car, 
  Plus, 
  Trash2, 
  ArrowRightLeft, 
  X, 
  Check, 
  AlertCircle,
  Network
} from 'lucide-react';

interface CityItem {
  id: string;
  name: string;
  country: string;
  continent: string;
  has_airport: boolean;
  has_rail: boolean;
  has_port: boolean;
}

interface ConnectionItem {
  id: string;
  city_a_id: string;
  city_b_id: string;
}

interface TravelConnectionsManagerProps {
  cities: CityItem[];
  railConnections: ConnectionItem[];
  waterRoutes: ConnectionItem[];
  onRefresh: () => void;
}

export const TravelConnectionsManager: React.FC<TravelConnectionsManagerProps> = ({
  cities,
  railConnections,
  waterRoutes,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'rail' | 'water' | 'overview'>('rail');
  const [railCityA, setRailCityA] = useState('');
  const [railCityB, setRailCityB] = useState('');
  const [waterCityA, setWaterCityA] = useState('');
  const [waterCityB, setWaterCityB] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cityMap = React.useMemo(() => {
    const map = new Map<string, CityItem>();
    cities.forEach((c) => map.set(c.id, c));
    return map;
  }, [cities]);

  // Handle adding rail connection
  const handleAddRail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!railCityA || !railCityB) return;
    if (railCityA === railCityB) {
      setStatusMsg({ type: 'error', text: 'Select two different cities to connect by rail' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      await adminApi.addRailConnection(railCityA, railCityB);
      setStatusMsg({ type: 'success', text: 'Direct rail connection created successfully' });
      setRailCityA('');
      setRailCityB('');
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add rail connection' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting rail connection
  const handleDeleteRail = async (id: string, nameA: string, nameB: string) => {
    if (!window.confirm(`Disconnect rail line between ${nameA} and ${nameB}?`)) return;

    setStatusMsg(null);
    try {
      await adminApi.deleteRailConnection(id);
      setStatusMsg({ type: 'success', text: `Rail connection between ${nameA} and ${nameB} removed` });
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete rail connection' });
    }
  };

  // Handle adding water route
  const handleAddWater = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waterCityA || !waterCityB) return;
    if (waterCityA === waterCityB) {
      setStatusMsg({ type: 'error', text: 'Select two different port cities for water route' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      await adminApi.addWaterRoute(waterCityA, waterCityB);
      setStatusMsg({ type: 'success', text: 'Maritime sea corridor created successfully' });
      setWaterCityA('');
      setWaterCityB('');
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add water route' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting water route
  const handleDeleteWater = async (id: string, nameA: string, nameB: string) => {
    if (!window.confirm(`Decommission sea route between ${nameA} and ${nameB}?`)) return;

    setStatusMsg(null);
    try {
      await adminApi.deleteWaterRoute(id);
      setStatusMsg({ type: 'success', text: `Maritime route between ${nameA} and ${nameB} removed` });
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete water route' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <span>Travel Modes & Route Topologies</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure direct train networks, maritime sea corridors, and travel mode accessibility.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
          <button
            onClick={() => setActiveSubTab('rail')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeSubTab === 'rail'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Train className="w-3.5 h-3.5" />
            <span>Rail Lines ({railConnections.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('water')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeSubTab === 'water'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Ship className="w-3.5 h-3.5" />
            <span>Maritime Routes ({waterRoutes.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Mode Rules</span>
          </button>
        </div>
      </div>

      {/* Status Notice */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
              : 'bg-rose-950/40 border-rose-700 text-rose-300'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rail Sub-tab */}
      {activeSubTab === 'rail' && (
        <div className="space-y-6">
          {/* Add Rail Connection Form */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-2.5">
              <Train className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                Establish Direct Rail Connection
              </h3>
            </div>

            <form onSubmit={handleAddRail} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">City A (Station Terminal)</label>
                <select
                  value={railCityA}
                  onChange={(e) => setRailCityA(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select origin city...</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.country}) {c.has_rail ? '' : '⚠️ (No Rail Hub)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">City B (Connected Terminal)</label>
                <select
                  value={railCityB}
                  onChange={(e) => setRailCityB(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select destination city...</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.country}) {c.has_rail ? '' : '⚠️ (No Rail Hub)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Linking...' : 'Connect Rail Line'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Rail Connections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {railConnections.map((rc) => {
              const cityA = cityMap.get(rc.city_a_id);
              const cityB = cityMap.get(rc.city_b_id);
              const nameA = cityA?.name || 'Unknown City';
              const nameB = cityB?.name || 'Unknown City';

              return (
                <div
                  key={rc.id}
                  className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl flex items-center justify-between text-xs hover:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Train className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-neutral-200 truncate">
                        {nameA} <ArrowRightLeft className="inline w-3 h-3 text-neutral-500 mx-1" /> {nameB}
                      </div>
                      <div className="text-[10px] text-neutral-500 truncate">
                        {cityA?.continent === cityB?.continent ? cityA?.continent : 'Inter-continental'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteRail(rc.id, nameA, nameB)}
                    className="p-1.5 rounded-lg bg-neutral-950 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-300 border border-neutral-800 transition-colors cursor-pointer shrink-0 ml-2"
                    title="Remove Rail Connection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Water Sub-tab */}
      {activeSubTab === 'water' && (
        <div className="space-y-6">
          {/* Add Water Route Form */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-2.5">
              <Ship className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                Establish Maritime Sea Corridor
              </h3>
            </div>

            <form onSubmit={handleAddWater} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Port City A</label>
                <select
                  value={waterCityA}
                  onChange={(e) => setWaterCityA(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select departure port...</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.country}) {c.has_port ? '' : '⚠️ (No Port)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Port City B</label>
                <select
                  value={waterCityB}
                  onChange={(e) => setWaterCityB(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select arrival port...</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.country}) {c.has_port ? '' : '⚠️ (No Port)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Charting...' : 'Establish Sea Route'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Maritime Routes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {waterRoutes.map((wr) => {
              const cityA = cityMap.get(wr.city_a_id);
              const cityB = cityMap.get(wr.city_b_id);
              const nameA = cityA?.name || 'Unknown Port';
              const nameB = cityB?.name || 'Unknown Port';

              return (
                <div
                  key={wr.id}
                  className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl flex items-center justify-between text-xs hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Ship className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-neutral-200 truncate">
                        {nameA} <ArrowRightLeft className="inline w-3 h-3 text-neutral-500 mx-1" /> {nameB}
                      </div>
                      <div className="text-[10px] text-neutral-500 truncate">
                        {cityA?.continent} ➔ {cityB?.continent}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteWater(wr.id, nameA, nameB)}
                    className="p-1.5 rounded-lg bg-neutral-950 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-300 border border-neutral-800 transition-colors cursor-pointer shrink-0 ml-2"
                    title="Remove Water Route"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode Rules Overview */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-cyan-400 text-sm">
              <Plane className="w-4 h-4" />
              <span>Air Travel Mode Requirements</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Air transit requires both origin and destination cities to possess active airport hubs (<code className="text-cyan-300">has_airport = true</code>). Flight paths calculate straight Euclidean distance between coordinates.
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
              <Train className="w-4 h-4" />
              <span>Rail Travel Mode Requirements</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Rail transit requires both cities to have station terminals (<code className="text-amber-300">has_rail = true</code>) AND an explicitly chartered connection in the <code className="text-amber-300">rail_connections</code> table.
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-400 text-sm">
              <Ship className="w-4 h-4" />
              <span>Maritime Sea Route Requirements</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Water transit requires coastal harbor access (<code className="text-blue-300">has_port = true</code>) on both ends, plus an explicit corridor logged in the <code className="text-blue-300">water_routes</code> table.
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
              <Car className="w-4 h-4" />
              <span>Road Vehicle Travel Requirements</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Automobile and overland transit is universally permitted between any cities, but incurs the highest AP requirements and travel times per 100 pixels.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
