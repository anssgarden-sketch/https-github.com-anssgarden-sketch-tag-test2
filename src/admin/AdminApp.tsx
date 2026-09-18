import React, { useState, useEffect, useCallback } from 'react';
import { 
  adminApi, 
  AdminDataResponse, 
  getStoredAdminToken,
  getStoredAdminUser,
  setStoredAdminSession, 
  clearStoredAdminSession 
} from './adminApi';
import { AdminHeader } from './components/AdminHeader';
import { SkillsManager } from './components/SkillsManager';
import { CitiesManager } from './components/CitiesManager';
import { TravelConnectionsManager } from './components/TravelConnectionsManager';
import { GameConfigManager } from './components/GameConfigManager';
import { PlayersManager } from './components/PlayersManager';
import { NpcGenerator } from './components/NpcGenerator';
import { ShieldCheck, User, Lock, Eye, EyeOff, AlertCircle, Terminal, ArrowRight, Loader2 } from 'lucide-react';

export const AdminApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<{ username: string; role: string } | null>(null);
  
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'skills' | 'cities' | 'travel' | 'config' | 'players' | 'npcs'>('players');
  const [adminData, setAdminData] = useState<AdminDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check for an existing valid admin session
  const checkStoredAuth = useCallback(async () => {
    const token = getStoredAdminToken();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    setIsVerifying(true);
    try {
      const res = await adminApi.verifySession(token);
      setIsAuthenticated(true);
      const user = res.user || getStoredAdminUser() || { username: 'admin', role: 'admin' };
      setAdminUser(user);
      fetchData();
    } catch {
      clearStoredAdminSession();
      setIsAuthenticated(false);
      setAdminUser(null);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getData();
      setAdminData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin dataset');
      if (err.status === 401 || (err.message && err.message.includes('401'))) {
        clearStoredAdminSession();
        setIsAuthenticated(false);
        setAdminUser(null);
        setAuthError('Your session has expired. Please log in again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStoredAuth();
  }, [checkStoredAuth]);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsVerifying(true);

    if (!username.trim() || !password) {
      setAuthError('Please enter both username and password.');
      setIsVerifying(false);
      return;
    }

    try {
      const res = await adminApi.login(username.trim(), password);
      if (res.token && res.user) {
        setStoredAdminSession(res.token, res.user);
        setAdminUser(res.user);
        setIsAuthenticated(true);
        setPassword('');
        fetchData();
      } else {
        throw new Error('Invalid authentication response from server');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid username or password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    clearStoredAdminSession();
    setIsAuthenticated(false);
    setAdminUser(null);
    setAdminData(null);
    setUsername('');
    setPassword('');
    setAuthError(null);
  };

  // If not authenticated, show standalone Admin Authentication Gateway requiring username & password
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-mono selection:bg-amber-500 selection:text-neutral-950">
        <div className="w-full max-w-md bg-neutral-900 border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-base font-bold text-amber-400 tracking-wider">
              TAG GAME MASTER // ADMIN GATEWAY
            </h1>
            <p className="text-xs text-neutral-400 font-sans">
              Restricted Game Master console. Username and password required.
            </p>
          </div>

          {authError && (
            <div id="admin-auth-error" className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4 font-sans">
            <div>
              <label className="block text-xs font-mono text-neutral-300 mb-1.5">
                Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-username-input"
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-mono transition-colors"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-neutral-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-mono transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              disabled={isVerifying}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md font-mono mt-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-800 text-center space-y-2 text-[11px] text-neutral-500 font-mono">
            <p className="text-neutral-500 text-[10px]">
              Configured via <code className="text-amber-500/80">ADMIN_USERNAME</code> and <code className="text-amber-500/80">ADMIN_PASSWORD</code>
            </p>
            <div>
              <a href="/" className="hover:text-neutral-300 underline underline-offset-2 font-sans">
                Return to Game
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950">
      {/* Header Bar */}
      <AdminHeader
        onRefresh={fetchData}
        isRefreshing={isLoading}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminUser={adminUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-2xl flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              onClick={fetchData}
              className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-100 rounded-lg font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && !adminData ? (
          <div className="py-24 text-center space-y-3 font-mono text-xs text-neutral-400">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Syncing game database entities...</p>
          </div>
        ) : !adminData ? null : (
          <div>
            {activeTab === 'players' && (
              <PlayersManager
                cities={adminData.cities}
                onRefreshParent={fetchData}
                onNavigateToNpcGenerator={() => setActiveTab('npcs')}
              />
            )}

            {activeTab === 'npcs' && (
              <NpcGenerator
                cities={adminData.cities}
                skills={adminData.skills}
                professions={adminData.professions || []}
                onRefreshParent={fetchData}
                onNavigateToPlayers={() => setActiveTab('players')}
              />
            )}

            {activeTab === 'skills' && (
              <SkillsManager skills={adminData.skills} onRefresh={fetchData} />
            )}

            {activeTab === 'cities' && (
              <CitiesManager cities={adminData.cities} onRefresh={fetchData} />
            )}

            {activeTab === 'travel' && (
              <TravelConnectionsManager
                cities={adminData.cities}
                railConnections={adminData.rail_connections}
                waterRoutes={adminData.water_routes}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'config' && (
              <GameConfigManager
                configs={adminData.game_config}
                cities={adminData.cities}
                skills={adminData.skills}
                onRefresh={fetchData}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminApp;
