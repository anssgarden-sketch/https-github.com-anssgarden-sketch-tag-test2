import React, { useState, useMemo } from 'react';
import { adminApi } from '../adminApi';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle,
  Zap, 
  Coins, 
  Crosshair, 
  ShieldCheck, 
  Radar, 
  EyeOff
} from 'lucide-react';

interface SkillItem {
  id: string;
  name: string;
  description: string;
  category: 'assassination' | 'defensive' | 'intel' | 'counter_intel';
  range: string;
  base_ap_cost: number;
  base_credit_cost: number;
  can_execute_in_transit?: boolean;
}

interface SkillsManagerProps {
  skills: SkillItem[];
  onRefresh: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'assassination', label: 'Assassination', icon: Crosshair, color: 'text-rose-400' },
  { id: 'defensive', label: 'Defensive', icon: ShieldCheck, color: 'text-amber-400' },
  { id: 'intel', label: 'Intel', icon: Radar, color: 'text-cyan-400' },
  { id: 'counter_intel', label: 'Counter-Intel', icon: EyeOff, color: 'text-purple-400' },
];

const RANGES = ['close', 'short', 'medium', 'long', 'remote', 'city', 'country', 'continent', 'global'];

export const SkillsManager: React.FC<SkillsManagerProps> = ({ skills, onRefresh }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New Skill form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'intel' as SkillItem['category'],
    range: 'city',
    base_ap_cost: 2,
    base_credit_cost: 50,
    can_execute_in_transit: false,
  });

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.range.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [skills, selectedCategory, searchQuery]);

  const handleEditClick = (skill: SkillItem) => {
    setEditingSkill({ ...skill });
    setIsCreating(false);
  };

  const handleCreateClick = () => {
    setFormData({
      name: '',
      description: '',
      category: 'intel',
      range: 'city',
      base_ap_cost: 2,
      base_credit_cost: 50,
      can_execute_in_transit: false,
    });
    setIsCreating(true);
    setEditingSkill(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;

    setIsSaving(true);
    setStatusMsg(null);
    try {
      await adminApi.updateSkill(editingSkill.id, editingSkill);
      setStatusMsg({ type: 'success', text: `Skill "${editingSkill.name}" updated successfully` });
      setEditingSkill(null);
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update skill' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await adminApi.createSkill(formData);
      setStatusMsg({ type: 'success', text: `New skill "${formData.name}" created successfully` });
      setIsCreating(false);
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create skill' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSkill = async (skill: SkillItem) => {
    if (!window.confirm(`Are you sure you want to delete skill "${skill.name}"? This cannot be undone.`)) {
      return;
    }

    setStatusMsg(null);
    try {
      await adminApi.deleteSkill(skill.id);
      setStatusMsg({ type: 'success', text: `Skill "${skill.name}" deleted` });
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete skill' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <span>Operative Skills Registry</span>
            <span className="text-xs font-mono font-normal text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
              {filteredSkills.length} / {skills.length} Total
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure AP requirements, credit costs, range restrictions, and combat/recon behavior.
          </p>
        </div>

        <button
          onClick={handleCreateClick}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Skill</span>
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
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-neutral-900/80 p-1.5 rounded-xl border border-neutral-800">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 font-bold shadow-inner'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat.label}
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
            placeholder="Search skill by name, range or description..."
            className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Create / Edit Modal Form */}
      {(isCreating || editingSkill) && (
        <div className="bg-neutral-900 border border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-amber-400">
              {isCreating ? 'CREATE NEW SKILL' : `EDIT SKILL: ${editingSkill?.name}`}
            </h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingSkill(null);
              }}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={isCreating ? handleSaveCreate : handleSaveEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-neutral-400 mb-1">Skill Name *</label>
                <input
                  type="text"
                  required
                  value={isCreating ? formData.name : editingSkill?.name}
                  onChange={(e) =>
                    isCreating
                      ? setFormData({ ...formData, name: e.target.value })
                      : setEditingSkill((prev: any) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Fiber Wire, Satellite Wiretap"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-neutral-400 mb-1">Category Pool *</label>
                <select
                  value={isCreating ? formData.category : editingSkill?.category}
                  onChange={(e) =>
                    isCreating
                      ? setFormData({ ...formData, category: e.target.value as any })
                      : setEditingSkill((prev: any) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="assassination">Assassination (Offensive)</option>
                  <option value="defensive">Defensive (Block / Counter)</option>
                  <option value="intel">Intel (Surveillance / Tag)</option>
                  <option value="counter_intel">Counter-Intel (Detection)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-neutral-400 mb-1">Description</label>
              <textarea
                rows={2}
                value={isCreating ? formData.description : editingSkill?.description}
                onChange={(e) =>
                  isCreating
                    ? setFormData({ ...formData, description: e.target.value })
                    : setEditingSkill((prev: any) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Tactical description of skill mechanics and narrative flavor..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Range, AP, Credits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-neutral-400 mb-1">Range Classification</label>
                <select
                  value={isCreating ? formData.range : editingSkill?.range}
                  onChange={(e) =>
                    isCreating
                      ? setFormData({ ...formData, range: e.target.value })
                      : setEditingSkill((prev: any) => ({ ...prev, range: e.target.value }))
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                >
                  {RANGES.map((r) => (
                    <option key={r} value={r}>
                      {r.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Base Action Points (AP)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={isCreating ? formData.base_ap_cost : editingSkill?.base_ap_cost}
                  onChange={(e) =>
                    isCreating
                      ? setFormData({ ...formData, base_ap_cost: parseInt(e.target.value, 10) || 1 })
                      : setEditingSkill((prev: any) => ({ ...prev, base_ap_cost: parseInt(e.target.value, 10) || 1 }))
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Base Credit Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  required
                  value={isCreating ? formData.base_credit_cost : editingSkill?.base_credit_cost}
                  onChange={(e) =>
                    isCreating
                      ? setFormData({ ...formData, base_credit_cost: parseInt(e.target.value, 10) || 0 })
                      : setEditingSkill((prev: any) => ({ ...prev, base_credit_cost: parseInt(e.target.value, 10) || 0 }))
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Checkbox: Can execute in transit */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="transit-check"
                checked={isCreating ? formData.can_execute_in_transit : Boolean(editingSkill?.can_execute_in_transit)}
                onChange={(e) =>
                  isCreating
                    ? setFormData({ ...formData, can_execute_in_transit: e.target.checked })
                    : setEditingSkill((prev: any) => ({ ...prev, can_execute_in_transit: e.target.checked }))
                }
                className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500 bg-neutral-950"
              />
              <label htmlFor="transit-check" className="text-neutral-300">
                Can be executed while Operative is In Transit
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingSkill(null);
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
                <span>{isSaving ? 'Saving to Node...' : isCreating ? 'Create Skill' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Skills Table / Cards */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Skill / Weapon</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Range</th>
                <th className="py-3 px-3">Base AP</th>
                <th className="py-3 px-3">Base Cost</th>
                <th className="py-3 px-3">Transit Permitted</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    No skills matched the criteria.
                  </td>
                </tr>
              ) : (
                filteredSkills.map((s) => {
                  const isAssassination = s.category === 'assassination';
                  const isDefensive = s.category === 'defensive';
                  const isIntel = s.category === 'intel';
                  const isCounter = s.category === 'counter_intel';

                  return (
                    <tr key={s.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-100">{s.name}</div>
                        {s.description && (
                          <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5 font-sans">
                            {s.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isAssassination
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                              : isDefensive
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                              : isIntel
                              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
                              : 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                          }`}
                        >
                          {s.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-neutral-300 uppercase font-semibold bg-neutral-800 px-2 py-0.5 rounded text-[10px]">
                          {s.range}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-amber-400 font-bold">{s.base_ap_cost} AP</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400 font-bold">${s.base_credit_cost.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-3">
                        {s.can_execute_in_transit ? (
                          <span className="text-emerald-400 font-bold">YES</span>
                        ) : (
                          <span className="text-neutral-600">NO</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(s)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 transition-colors"
                            title="Edit Skill"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSkill(s)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-900/60 text-neutral-400 hover:text-rose-300 transition-colors"
                            title="Delete Skill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
