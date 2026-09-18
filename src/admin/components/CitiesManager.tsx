import React, { useState, useMemo } from 'react';
import { adminApi } from '../adminApi';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  MapPin, 
  Plane, 
  Train, 
  Ship,
  Globe
} from 'lucide-react';

interface CityItem {
  id: string;
  name: string;
  country: string;
  continent: string;
  map_x: number;
  map_y: number;
  has_airport: boolean;
  has_rail: boolean;
  has_port: boolean;
}

interface CitiesManagerProps {
  cities: CityItem[];
  onRefresh: () => void;
}

const CONTINENTS = ['All', 'North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'];

export const CitiesManager: React.FC<CitiesManagerProps> = ({ cities, onRefresh }) => {
  const [selectedContinent, setSelectedContinent] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingCity, setEditingCity] = useState<CityItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New City form state
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    continent: 'Europe',
    map_x: 500,
    map_y: 300,
    has_airport: true,
    has_rail: true,
    has_port: false,
  });

  const filteredCities = useMemo(() => {
    return cities.filter((c) => {
      const matchCont = selectedContinent === 'All' || c.continent === selectedContinent;
      const matchSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.continent.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCont && matchSearch;
    });
  }, [cities, selectedContinent, searchQuery]);

  const handleEditClick = (city: CityItem) => {
    setEditingCity({ ...city });
    setIsCreating(false);
  };

  const handleCreateClick = () => {
    setFormData({
      name: '',
      country: '',
      continent: 'Europe',
      map_x: 500,
      map_y: 300,
      has_airport: true,
      has_rail: true,
      has_port: false,
    });
    setIsCreating(true);
    setEditingCity(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity) return;

    setIsSaving(true);
    setStatusMsg(null);
    try {
      await adminApi.updateCity(editingCity.id, editingCity);
      setStatusMsg({ type: 'success', text: `City "${editingCity.name}" updated successfully` });
      setEditingCity(null);
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update city' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await adminApi.createCity(formData);
      setStatusMsg({ type: 'success', text: `New city "${formData.name}" created on world map` });
      setIsCreating(false);
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create city' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCity = async (city: CityItem) => {
    if (!window.confirm(`Delete city "${city.name}"? This removes any travel routes connected to this sector.`)) {
      return;
    }

    setStatusMsg(null);
    try {
      await adminApi.deleteCity(city.id);
      setStatusMsg({ type: 'success', text: `City "${city.name}" deleted` });
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete city' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <span>Global City Sectors Registry</span>
            <span className="text-xs font-mono font-normal text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
              {filteredCities.length} / {cities.length} Cities
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure geopolitical sectors, map coordinates, and transport hubs (Air, Rail, Maritime Port).
          </p>
        </div>

        <button
          onClick={handleCreateClick}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New City</span>
        </button>
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

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Continent tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-neutral-900/80 p-1.5 rounded-xl border border-neutral-800">
          {CONTINENTS.map((cont) => (
            <button
              key={cont}
              onClick={() => setSelectedContinent(cont)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedContinent === cont
                  ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 font-bold shadow-inner'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cont}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city by name, country, or continent..."
            className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Create / Edit Modal Form */}
      {(isCreating || editingCity) && (
        <div className="bg-neutral-900 border border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-amber-400">
              {isCreating ? 'CREATE NEW CITY SECTOR' : `EDIT CITY: ${editingCity?.name}`}
            </h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingCity(null);
              }}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={isCreating ? handleSaveCreate : handleSaveEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* City Name */}
              <div>
                <label className="block text-neutral-400 mb-1">City Name *</label>
                <input
                  type="text"
                  required
                  value={isCreating ? formData.name : editingCity?.name}
                  onChange={(e) =>
                    isCreating
                      ? setFormData({ ...formData, name: e.target.value })
                      : setEditingCity((prev: any) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Vienna, Tokyo"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-neutral-400 mb-1">Country *</label>
                <input
                  type="text"
                  required
                  value={isCreating ? formData.country : editingCity?.country}
                  onChange={(e) =>
                    isCreating
                      ? setFormData({ ...formData, country: e.target.value })
                      : setEditingCity((prev: any) => ({ ...prev, country: e.target.value }))
                  }
                  placeholder="e.g. Austria, Japan"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Continent */}
              <div>
                <label className="block text-neutral-400 mb-1">Continent *</label>
                <select
                  value={isCreating ? formData.continent : editingCity?.continent}
                  onChange={(e) =>
                    isCreating
                      ? setFormData({ ...formData, continent: e.target.value })
                      : setEditingCity((prev: any) => ({ ...prev, continent: e.target.value }))
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                >
                  {CONTINENTS.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Coordinates Map X and Y */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-400 mb-1">Map X Coordinate (Pixel 0 - 1000)</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  required
                  value={isCreating ? formData.map_x : editingCity?.map_x}
                  onChange={(e) =>
                    isCreating
                      ? setFormData({ ...formData, map_x: parseInt(e.target.value, 10) || 0 })
                      : setEditingCity((prev: any) => ({ ...prev, map_x: parseInt(e.target.value, 10) || 0 }))
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Map Y Coordinate (Pixel 0 - 600)</label>
                <input
                  type="number"
                  min="0"
                  max="600"
                  required
                  value={isCreating ? formData.map_y : editingCity?.map_y}
                  onChange={(e) =>
                    isCreating
                      ? setFormData({ ...formData, map_y: parseInt(e.target.value, 10) || 0 })
                      : setEditingCity((prev: any) => ({ ...prev, map_y: parseInt(e.target.value, 10) || 0 }))
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Hub Checkboxes: has_airport, has_rail, has_port */}
            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-2">
              <span className="text-[11px] text-neutral-400 block font-bold uppercase tracking-wider">
                Available Transport Infrastructure Hubs:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-200">
                  <input
                    type="checkbox"
                    checked={isCreating ? formData.has_airport : Boolean(editingCity?.has_airport)}
                    onChange={(e) =>
                      isCreating
                        ? setFormData({ ...formData, has_airport: e.target.checked })
                        : setEditingCity((prev: any) => ({ ...prev, has_airport: e.target.checked }))
                    }
                    className="rounded border-neutral-700 text-cyan-500 focus:ring-cyan-500 bg-neutral-900"
                  />
                  <Plane className="w-4 h-4 text-cyan-400" />
                  <span>Airport (Flight Hub)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-neutral-200">
                  <input
                    type="checkbox"
                    checked={isCreating ? formData.has_rail : Boolean(editingCity?.has_rail)}
                    onChange={(e) =>
                      isCreating
                        ? setFormData({ ...formData, has_rail: e.target.checked })
                        : setEditingCity((prev: any) => ({ ...prev, has_rail: e.target.checked }))
                    }
                    className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500 bg-neutral-900"
                  />
                  <Train className="w-4 h-4 text-amber-400" />
                  <span>Rail Station (Train Hub)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-neutral-200">
                  <input
                    type="checkbox"
                    checked={isCreating ? formData.has_port : Boolean(editingCity?.has_port)}
                    onChange={(e) =>
                      isCreating
                        ? setFormData({ ...formData, has_port: e.target.checked })
                        : setEditingCity((prev: any) => ({ ...prev, has_port: e.target.checked }))
                    }
                    className="rounded border-neutral-700 text-blue-500 focus:ring-blue-500 bg-neutral-900"
                  />
                  <Ship className="w-4 h-4 text-blue-400" />
                  <span>Maritime Sea Port</span>
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingCity(null);
                }}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg cursor-pointer transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving City...' : isCreating ? 'Register City' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cities Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">City / Sector</th>
                <th className="py-3 px-3">Country</th>
                <th className="py-3 px-3">Continent</th>
                <th className="py-3 px-3">Map Coordinates</th>
                <th className="py-3 px-3">Travel Hubs Available</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {filteredCities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    No cities match the filter.
                  </td>
                </tr>
              ) : (
                filteredCities.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-100 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-neutral-300">{c.country}</td>
                    <td className="py-3 px-3">
                      <span className="text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded text-[10px]">
                        {c.continent}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-400">
                      X: <strong className="text-neutral-200">{c.map_x}</strong>, Y: <strong className="text-neutral-200">{c.map_y}</strong>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                            c.has_airport ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60' : 'bg-neutral-800 text-neutral-600 line-through'
                          }`}
                          title={c.has_airport ? 'Airport Hub Available' : 'No Airport'}
                        >
                          <Plane className="w-3 h-3" />
                          AIR
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                            c.has_rail ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'bg-neutral-800 text-neutral-600 line-through'
                          }`}
                          title={c.has_rail ? 'Rail Hub Available' : 'No Rail Station'}
                        >
                          <Train className="w-3 h-3" />
                          RAIL
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                            c.has_port ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60' : 'bg-neutral-800 text-neutral-600 line-through'
                          }`}
                          title={c.has_port ? 'Sea Port Available' : 'No Port'}
                        >
                          <Ship className="w-3 h-3" />
                          SEA
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditClick(c)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 transition-colors"
                          title="Edit City"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCity(c)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-900/60 text-neutral-400 hover:text-rose-300 transition-colors"
                          title="Delete City"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
