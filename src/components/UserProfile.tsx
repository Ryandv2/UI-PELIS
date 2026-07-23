import React, { useState, useRef, useEffect } from 'react';
import { 
  User as UserIcon, 
  Camera, 
  FileText, 
  Globe as GlobeIcon, 
  Twitter, 
  Check, 
  X, 
  Calendar, 
  UploadCloud, 
  Sparkles, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Shield,
  Search,
  CheckCircle2
} from 'lucide-react';
import { User, updateProfile } from 'firebase/auth';
import { UsageStats } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserProfileProps {
  user: User;
  stats: UsageStats;
  onUpdateStats: (newStats: UsageStats) => Promise<void>;
  onBackToExtractor: () => void;
}

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='200' viewBox='0 0 800 200'%3E%3Crect width='100%25' height='100%25' fill='%230a0a0a'/%3E%3Cpath d='M-100,150 Q100,50 300,180 T700,40 T1100,120' fill='none' stroke='%23059669' stroke-width='1.5' opacity='0.2'/%3E%3Cpath d='M-50,180 Q150,90 350,150 T750,90 T1150,180' fill='none' stroke='%230d9488' stroke-width='1' opacity='0.15'/%3E%3C/svg%3E";
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23064e3b'/%3E%3Ctext x='50%25' y='55%25' font-weight='bold' font-size='32' fill='%2334d399' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif'%3E👤%3C/text%3E%3C/svg%3E";

