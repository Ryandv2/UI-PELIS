import React from 'react';
import { ShieldAlert, Zap, Plus, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { UsageStats } from '../types';

interface UsageMeterProps {
  stats: UsageStats;
  onOpenBilling: () => void;
}

export default function UsageMeter({ stats, onOpenBilling }: UsageMeterProps) {
  const percentage = stats.isUnlimited 
    ? 0 
    : Math.min(100, (stats.count / stats.limit) * 100);

  const isLimitReached = !stats.isUnlimited && stats.count >= (stats.limit + stats.extraCredits);

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 shadow-xl" id="usage-meter-container">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" /> Control de Consumo & Límites
        </h4>
        
        {stats.isUnlimited ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-extrabold rounded-full border border-emerald-500/25 animate-pulse">
            <InfinityIcon className="w-3.5 h-3.5" /> Plan Ilimitado Activo
          </span>
        ) : stats.extraCredits > 0 ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/25">
            + {stats.extraCredits} créditos extra
          </span>
        ) : (
          <span className="text-[10px] text-neutral-500">
            Límite Diario Estándar
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Statistics detail */}
        {stats.isUnlimited ? (
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
            <h5 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Tienes acceso ilimitado
            </h5>
            <p className="text-xs text-neutral-300 mt-1">
              Tu plan ilimitado anual está activado y listo. Puedes realizar tantas extracciones de iframe como desees sin restricciones.
            </p>
            {stats.expiresAt && (
              <p className="text-[10px] text-emerald-400/80 mt-1.5 font-medium">
                Vence el: {stats.expiresAt}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <div className="text-left">
                <p className="text-xs text-neutral-400">Consultas consumidas hoy</p>
                <p className="text-lg font-black text-white">
                  {stats.count} <span className="text-neutral-500 font-normal text-xs">/ {stats.limit} gratuitas</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-400">Saldo adicional</p>
                <p className="text-sm font-bold text-emerald-400">
                  {stats.extraCredits} créditos
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  percentage >= 90 
                    ? 'bg-red-500' 
                    : percentage >= 70 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Extra warnings */}
            {isLimitReached && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs mt-1 animate-pulse">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Límite alcanzado</strong>
                  Has consumido tus {stats.limit} búsquedas gratuitas diarias y tus créditos extra. Compra un paquete o identifícate para seguir analizando.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upgrade / Billing CTA */}
        <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800 gap-4">
          <div className="text-left">
            <p className="text-[10px] text-neutral-500 font-semibold uppercase">¿Necesitas más velocidad?</p>
            <p className="text-xs text-neutral-300 font-medium">Adquiere créditos extra desde $1.00 USD</p>
          </div>
          <button
            onClick={onOpenBilling}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Ampliar Plan
          </button>
        </div>
      </div>
    </div>
  );
}
