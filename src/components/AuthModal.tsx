import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  LogIn, 
  UserPlus, 
  Sparkles, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
  isFullPage?: boolean;
}

export default function AuthModal({ isOpen, onClose, onContinueAsGuest, isFullPage = false }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isFullPage && !isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (activeTab === 'register') {
        if (!name.trim()) {
          throw new Error("Por favor, escribe tu nombre.");
        }
        if (password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres.");
        }
        
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update display name
        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });
      } else {
        // Sign in
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error("Auth error:", err);
      let translatedMessage = err.message;
      if (err.code === 'auth/email-already-in-use') {
        translatedMessage = "Este correo electrónico ya está registrado.";
      } else if (err.code === 'auth/wrong-password') {
        translatedMessage = "Contraseña incorrecta. Por favor, inténtalo de nuevo.";
      } else if (err.code === 'auth/user-not-found') {
        translatedMessage = "No existe ninguna cuenta con este correo electrónico.";
      } else if (err.code === 'auth/invalid-email') {
        translatedMessage = "El formato de correo electrónico no es válido.";
      } else if (err.code === 'auth/invalid-credential') {
        translatedMessage = "El correo electrónico o la contraseña son incorrectos, o las credenciales no son válidas.";
      } else if (err.code === 'auth/user-disabled') {
        translatedMessage = "Esta cuenta ha sido deshabilitada.";
      }
      setError(translatedMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error("Google auth error:", err);
      let translatedMessage = "";
      if (err.code === 'auth/popup-closed-by-user') {
        translatedMessage = "Se cerró la ventana de inicio de sesión antes de completarse.";
      } else if (err.code === 'auth/cancelled-popup-request') {
        translatedMessage = "Se canceló la solicitud de inicio de sesión.";
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        translatedMessage = "Ya existe una cuenta vinculada a este correo con otro método de registro.";
      } else if (err.code === 'auth/invalid-credential') {
        translatedMessage = "Credenciales no válidas. Por favor, vuelve a intentarlo.";
      } else if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
        translatedMessage = "Este dominio no está autorizado para el inicio de sesión con Google en la consola de Firebase. Por favor, regístrate o inicia sesión usando Correo y Contraseña en el formulario de arriba.";
      } else {
        translatedMessage = err.message || "Error desconocido al iniciar sesión.";
        if (translatedMessage.startsWith("Firebase: Error ")) {
          translatedMessage = translatedMessage.replace("Firebase: Error ", "");
        }
      }
      setError(translatedMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, githubProvider);
      onClose();
    } catch (err: any) {
      console.error("Github auth error:", err);
      let translatedMessage = "";
      if (err.code === 'auth/popup-closed-by-user') {
        translatedMessage = "Se cerró la ventana de inicio de sesión antes de completarse.";
      } else if (err.code === 'auth/cancelled-popup-request') {
        translatedMessage = "Se canceló la solicitud de inicio de sesión.";
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        translatedMessage = "Ya existe una cuenta con el mismo correo electrónico pero registrada con otro método (como Google o Email).";
      } else if (err.code === 'auth/invalid-credential') {
        translatedMessage = "Credenciales no válidas. Por favor, vuelve a intentarlo.";
      } else if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
        translatedMessage = "Este dominio no está autorizado para el inicio de sesión con GitHub en la consola de Firebase. Por favor, regístrate o inicia sesión usando Correo y Contraseña en el formulario de arriba.";
      } else {
        translatedMessage = err.message || "Error desconocido al iniciar sesión.";
        if (translatedMessage.startsWith("Firebase: Error ")) {
          translatedMessage = translatedMessage.replace("Firebase: Error ", "");
        }
      }
      setError(translatedMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div 
      className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
      id="auth-modal-content"
    >
      {/* Header Close Button */}
      {!isFullPage && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Auth Body */}
      <div className="p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold mb-2 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Acceso al Servidor
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Embed Link Extractor</h2>
          <p className="text-xs text-neutral-400 mt-1.5">
            Inicia sesión o regístrate para obtener 50 créditos gratis iniciales. Al agotarse, dispondrás de 20 créditos gratis cada 24 horas (los invitados disponen de 5 créditos iniciales y luego 20).
          </p>
        </div>

        {/* Toggle Tabs */}
        <div className="flex bg-black p-1 rounded-xl border border-neutral-800/80 mb-6">
          <button
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-neutral-850 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-neutral-850 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Error panel */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 text-red-400 rounded-xl text-xs border border-red-500/20 mb-4 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {activeTab === 'register' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Nombre</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Escribe tu nombre"
                  className="w-full h-10 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:outline-none rounded-xl pl-10 pr-4 text-xs text-white transition"
                />
                <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Correo Electrónico</label>
            <div className="relative">
              <input
                type="email"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full h-10 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:outline-none rounded-xl pl-10 pr-4 text-xs text-white transition"
              />
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Contraseña</label>
            <div className="relative">
              <input
                type="password"
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:outline-none rounded-xl pl-10 pr-4 text-xs text-white transition"
              />
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
              </>
            ) : activeTab === 'login' ? (
              <>
                <LogIn className="w-4 h-4" /> Iniciar Sesión
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Crear Cuenta
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="relative my-6 text-center">
          <hr className="border-neutral-800" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-900 px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            O continuar con
          </span>
        </div>

        {/* Social and Guest Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              type="button"
              className="h-11 bg-white hover:bg-neutral-100 text-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Google</span>
            </button>

            <button
              onClick={handleGithubSignIn}
              disabled={isLoading}
              type="button"
              className="h-11 bg-[#24292F] hover:bg-[#1a1e22] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-neutral-800"
            >
              <svg className="w-4.5 h-4.5 shrink-0 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          <button
            onClick={() => {
              onContinueAsGuest();
              onClose();
            }}
            disabled={isLoading}
            className="w-full h-11 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            Continuar como Invitado (Límite: 5 créditos)
          </button>
        </div>
      </div>
    </div>
  );

  if (isFullPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-neutral-950 text-white" id="auth-full-page">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" id="auth-modal-backdrop">
      {content}
    </div>
  );
}
