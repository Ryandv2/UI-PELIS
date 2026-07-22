import React from 'react';
import { History, Calendar, Link2, ChevronRight, Trash2, Video, Database } from 'lucide-react';
import { ScrapeResult } from '../types';

interface ScrapeHistoryProps {
  history: ScrapeResult[];
  onSelectResult: (result: ScrapeResult) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
  activeId?: string;
  isLoggedIn?: boolean;
}

export default function ScrapeHistory({ 
  history, 
  onSelectResult, 
  onClearHistory, 
  onDeleteHistoryItem, 
  activeId,
  isLoggedIn = false
}: ScrapeHistoryProps) {
  
  if (history.length === 0) {
    return (
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 text-center text-neutral-400" id="empty-history-container">
        <History className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
        <p className="text-xs font-semibold text-neutral-300">Historial vacío</p>
        <p className="text-[10px] text-neutral-500 mt-1">Tus búsquedas y extracciones aparecerán guardadas de forma persistente aquí.</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 md:p-6 shadow-xl space-y-4" id="scrape-history-panel">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-bold text-white">Historial de Extracción</h4>
        </div>
        <button
          onClick={onClearHistory}
          className="inline-flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition px-2 py-1 hover:bg-red-500/10 rounded cursor-pointer"
          title="Borrar todo el historial"
        >
          <Trash2 className="w-3 h-3" /> Borrar todo
        </button>
      </div>

      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin" id="history-items-list">
        {history.map((item) => {
          const isActive = activeId === item.id;
          return (
            <div
              key={item.id}
              className={`group relative p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                isActive
                  ? 'bg-emerald-950/20 border-emerald-500/60'
                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
              }`}
              onClick={() => onSelectResult(item)}
            >
              <div className="space-y-1 min-w-0 flex-grow">
                {/* Title */}
                <h5 className={`text-xs font-bold truncate pr-6 ${isActive ? 'text-emerald-400' : 'text-neutral-200'}`}>
                  {item.title}
                </h5>

                {/* Subinfo */}
                <div className="flex items-center gap-2.5 text-[10px] text-neutral-500 flex-wrap">
                  <span className="flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    {item.date}
                  </span>
                  <span className="flex items-center gap-0.5 max-w-[150px] truncate" title={item.targetUrl}>
                    <Link2 className="w-2.5 h-2.5" />
                    {new URL(item.targetUrl).hostname}
                  </span>
                </div>

                {/* Embed count tag */}
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-900 text-neutral-400 rounded text-[9px] font-semibold border border-neutral-800">
                    <Video className="w-2.5 h-2.5 text-emerald-400" />
                    {item.embeds.length} reproductores
                  </span>
                </div>
              </div>

              {/* Action columns */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Avoid selecting item on delete click
                    onDeleteHistoryItem(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-neutral-500 hover:text-red-400 rounded-lg transition shrink-0 cursor-pointer"
                  title="Eliminar del historial"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className={`w-4 h-4 transition ${isActive ? 'text-emerald-400 translate-x-0.5' : 'text-neutral-600'}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 justify-center bg-neutral-950 p-2 rounded-lg border border-neutral-800">
        {isLoggedIn ? (
          <>
            <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> 
            <span>Historial sincronizado en la nube (Firebase DB)</span>
          </>
        ) : (
          <>
            <Database className="w-3.5 h-3.5 text-neutral-500" /> 
            <span>Datos guardados localmente en tu navegador</span>
          </>
        )}
      </div>
    </div>
  );
}
