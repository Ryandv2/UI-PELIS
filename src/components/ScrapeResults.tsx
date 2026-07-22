import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Play, Eye, EyeOff, Search, Info } from 'lucide-react';
import { ExtractedEmbed } from '../types';

interface ScrapeResultsProps {
  embeds: ExtractedEmbed[];
  title: string;
  targetUrl: string;
}

export default function ScrapeResults({ embeds, title, targetUrl }: ScrapeResultsProps) {
  const [filter, setFilter] = useState<string>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedIframeIndex, setCopiedIframeIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueProviders = Array.from(new Set(embeds.map(e => e.label)));

  // Filter embeds based on selection and search query
  const filteredEmbeds = embeds.filter(embed => {
    const matchesProvider = filter === 'all' || embed.label === filter;
    const matchesQuery = embed.src.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         embed.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         embed.domain.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProvider && matchesQuery;
  });

  const copyToClipboard = (text: string, index: number, isIframe: boolean) => {
    navigator.clipboard.writeText(text);
    if (isIframe) {
      setCopiedIframeIndex(index);
      setTimeout(() => setCopiedIframeIndex(null), 2000);
    } else {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const getIframeCode = (src: string) => {
    return `<iframe src="${src}" width="640" height="360" frameborder="0" allowfullscreen="true" scrolling="no"></iframe>`;
  };

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 md:p-6 shadow-xl" id="scrape-results-section">
      {/* Results Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-neutral-800 gap-4 mb-6">
        <div>
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20 uppercase tracking-wider">
            Extracción Exitosa
          </span>
          <h3 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            {title}
          </h3>
          <p className="text-xs text-neutral-500 truncate max-w-lg mt-0.5" title={targetUrl}>
            Fuente: <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-0.5">{targetUrl} <ExternalLink className="w-3 h-3" /></a>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-950 px-3.5 py-1.5 rounded-lg border border-neutral-800">
          Encontrados: <strong className="text-white text-sm">{embeds.length}</strong> reproductores
        </div>
      </div>

      {embeds.length === 0 ? (
        <div className="text-center py-12 bg-neutral-950/40 rounded-xl border border-neutral-800/50">
          <Info className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white">No se detectaron reproductores embed</h4>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            El sitio analizado podría estar cargando sus iframe mediante un script protegido, o la URL no es accesible directamente. Prueba otra URL de streaming.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Filter Buttons */}
            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  filter === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                Todos ({embeds.length})
              </button>
              {uniqueProviders.map(provider => {
                const count = embeds.filter(e => e.label === provider).length;
                return (
                  <button
                    key={provider}
                    onClick={() => setFilter(provider)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                      filter === provider
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {provider} ({count})
                  </button>
                );
              })}
            </div>

            {/* Local Search Input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <input
                type="text"
                placeholder="Buscar en resultados..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-500" />
            </div>
          </div>

          {/* Results List */}
          <div className="grid grid-cols-1 gap-4" id="embeds-links-grid">
            {filteredEmbeds.map((embed, index) => {
              const isSelectedForPreview = previewUrl === embed.src;
              return (
                <div 
                  key={index} 
                  className={`p-4 rounded-xl border transition-all ${
                    isSelectedForPreview 
                      ? 'bg-neutral-800 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                      : 'bg-neutral-950 hover:bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Info */}
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20">
                          {embed.label}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono truncate">
                          {embed.domain}
                        </span>
                        <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-400 text-[9px] rounded font-medium">
                          {embed.type === 'iframe' ? 'DOM Iframe' : 'Script Regex'}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-neutral-300 break-all bg-black/40 p-2 rounded border border-neutral-900">
                        {embed.src}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Copy Raw Link */}
                      <button
                        onClick={() => copyToClipboard(embed.src, index, false)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium border border-neutral-800 transition cursor-pointer"
                        title="Copiar URL directa del reproductor"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Link</span>
                          </>
                        )}
                      </button>

                      {/* Copy Iframe Code */}
                      <button
                        onClick={() => copyToClipboard(getIframeCode(embed.src), index, true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium border border-neutral-800 transition cursor-pointer"
                        title="Copiar código HTML iframe para tu web"
                      >
                        {copiedIframeIndex === index ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Iframe</span>
                          </>
                        )}
                      </button>

                      {/* Preview video inside dashboard */}
                      <button
                        onClick={() => setPreviewUrl(isSelectedForPreview ? null : embed.src)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                          isSelectedForPreview 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                            : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                        }`}
                        title="Probar y previsualizar reproductor"
                      >
                        {isSelectedForPreview ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Cerrar</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Previsualizar</span>
                          </>
                        )}
                      </button>

                      {/* Open player in new tab */}
                      <a
                        href={embed.src}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition"
                        title="Abrir reproductor en nueva pestaña"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Embedded Iframe Preview Container */}
                  {isSelectedForPreview && (
                    <div className="mt-4 border-t border-neutral-800 pt-4 animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" /> Vista Previa Segura del Reproductor
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          (Bloqueador de anuncios recomendado para evitar popups del host)
                        </span>
                      </div>
                      
                      <div className="relative aspect-video w-full max-w-3xl mx-auto rounded-lg overflow-hidden bg-black border border-neutral-800 shadow-inner">
                        <iframe
                          src={embed.src}
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          allowFullScreen
                          scrolling="no"
                          title="Stream Player Preview"
                          className="absolute inset-0 w-full h-full"
                          // Sandbox settings to prevent target redirects, but allow video running
                          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
