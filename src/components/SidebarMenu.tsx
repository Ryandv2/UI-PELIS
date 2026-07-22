import React from 'react';
import { 
  X, 
  Globe, 
  Sparkles, 
  History, 
  LifeBuoy, 
  ShieldCheck, 
  Activity, 
  Terminal, 
  Layers, 
  ArrowRight,
  Database,
  Coins,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { UsageStats } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UsageStats;
  onOpenBilling: () => void;
  onOpenSupport: () => void;
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  activeView: 'extractor' | 'support' | 'profile';
  onViewChange: (view: 'extractor' | 'support' | 'profile') => void;
}

export default function SidebarMenu({ 
  isOpen, 
  onClose, 
  stats, 
  onOpenBilling,
  onOpenSupport,
  user,
  onLogin,
  onLogout,
  activeView,
  onViewChange
}: SidebarMenuProps) {
  if (!isOpen) return null;

  // Scroll helpers
  const scrollToId = (id: string) => {
    onClose();
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Optional pulse effect on target container
        element.classList.add('ring-2', 'ring-emerald-500/50', 'transition-all', 'duration-1000');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-emerald-500/50');
        }, 2000);
      }
    }, 100);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-start bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      id="sidebar-backdrop"
    >
      <div 
        className="w-full max-w-sm bg-neutral-950 border-r border-emerald-500/10 h-full flex flex-col justify-between p-6 shadow-[5px_0_50px_rgba(16,185,129,0.1)] transition-transform duration-300 transform translate-x-0"
        onClick={(e) => e.stopPropagation()}
        id="sidebar-container"
      >
        {/* Top Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-5 border-b border-neutral-900">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600/15 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Terminal className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide uppercase">Menú de Navegación</h3>
                <p className="text-[10px] text-neutral-400">Panel de Control & Pasarela</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-900 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer"
              title="Cerrar Menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Firebase Auth Profile Section */}
          <div className="p-4 bg-neutral-900/40 border border-neutral-800/80 rounded-xl space-y-3">
            {user ? (
              <div className="space-y-3">
                <div 
                  onClick={() => { onClose(); onViewChange('profile'); }}
                  className="flex items-center gap-3 cursor-pointer hover:bg-neutral-900/60 p-1.5 rounded-lg transition"
                  title="Ver Mi Perfil"
                >
                  {stats.photoURL ? (
                    <img 
                      src={stats.photoURL} 
                      alt={stats.displayName || "Usuario"} 
                      className="w-10 h-10 rounded-full border border-emerald-500/30 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={stats.displayName || user.displayName || "Usuario"} 
                      className="w-10 h-10 rounded-full border border-emerald-500/30 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                      {stats.displayName ? stats.displayName.charAt(0).toUpperCase() : (user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />)}
                    </div>
                  )}
                  <div className="truncate flex-1">
                    <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                      {stats.displayName || user.displayName || "Usuario Registrado"}
                    </p>
                    {stats.username ? (
                      <p className="text-[9px] text-emerald-400 font-mono">@{stats.username}</p>
                    ) : (
                      <p className="text-[10px] text-neutral-400 truncate">{user.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/60">
                  <button 
                    onClick={() => { onClose(); onViewChange('profile'); }}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    Editar Perfil
                  </button>
                  <button 
                    onClick={onLogout}
                    className="ml-auto text-[10px] text-red-400 hover:text-red-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" /> Cerrar Sesión
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-neutral-200">Sincroniza tus créditos e historial</p>
                <p className="text-[10px] text-neutral-400">Inicia sesión o regístrate para respaldar tus búsquedas de forma segura y disfrutar de 50 créditos diarios gratis iniciales (los invitados disponen de 5). Al agotarse tus créditos iniciales, tendrás 20 créditos gratis cada 24 horas.</p>
                <button 
                  onClick={() => {
                    onClose();
                    onLogin();
                  }}
                  className="w-full py-2 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  <LogIn className="w-4 h-4" /> Iniciar Sesión / Registrarse
                </button>
              </div>
            )}
          </div>

          {/* Core Navigation Options */}
          <nav className="space-y-2">
            <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest px-2 mb-2">Herramientas</span>
            
            <button
              onClick={() => { onViewChange('extractor'); scrollToId('url-extractor-box'); }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-left transition group text-xs text-neutral-200"
            >
              <span className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-emerald-400" /> Extractor Principal
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => { onViewChange('extractor'); scrollToId('scrape-history-panel'); }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-left transition group text-xs text-neutral-200"
            >
              <span className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-emerald-400" /> Historial de Búsquedas
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </button>
          </nav>

          {/* Premium & Accounts */}
          <div className="space-y-2 pt-2">
            <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest px-2 mb-2">Cuenta & Ayuda</span>

            {user && (
              <button
                onClick={() => { onClose(); onViewChange('profile'); }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-left transition group text-xs text-neutral-200"
              >
                <span className="flex items-center gap-2.5">
                  <UserIcon className="w-4 h-4 text-emerald-400" /> Mi Perfil
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </button>
            )}

            <button
              onClick={() => { onClose(); onOpenBilling(); }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-950/20 to-teal-950/20 hover:from-emerald-950/40 hover:to-teal-950/40 border border-emerald-500/20 hover:border-emerald-500/40 text-left transition group text-xs text-neutral-200"
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" /> Adquirir Créditos / Planes
              </span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={() => { onClose(); onViewChange('support'); }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-left transition group text-xs text-neutral-200"
            >
              <span className="flex items-center gap-2.5">
                <LifeBuoy className="w-4 h-4 text-emerald-400" /> Soporte Técnico Premium
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          {/* System status details */}
          <div className="space-y-3 pt-4 border-t border-neutral-900">
            <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest px-2">Estado del Nodo de Scraping</span>
            <div className="p-3 bg-neutral-900/30 rounded-xl border border-neutral-900 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Servidor API
                </span>
                <span className="text-emerald-400 font-bold">Online</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Certificado SSL
                </span>
                <span className="text-emerald-400 font-bold">Válido</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" /> Bypass CORS
                </span>
                <span className="text-emerald-400 font-bold">Activo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Credits Summary */}
        <div className="pt-4 border-t border-neutral-900 space-y-2">
          <div className="bg-neutral-900/10 p-3 rounded-xl border border-neutral-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <div>
                <p className="text-[9px] text-neutral-500">Uso Diario:</p>
                <p className="font-bold text-white mt-0.5">
                  {stats.isUnlimited ? 'Ilimitado' : `${stats.count} / ${stats.limit}`}
                </p>
              </div>
              {stats.extraCredits > 0 && (
                <div className="text-right">
                  <p className="text-[9px] text-neutral-500">Extra:</p>
                  <p className="font-bold text-emerald-400 mt-0.5">
                    +{stats.extraCredits}
                  </p>
                </div>
              )}
            </div>
            <button 
              onClick={() => { onClose(); onOpenBilling(); }}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition text-center block cursor-pointer"
            >
              Cargar Créditos
            </button>
          </div>
          <div className="text-center text-[9px] text-neutral-600 font-mono">
            Embed Link Extractor v2.4
          </div>
        </div>
      </div>
    </div>
  );
}
