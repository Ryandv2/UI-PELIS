import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  Sparkles, 
  Terminal, 
  Zap, 
  History as HistoryIcon, 
  HelpCircle, 
  ChevronRight, 
  Play, 
  ExternalLink,
  Loader2,
  Database,
  Layers,
  AlertTriangle,
  CodeXml,
  RefreshCw,
  LifeBuoy,
  Menu
} from 'lucide-react';

import { ScrapeResult, UsageStats, PaymentInvoice, ExtractedEmbed } from './types';
import BillingModal from './components/BillingModal';
import ScrapeResults from './components/ScrapeResults';
import ScrapeHistory from './components/ScrapeHistory';
import UsageMeter from './components/UsageMeter';
import SidebarMenu from './components/SidebarMenu';
import TechnicalSupport from './components/TechnicalSupport';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';

import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';

const SUGGESTED_URLS = [
  {
    title: "Shrek Para Siempre",
    url: "https://www.pelisplushd.la/pelicula/shrek-para-siempre-el-capitulo-final"
  },
  {
    title: "Ejemplo PelisPlus 2",
    url: "https://www.pelisplushd.la/pelicula/shrek-2"
  }
];

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Core States
  const [activeResult, setActiveResult] = useState<ScrapeResult | null>(null);
  const [history, setHistory] = useState<ScrapeResult[]>([]);
  const [stats, setStats] = useState<UsageStats>({
    count: 0,
    limit: 50,
    lastReset: new Date().toLocaleDateString(),
    isUnlimited: false,
    extraCredits: 0
  });
  
  // Billing modal
  const [isBillingOpen, setIsBillingOpen] = useState(false);

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sidebar Menu state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active workspace view state
  const [activeView, setActiveView] = useState<'extractor' | 'support' | 'profile'>('extractor');

  // 1. Firebase Authentication & Cloud Storage Synchronizer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        // Logged in! Let's sync and load state from Cloud Firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          let firestoreStats: UsageStats;
          
          if (userDocSnap.exists()) {
            firestoreStats = userDocSnap.data() as UsageStats;
            let needsUpdate = false;
            const todayStr = new Date().toLocaleDateString();
            
            // Check if we need to reset the count for a new day
            if (firestoreStats.lastReset !== todayStr) {
              if (firestoreStats.hasExhaustedInitial || firestoreStats.count >= firestoreStats.limit) {
                firestoreStats.hasExhaustedInitial = true;
                firestoreStats.limit = 20;
              } else {
                firestoreStats.limit = 50;
              }
              firestoreStats.count = 0;
              firestoreStats.lastReset = todayStr;
              needsUpdate = true;
            } else {
              // Same day. Check if they have reached the limit to mark as exhausted
              if (firestoreStats.count >= firestoreStats.limit) {
                if (!firestoreStats.hasExhaustedInitial) {
                  firestoreStats.hasExhaustedInitial = true;
                  needsUpdate = true;
                }
              }
            }
            
            // Sync current authenticated user metadata to DB doc if not already set, avoiding overwriting custom profiles
            let metaChanged = false;
            if (!firestoreStats.email && currentUser.email) {
              firestoreStats.email = currentUser.email;
              metaChanged = true;
            } else if (firestoreStats.email !== (currentUser.email || '')) {
              firestoreStats.email = currentUser.email || '';
              metaChanged = true;
            }
            
            if (!firestoreStats.displayName && currentUser.displayName) {
              firestoreStats.displayName = currentUser.displayName;
              metaChanged = true;
            }
            
            if (metaChanged) {
              firestoreStats.updatedAt = new Date().toISOString();
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              await setDoc(userDocRef, firestoreStats, { merge: true });
            }
            
            setStats(firestoreStats);
            localStorage.setItem('embed_scraper_stats', JSON.stringify(firestoreStats));
          } else {
            // Document doesn't exist, let's migrate local stats
            const savedStats = localStorage.getItem('embed_scraper_stats');
            let initialStats: UsageStats;
            if (savedStats) {
              try {
                initialStats = JSON.parse(savedStats);
                // When they register, they get 50 limit and hasExhaustedInitial is false so they enjoy the first 50 initial credits!
                initialStats.limit = 50;
                initialStats.hasExhaustedInitial = false;
                initialStats.count = 0;
                initialStats.lastReset = new Date().toLocaleDateString();
              } catch {
                initialStats = { count: 0, limit: 50, lastReset: new Date().toLocaleDateString(), isUnlimited: false, extraCredits: 0, hasExhaustedInitial: false };
              }
            } else {
              initialStats = { count: 0, limit: 50, lastReset: new Date().toLocaleDateString(), isUnlimited: false, extraCredits: 0, hasExhaustedInitial: false };
            }
            
            initialStats.email = currentUser.email || '';
            initialStats.displayName = currentUser.displayName || '';
            initialStats.updatedAt = new Date().toISOString();
            
            await setDoc(userDocRef, initialStats);
            setStats(initialStats);
            localStorage.setItem('embed_scraper_stats', JSON.stringify(initialStats));
          }
          
          // Load history from Firestore
          const historyColRef = collection(db, 'users', currentUser.uid, 'history');
          const historySnap = await getDocs(historyColRef);
          let firestoreHistory: ScrapeResult[] = [];
          
          historySnap.forEach((docSnap) => {
            firestoreHistory.push(docSnap.data() as ScrapeResult);
          });
          
          // Sort by id descending (newest searches first)
          firestoreHistory.sort((a, b) => b.id.localeCompare(a.id));
          
          // Merge local history if present
          const savedHistory = localStorage.getItem('embed_scraper_history');
          if (savedHistory) {
            try {
              const localHistory: ScrapeResult[] = JSON.parse(savedHistory);
              if (localHistory.length > 0) {
                const batch = writeBatch(db);
                localHistory.forEach((item) => {
                  if (!firestoreHistory.some(fh => fh.targetUrl === item.targetUrl)) {
                    const docRef = doc(collection(db, 'users', currentUser.uid, 'history'), item.id);
                    batch.set(docRef, item);
                    firestoreHistory.unshift(item);
                  }
                });
                await batch.commit();
                firestoreHistory.sort((a, b) => b.id.localeCompare(a.id));
                localStorage.removeItem('embed_scraper_history');
              }
            } catch (e) {
              console.error("Error merging local history", e);
            }
          }
          
          setHistory(firestoreHistory);
          
        } catch (error) {
          console.error("Error loading profile from Firestore:", error);
        }
      } else {
        // Guest mode fallback
        const savedHistory = localStorage.getItem('embed_scraper_history');
        if (savedHistory) {
          try {
            setHistory(JSON.parse(savedHistory));
          } catch (e) {
            console.error("Error loading guest history", e);
          }
        } else {
          setHistory([]);
        }
        
        const savedStats = localStorage.getItem('embed_scraper_stats');
        let initialGuestStats: UsageStats;
        const todayStr = new Date().toLocaleDateString();
        
        if (savedStats) {
          try {
            initialGuestStats = JSON.parse(savedStats);
            // Daily reset check for guest
            if (initialGuestStats.lastReset !== todayStr) {
              if (initialGuestStats.hasExhaustedInitial || initialGuestStats.count >= initialGuestStats.limit) {
                initialGuestStats.hasExhaustedInitial = true;
                initialGuestStats.limit = 20;
              } else {
                initialGuestStats.limit = 5;
              }
              initialGuestStats.count = 0;
              initialGuestStats.lastReset = todayStr;
            } else {
              // Same day. Check if they have reached the limit to mark as exhausted
              if (initialGuestStats.count >= initialGuestStats.limit) {
                initialGuestStats.hasExhaustedInitial = true;
              }
              // Keep current limit as is for today! Do not change it mid-day.
            }
          } catch (e) {
            initialGuestStats = { count: 0, limit: 5, lastReset: todayStr, isUnlimited: false, extraCredits: 0, hasExhaustedInitial: false };
          }
        } else {
          initialGuestStats = { count: 0, limit: 5, lastReset: todayStr, isUnlimited: false, extraCredits: 0, hasExhaustedInitial: false };
        }
        setStats(initialGuestStats);
        localStorage.setItem('embed_scraper_stats', JSON.stringify(initialGuestStats));

        // Prompt with AuthModal if not configured as guest before
        const hasChosenGuest = localStorage.getItem('scraper_guest_mode');
        if (!hasChosenGuest) {
          setIsAuthModalOpen(true);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('scraper_guest_mode');
    } catch (e: any) {
      console.error("Error during logout", e);
    }
  };

  const handleContinueAsGuest = () => {
    localStorage.setItem('scraper_guest_mode', 'true');
    setStats(prev => ({
      ...prev,
      limit: 5
    }));
  };

  // 2. Perform Real Web Scrape
  const handleScrape = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setErrorDetails(null);

    const targetUrl = (overrideUrl || urlInput).trim();
    if (!targetUrl) {
      setError("Introduce una dirección URL de streaming válida.");
      return;
    }

    // Check limits
    const todayStr = new Date().toLocaleDateString();
    let currentStats = { ...stats };

    // Quick day reset check
    if (currentStats.lastReset !== todayStr) {
      if (currentStats.hasExhaustedInitial || currentStats.count >= currentStats.limit) {
        currentStats.hasExhaustedInitial = true;
        currentStats.limit = 20;
      } else {
        currentStats.limit = user ? 50 : 5;
      }
      currentStats = {
        ...currentStats,
        count: 0,
        lastReset: todayStr,
        limit: currentStats.limit,
        hasExhaustedInitial: currentStats.hasExhaustedInitial
      };
    }

    const availableCredits = currentStats.isUnlimited 
      ? Infinity 
      : (currentStats.limit + currentStats.extraCredits);

    if (currentStats.count >= availableCredits) {
      setError("Límite diario alcanzado.");
      setErrorDetails(user
        ? `Has consumido tus ${stats.limit} búsquedas diarias gratuitas de tu cuenta registrada. Compra créditos extra para continuar.`
        : `Has consumido tus ${stats.limit} búsquedas gratuitas de invitado. Regístrate o inicia sesión de inmediato para obtener 50 créditos gratis diarios!`
      );
      if (!user) {
        setIsAuthModalOpen(true);
      } else {
        setIsBillingOpen(true);
      }
      return;
    }

    setIsLoading(true);
    setProgressStep("Inicializando motor de extracción...");

    try {
      // Step simulated logs for user feedback
      setTimeout(() => setProgressStep("Conectando con el servidor extractor seguro..."), 600);
      setTimeout(() => setProgressStep("Saltando bloqueos de CORS y simulando navegador de escritorio..."), 1300);
      setTimeout(() => setProgressStep("Descargando código fuente HTML de la página de streaming..."), 2100);
      setTimeout(() => setProgressStep("Buscando iframes en el árbol DOM y analizando scripts de video..."), 2900);

      // Make actual API call
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocurrió un error inesperado al analizar la página.");
      }

      // Success
      setProgressStep("¡Hecho! Enlaces extraídos correctamente.");
      
      const newResult: ScrapeResult = {
        id: `SCR-${Date.now()}`,
        targetUrl: data.targetUrl || targetUrl,
        title: data.title || "Página de Streaming Analizada",
        date: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
        embeds: data.embeds || []
      };

      // Deduplicate result history by targetUrl to keep history clean and compact
      const updatedHistory = [newResult, ...history.filter(h => h.targetUrl !== newResult.targetUrl)].slice(0, 30);
      setHistory(updatedHistory);
      localStorage.setItem('embed_scraper_history', JSON.stringify(updatedHistory));

      setActiveResult(newResult);

      // Deduct credit
      if (!currentStats.isUnlimited) {
        if (currentStats.extraCredits > 0) {
          currentStats.extraCredits = currentStats.extraCredits - 1;
        } else {
          currentStats.count = currentStats.count + 1;
        }
        
        // Mark as exhausted if they reached or exceeded their limit
        if (currentStats.count >= currentStats.limit) {
          currentStats.hasExhaustedInitial = true;
        }
      } else {
        currentStats.count = currentStats.count + 1;
      }
      
      setStats(currentStats);
      localStorage.setItem('embed_scraper_stats', JSON.stringify(currentStats));

      // Persist to Firestore if user is authenticated!
      if (user) {
        try {
          // Write individual history document
          const docRef = doc(collection(db, 'users', user.uid, 'history'), newResult.id);
          await setDoc(docRef, newResult);
          
          // Write profile/stats
          await setDoc(doc(db, 'users', user.uid), currentStats);
        } catch (error) {
          console.error("Error writing to Firestore:", error);
        }
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con la API.");
      setErrorDetails(err.details || "El servidor destino de la película podría tener fuertes protecciones antibot, o la URL is inaccesible. Por favor verifica que la URL abra correctamente en tu navegador.");
    } finally {
      setIsLoading(false);
      setProgressStep('');
    }
  };

  // Select item from history
  const handleSelectHistory = (selected: ScrapeResult) => {
    setActiveResult(selected);
    setUrlInput(selected.targetUrl);
  };

  // Clear history
  const handleClearHistory = async () => {
    setHistory([]);
    localStorage.removeItem('embed_scraper_history');
    if (activeResult) {
      setActiveResult(null);
    }
    
    if (user) {
      try {
        const historyColRef = collection(db, 'users', user.uid, 'history');
        const snap = await getDocs(historyColRef);
        const batch = writeBatch(db);
        snap.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      } catch (error) {
        console.error("Error clearing Firestore history:", error);
      }
    }
  };

  // Delete single history item
  const handleDeleteHistoryItem = async (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('embed_scraper_history', JSON.stringify(updated));
    if (activeResult?.id === id) {
      setActiveResult(null);
    }
    
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'history', id));
      } catch (error) {
        console.error("Error deleting Firestore history item:", error);
      }
    }
  };

  // Payment completed callback
  const handlePurchaseSuccess = async (planId: 'credits_50' | 'credits_1000' | 'unlimited_year', invoice: PaymentInvoice) => {
    let updatedStats = { ...stats };
    const todayStr = new Date().toLocaleDateString();

    if (planId === 'credits_50') {
      updatedStats.extraCredits += 50;
    } else if (planId === 'credits_1000') {
      updatedStats.extraCredits += 1000;
    } else if (planId === 'unlimited_year') {
      updatedStats.isUnlimited = true;
      const expireDate = new Date();
      expireDate.setFullYear(expireDate.getFullYear() + 1);
      updatedStats.expiresAt = expireDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    updatedStats.lastReset = todayStr;
    setStats(updatedStats);
    localStorage.setItem('embed_scraper_stats', JSON.stringify(updatedStats));

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), updatedStats);
      } catch (error) {
        console.error("Error writing purchase to Firestore:", error);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center font-sans gap-3" id="app-auth-loading">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-xs text-neutral-400 font-bold tracking-widest uppercase">Cargando aplicación...</span>
      </div>
    );
  }

  const isGuestMode = localStorage.getItem('scraper_guest_mode') === 'true';

  if (!user && !isGuestMode) {
    return (
      <AuthModal
        isOpen={true}
        onClose={() => {}}
        onContinueAsGuest={handleContinueAsGuest}
        isFullPage={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans" id="app-root-container">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden opacity-30 blur-[120px] z-0">
        <div className="absolute top-[-100px] left-[15%] w-[400px] h-[400px] bg-emerald-600 rounded-full" />
        <div className="absolute top-[-50px] right-[20%] w-[350px] h-[350px] bg-teal-500 rounded-full" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Professional 3-line hamburger menu button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-neutral-900 hover:bg-neutral-850 text-emerald-400 rounded-xl border border-neutral-800/80 hover:border-emerald-500/30 transition-all cursor-pointer flex items-center justify-center"
              title="Abrir Menú de Opciones"
              id="hamburger-menu-trigger"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="p-2 bg-emerald-600/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CodeXml className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight flex items-center gap-1.5 uppercase">
                Embed Link Extractor <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded">REAL</span>
              </h1>
              <p className="text-[10px] text-neutral-400">Extractor Profesional de Reproductores Iframe y Streamwish</p>
            </div>
          </div>

          {/* Right side has been simplified as the options are available inside the lateral sidebar menu */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Motor Activo
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="relative z-10 flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input Form, Progress, Results, Technical Support, or User Profile */}
        <section className="lg:col-span-8 space-y-8 flex flex-col">
          {activeView === 'support' ? (
            <TechnicalSupport 
              onBackToExtractor={() => setActiveView('extractor')} 
              user={user}
            />
          ) : activeView === 'profile' && user ? (
            <UserProfile
              user={user}
              stats={stats}
              onUpdateStats={async (newStats) => {
                setStats(newStats);
                localStorage.setItem('embed_scraper_stats', JSON.stringify(newStats));
                const userDocRef = doc(db, 'users', user.uid);
                await setDoc(userDocRef, newStats, { merge: true });
              }}
              onBackToExtractor={() => setActiveView('extractor')}
            />
          ) : (
            <>
              {/* Main Scraper Dashboard Card */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 md:p-6 shadow-xl space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Extrae reproductores de páginas de streaming</h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Escribe o copia la URL de cualquier portal de streaming (ej. PelisPlus, cuevana, etc.). Nuestro backend extraerá de forma real todos los iframes, scripts ocultos y reproductores de <strong>Streamwish, Voe, Mixdrop</strong> y más.
                  </p>
                </div>

                {/* Input Bar Form */}
                <form onSubmit={(e) => handleScrape(e)} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                      <input
                        type="url"
                        required
                        disabled={isLoading}
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://www.pelisplushd.la/pelicula/..."
                        className="w-full h-11 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:outline-none rounded-xl pl-10 pr-4 text-xs text-white placeholder-neutral-600 transition"
                      />
                      <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" /> Comenzar Extracción
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Suggested Shortcuts for Testing */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-neutral-800/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Prueba Rápida:</span>
                  {SUGGESTED_URLS.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setUrlInput(sug.url);
                        handleScrape(undefined, sug.url);
                      }}
                      disabled={isLoading}
                      className="px-2.5 py-1 text-[10px] bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded-lg transition text-left truncate max-w-xs cursor-pointer inline-flex items-center gap-1"
                    >
                      <Play className="w-2.5 h-2.5 text-emerald-400" />
                      {sug.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loader and Progress Steps Console */}
              {isLoading && (
                <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-5 shadow-inner space-y-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-500" /> Consola de Scraping en Vivo
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-bold border border-emerald-500/20 uppercase tracking-widest">
                      Extrayendo
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-neutral-400 space-y-2">
                    <p className="text-emerald-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      {progressStep}
                    </p>
                    <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-emerald-500 h-full w-[45%] animate-[pulse_2s_infinite]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error panel */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 space-y-2.5 text-left animate-fade-in">
                  <div className="flex items-start gap-2.5 text-red-400 text-sm font-bold">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-extrabold">{error}</p>
                      <p className="text-xs font-normal text-red-400/80 mt-1">{errorDetails}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-red-500/10 text-[10px] text-neutral-400">
                    Tip: Algunas plataformas bloquean el scraping de IPs de nubes. Si sigues teniendo problemas, prueba cargando URLs de servidores que provean video directamente.
                  </div>
                </div>
              )}

              {/* Extracted Results Panel */}
              {activeResult && !isLoading && (
                <ScrapeResults
                  embeds={activeResult.embeds}
                  title={activeResult.title}
                  targetUrl={activeResult.targetUrl}
                />
              )}
            </>
          )}
        </section>

        {/* Right Column: Limits & Credits, History */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* Limits & Credits component - shown only when credits are finished */}
          {!stats.isUnlimited && stats.count >= (stats.limit + stats.extraCredits) && (
            <UsageMeter 
              stats={stats}
              onOpenBilling={() => setIsBillingOpen(true)}
            />
          )}

          {/* History Panel component */}
          <ScrapeHistory
            history={history}
            activeId={activeResult?.id}
            onSelectResult={handleSelectHistory}
            onClearHistory={handleClearHistory}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            isLoggedIn={!!user}
          />

          {/* Info Card / Helpful guidelines */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 space-y-3.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" /> Arquitectura del Scraper
            </h4>
            <ul className="space-y-2 text-[11px] text-neutral-400 list-disc list-inside">
              <li>El motor funciona en el servidor (Node.js) burlando las restricciones de CORS del navegador.</li>
              <li>Soporte nativo avanzado para decodificar enlaces ofuscados en scripts JS.</li>
              <li>Categorización inteligente según el host del reproductor.</li>
              <li>Generación automática de etiquetas e iframe listos para pegar.</li>
            </ul>
          </div>

        </aside>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 mt-auto text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Embed Link Extractor. Diseñado de forma ultra-premium para administradores de portales de películas.</p>
          <div className="flex gap-4">
            <span className="text-neutral-600">Servicio Activo</span>
            <span className="text-emerald-500 flex items-center gap-1 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Scraper Online
            </span>
          </div>
        </div>
      </footer>

      {/* Billing Store Modal */}
      <BillingModal
        isOpen={isBillingOpen}
        onClose={() => setIsBillingOpen(false)}
        currentStats={stats}
        onPurchaseSuccess={handlePurchaseSuccess}
        user={user}
        onLogin={handleLogin}
      />

      {/* Sidebar Navigation Menu */}
      <SidebarMenu
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        stats={stats}
        onOpenBilling={() => setIsBillingOpen(true)}
        onOpenSupport={() => setActiveView('support')}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Auth Modal (Login / Register / Guest) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onContinueAsGuest={handleContinueAsGuest}
      />

    </div>
  );
}