export default function UserProfile({ user, stats, onUpdateStats, onBackToExtractor }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile Form States
  const [displayName, setDisplayName] = useState(stats.displayName || user.displayName || '');
  const [username, setUsername] = useState(stats.username || '');
  const [bio, setBio] = useState(stats.bio || '');
  const [photoURL, setPhotoURL] = useState(stats.photoURL || user.photoURL || '');
  const [coverURL, setCoverURL] = useState(stats.coverURL || '');
  const [twitter, setTwitter] = useState(stats.twitter || '');
  const [website, setWebsite] = useState(stats.website || '');

  // File Inputs Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop states
  const [isDragOverAvatar, setIsDragOverAvatar] = useState(false);
  const [isDragOverCover, setIsDragOverCover] = useState(false);

  // Initial Sync
  useEffect(() => {
    setDisplayName(stats.displayName || user.displayName || '');
    setUsername(stats.username || '');
    setBio(stats.bio || '');
    setPhotoURL(stats.photoURL || user.photoURL || '');
    setCoverURL(stats.coverURL || '');
    setTwitter(stats.twitter || '');
    setWebsite(stats.website || '');
  }, [stats, user]);

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent, type: 'avatar' | 'cover') => {
    e.preventDefault();
    if (type === 'avatar') setIsDragOverAvatar(true);
    if (type === 'cover') setIsDragOverCover(true);
  };

  const handleDragLeave = (type: 'avatar' | 'cover') => {
    if (type === 'avatar') setIsDragOverAvatar(false);
    if (type === 'cover') setIsDragOverCover(false);
  };

  // Helper to compress and resize images client-side using HTML5 Canvas
  const compressAndResizeImage = (file: File, type: 'avatar' | 'cover'): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Ideal dimensions for avatars (150x150) and horizontal banners (800x220)
          let targetWidth = width;
          let targetHeight = height;

          if (type === 'avatar') {
            const maxDim = 150;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                targetHeight = Math.round((height * maxDim) / width);
                targetWidth = maxDim;
              } else {
                targetWidth = Math.round((width * maxDim) / height);
                targetHeight = maxDim;
              }
            }
          } else {
            // For cover banner: enforce standard landscape dimensions (800x220 max)
            const maxWidth = 800;
            const maxHeight = 220;
            if (width > maxWidth) {
              targetHeight = Math.round((height * maxWidth) / width);
              targetWidth = maxWidth;
            }
            if (targetHeight > maxHeight) {
              targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
              targetHeight = maxHeight;
            }
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo inicializar el contexto de imagen.'));
            return;
          }

          // Fill solid background to avoid transparency issues during JPEG compression
          ctx.fillStyle = type === 'avatar' ? '#ffffff' : '#0a0a0a';
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Draw the image
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Output as highly optimized JPEG (70% quality), typical size is ~5KB - 25KB
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.70);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Error al cargar el archivo de imagen.'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
      reader.readAsDataURL(file);
    });
  };

  // Convert and Compress File helper
  const processImageFile = async (file: File, type: 'avatar' | 'cover') => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona únicamente archivos de imagen.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const compressedBase64 = await compressAndResizeImage(file, type);
      if (type === 'avatar') {
        setPhotoURL(compressedBase64);
        setSuccess('¡Foto de perfil optimizada y cargada temporalmente! Guarda los cambios para conservarla.');
      } else {
        setCoverURL(compressedBase64);
        setSuccess('¡Banner de portada optimizado y cargado temporalmente! Guarda los cambios para conservarlo.');
      }
    } catch (err: any) {
      console.error('Error compressing image:', err);
      setError(err.message || 'No se pudo procesar la imagen. Por favor, intenta con otra.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Drop
  const handleDrop = (e: React.DragEvent, type: 'avatar' | 'cover') => {
    e.preventDefault();
    if (type === 'avatar') setIsDragOverAvatar(false);
    if (type === 'cover') setIsDragOverCover(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file, type);
    }
  };

  // Handle Manual File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, type);
    }
  };

  // Username validation helper (letters, numbers, underscores)
  const isValidUsername = (usernameStr: string) => {
    if (!usernameStr) return true; // Optional field
    return /^[a-zA-Z0-9_]{3,15}$/.test(usernameStr);
  };

  // Save changes to Firebase and local state
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanDisplayName = (displayName || '').trim();
    const cleanUsername = (username || '').toLowerCase().trim();
    const cleanBio = (bio || '').trim();
    const cleanTwitter = (twitter || '').trim();
    const cleanWebsite = (website || '').trim();

    if (cleanUsername && !isValidUsername(cleanUsername)) {
      setError('El nombre de usuario debe tener entre 3 y 15 caracteres y solo contener letras, números y guión bajo (_).');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update Firebase Auth Profile if possible
      try {
        await updateProfile(user, {
          displayName: cleanDisplayName || 'Usuario',
          photoURL: photoURL || null
        });
      } catch (authErr: any) {
        console.warn("Could not sync Auth profile:", authErr);
        // We continue anyway, because Firestore is the primary source of truth for custom profiles
      }

      // 2. Prepare Firestore document stats
      const updatedStats: UsageStats = {
        ...stats,
        displayName: cleanDisplayName || user.displayName || 'Usuario',
        username: cleanUsername,
        bio: cleanBio,
        photoURL: photoURL || '',
        coverURL: coverURL || '',
        twitter: cleanTwitter,
        website: cleanWebsite,
        updatedAt: new Date().toISOString()
      };

      if (!stats.createdAtDate) {
        updatedStats.createdAtDate = new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      // 3. Sanitize all properties to avoid any 'undefined' field errors in Firestore
      const sanitizedStats: UsageStats = JSON.parse(JSON.stringify(updatedStats));

      // 4. Update stats state and Firestore via parent callback
      await onUpdateStats(sanitizedStats);
      
      setIsEditing(false);
      setSuccess('¡Tu perfil se ha actualizado y guardado correctamente en la base de datos!');
    } catch (err: any) {
      console.error("Firestore Save Error in UserProfile:", err);
      setError(`Error al guardar: ${err.message || err.code || 'Inténtalo de nuevo.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formattedJoinDate = stats.createdAtDate || new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="w-full space-y-6" id="user-profile-view">
      {/* Header back button */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
        <button 
          onClick={onBackToExtractor}
          className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-emerald-400 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Extractor
        </button>
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          Perfil de Cuenta Registrada
        </span>
      </div>

      {/* Profile Card */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Cover Photo Area with drag and drop support */}
        <div 
          className={`h-48 md:h-56 relative w-full overflow-hidden transition-all duration-300 ${
            isDragOverCover ? 'bg-emerald-950/40 ring-4 ring-emerald-500/50' : 'bg-neutral-950'
          }`}
          onDragOver={(e) => handleDragOver(e, 'cover')}
          onDragLeave={() => handleDragLeave('cover')}
          onDrop={(e) => handleDrop(e, 'cover')}
          style={{ backgroundImage: `url(${coverURL || DEFAULT_COVER})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          {/* Overlay to darken slightly */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
          
          {isEditing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-pointer"
                 onClick={() => coverInputRef.current?.click()}
            >
              <UploadCloud className="w-8 h-8 text-emerald-400 mb-1.5 animate-bounce" />
              <p className="text-xs font-bold text-white">Arrastra o haz clic para subir portada</p>
              <p className="text-[9px] text-neutral-400">Recomendado: 800x200px (Max: 2.5MB)</p>
            </div>
          )}

          <input 
            type="file"
            ref={coverInputRef}
            onChange={(e) => handleFileChange(e, 'cover')}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Profile Details Container */}
        <div className="px-6 pb-6 relative pt-16 md:pt-20">
          
          {/* Overlapping Avatar Area with drag and drop support */}
          <div className="absolute top-0 left-6 -translate-y-1/2">
            <div 
              className={`w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-neutral-900 bg-neutral-900 relative shadow-xl transition-all duration-300 ${
                isDragOverAvatar ? 'ring-4 ring-emerald-500/50 scale-105' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, 'avatar')}
              onDragLeave={() => handleDragLeave('avatar')}
              onDrop={(e) => handleDrop(e, 'avatar')}
            >
              <img 
                src={photoURL || DEFAULT_AVATAR} 
                alt={displayName} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />

              {isEditing && (
                <div 
                  className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer pointer-events-auto text-center p-2"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-[10px] text-white font-semibold">Cambiar Foto</span>
                </div>
              )}

              <input 
                type="file"
                ref={avatarInputRef}
                onChange={(e) => handleFileChange(e, 'avatar')}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {/* Edit/Save Controls (Right Top) */}
          <div className="absolute top-4 right-6 flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-1.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 hover:border-emerald-500/30 text-xs font-bold text-neutral-200 hover:text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                Editar Perfil
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="p-1.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 hover:text-neutral-300 rounded-xl transition cursor-pointer"
                  title="Cancelar"
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-xs font-black text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Guardar Cambios"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Guardar
                </button>
              </div>
            )}
          </div>

          {/* Messaging/Success feedback inside the profile layout */}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 animate-pulse" />
              <span>{success}</span>
            </div>
          )}

          {/* Profile Details display */}
          {!isEditing ? (
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">
                    {displayName || 'Usuario Registrado'}
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                
                {username ? (
                  <p className="text-xs text-emerald-400 font-mono font-medium">@{username}</p>
                ) : (
                  <p className="text-xs text-neutral-500 italic">Sin nombre de usuario creado (@)</p>
                )}
              </div>

              {/* Biography display */}
              {bio ? (
                <div className="p-4 bg-neutral-950/60 border border-neutral-850 rounded-xl">
                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{bio}</p>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 italic">No se ha añadido ninguna biografía todavía. Haz clic en "Editar Perfil" para agregar una.</p>
              )}

              {/* Meta information & Socials */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-neutral-400 pt-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-neutral-500" />
                  <span>Miembro desde: <strong className="text-neutral-200">{formattedJoinDate}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-neutral-500" />
                  <span>Créditos Diarios: <strong className="text-neutral-200">{stats.isUnlimited ? 'Ilimitado' : stats.limit}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-neutral-500" />
                  <span>Email: <strong className="text-neutral-200 font-mono">{user.email}</strong></span>
                </div>
              </div>

              {/* Social Links Row */}
              {(twitter || website) && (
                <div className="flex items-center gap-3 pt-4 border-t border-neutral-800/50">
                  {website && (
                    <a 
                      href={website.startsWith('http') ? website : `https://${website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-900 hover:bg-neutral-850 text-xs text-neutral-300 hover:text-emerald-400 border border-neutral-800 rounded-lg transition"
                    >
                      <GlobeIcon className="w-3.5 h-3.5" />
                      <span>Sitio Web</span>
                    </a>
                  )}
                  {twitter && (
                    <a 
                      href={`https://twitter.com/${twitter.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-900 hover:bg-neutral-850 text-xs text-neutral-300 hover:text-emerald-400 border border-neutral-800 rounded-lg transition"
                    >
                      <Twitter className="w-3.5 h-3.5" />
                      <span>@{twitter.replace('@', '')}</span>
                    </a>
                  )}
                </div>
              )}

            </div>
          ) : (
            /* Editing State Form */
            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Display Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Nombre para mostrar</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)} 
                      placeholder="Ej. Bryan Narciso"
                      className="w-full h-10 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:outline-none rounded-xl pl-9 pr-4 text-xs text-white placeholder-neutral-700 transition"
                    />
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Nombre de usuario (único)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-xs font-mono text-emerald-500">@</span>
                    <input 
                      type="text" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))} 
                      placeholder="bryan_narciso"
                      className="w-full h-10 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:outline-none rounded-xl pl-7 pr-4 text-xs text-white placeholder-neutral-700 transition font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-neutral-500">Solo letras, números y guión bajo. Sin espacios (Ej. bryan_123)</p>
                </div>

                {/* Cover Link (Optional Manual Input) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">URL Portada Personalizada (Opcional)</label>
                  <input 
                    type="url" 
                    value={coverURL.startsWith('data:') ? '' : coverURL} 
                    onChange={(e) => setCoverURL(e.target.value)} 
                    placeholder="https://ejemplo.com/portada.jpg"
                    className="w-full h-10 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 text-xs text-white placeholder-neutral-700 transition"
                  />
                </div>

                {/* Website Link */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Sitio Web</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={website} 
                      onChange={(e) => setWebsite(e.target.value)} 
                      placeholder="tupaginaweb.com"
                      className="w-full h-10 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:outline-none rounded-xl pl-9 pr-4 text-xs text-white placeholder-neutral-700 transition"
                    />
                    <GlobeIcon className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                  </div>
                </div>

                {/* Twitter Link */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Twitter (X)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={twitter} 
                      onChange={(e) => setTwitter(e.target.value)} 
                      placeholder="bryan_twitter"
                      className="w-full h-10 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:outline-none rounded-xl pl-9 pr-4 text-xs text-white placeholder-neutral-700 transition"
                    />
                    <Twitter className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                  </div>
                </div>

              </div>

              {/* Biography textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Biografía / Acerca de mí</label>
                <div className="relative">
                  <textarea 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    rows={4}
                    placeholder="Describe un poco tu rol o intereses de scraping..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:outline-none rounded-xl p-3 text-xs text-white placeholder-neutral-700 transition leading-relaxed resize-none"
                  />
                </div>
              </div>

            </form>
          )}

        </div>
      </div>

      {/* Account metrics and limits overview section (Beautiful design highlight card) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="profile-analytics-dashboard">
        
        {/* Metric 1 */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl border border-emerald-500/15">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Estado de Suscripción</p>
            <p className="text-sm font-extrabold text-white mt-0.5">PRO Scraper Free</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-teal-600/10 text-teal-400 rounded-xl border border-teal-500/15">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Límite de Búsquedas</p>
            <p className="text-sm font-extrabold text-white mt-0.5">
              {stats.isUnlimited ? 'Ilimitadas' : `${stats.count} / ${stats.limit} de hoy`}
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/15">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Créditos Adicionales</p>
            <p className="text-sm font-extrabold text-white mt-0.5">+{stats.extraCredits} Disponibles</p>
          </div>
        </div>

      </div>
    </div>
  );
}
