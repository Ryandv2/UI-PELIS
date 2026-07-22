import React, { useState, useEffect } from 'react';
import { CreditCard, Shield, Sparkles, Check, Loader2, ArrowRight, X, AlertCircle } from 'lucide-react';
import { PaymentInvoice, UsageStats } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStats: UsageStats;
  onPurchaseSuccess: (planId: 'credits_50' | 'credits_1000' | 'unlimited_year', invoice: PaymentInvoice) => void;
  user: FirebaseUser | null;
  onLogin: () => void;
}

const PLANS = [
  {
    id: 'credits_50',
    name: 'Pack 50 Búsquedas',
    price: 1.00,
    description: 'Añade 50 créditos de scraping adicionales a tu cuenta de inmediato.',
    features: [
      '50 búsquedas adicionales',
      'Sin fecha de vencimiento',
      'Soporte premium para Streamwish',
      'Historial de búsquedas guardado'
    ],
    popular: false,
    badge: 'Económico'
  },
  {
    id: 'credits_1000',
    name: 'Mega Pack 1000',
    price: 8.00,
    description: 'Ideal para usuarios avanzados y archivadores de enlaces.',
    features: [
      '1,000 búsquedas de scraping',
      'Ahorra más de un 60%',
      'Extractor multi-script avanzado',
      'Descarga de historial en CSV',
      'Soporte prioritario 24/7'
    ],
    popular: true,
    badge: 'Más Vendido'
  },
  {
    id: 'unlimited_year',
    name: 'Suscripción Ilimitada',
    price: 40.00,
    description: 'Acceso total e ilimitado a toda la infraestructura de scraping por un año.',
    features: [
      'Búsquedas 100% Ilimitadas',
      'Acceso exclusivo a nuevos extractores',
      'Velocidad de scraping ultra-rápida',
      'Uso concurrente multi-pestaña',
      'Garantía de soporte de 1 año'
    ],
    popular: false,
    badge: 'Premium Anual'
  }
];

export default function BillingModal({ isOpen, onClose, currentStats, onPurchaseSuccess, user, onLogin }: BillingModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('credits_1000');
  const [step, setStep] = useState<'plan' | 'checkout' | 'success'>('plan');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState('');
  const [invoice, setInvoice] = useState<PaymentInvoice | null>(null);

  const selectedPlan = PLANS.find(p => p.id === selectedPlanId)!;

  // Real-time PayPal Buttons loading & initialization
  useEffect(() => {
    if (step === 'checkout' && isOpen) {
      const scriptId = 'paypal-sdk-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      const renderPayPalButtons = () => {
        const container = document.getElementById('paypal-button-container');
        if (container && (window as any).paypal) {
          container.innerHTML = ''; // Clear prior buttons
          (window as any).paypal.Buttons({
            style: {
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'pay'
            },
            createOrder: async () => {
              setFormError('');
              try {
                const res = await fetch("/api/paypal/create-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ planId: selectedPlanId })
                });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || "Error al crear la orden de PayPal.");
                }
                const order = await res.json();
                return order.id;
              } catch (err: any) {
                setFormError(err.message || "Error al conectar con la API de pagos.");
                throw err;
              }
            },
            onApprove: async (data: any) => {
              setIsProcessing(true);
              try {
                const res = await fetch("/api/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: data.orderID, planId: selectedPlanId })
                });
                const result = await res.json();
                if (result.success) {
                  setInvoice(result.invoice);
                  setStep('success');
                  onPurchaseSuccess(selectedPlanId as any, result.invoice);
                } else {
                  setFormError(result.error || "No se pudo comprobar la captura del pago.");
                }
              } catch (err) {
                setFormError("Error capturando el pago de la orden.");
              } finally {
                setIsProcessing(false);
              }
            },
            onError: (err: any) => {
              console.error("PayPal Smart Button Error", err);
              setFormError("Error de la pasarela de PayPal. Verifica que tu cuenta tenga saldo o que los tokens del servidor sean válidos.");
            }
          }).render("#paypal-button-container");
        }
      };

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        // User Client ID
        const clientId = "BAAGaSB47tQomDAwTF5L2Aj7cGUnqF9mjR3NCyzd5T6_VwMgaeQwQgPkdGMjxe1JUcZxh4VO9jsQf_V7n4";
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        script.async = true;
        script.onload = () => {
          setTimeout(renderPayPalButtons, 300);
        };
        document.body.appendChild(script);
      } else {
        setTimeout(renderPayPalButtons, 200);
      }
    }
  }, [step, isOpen, selectedPlanId]);

  if (!isOpen) return null;

  const startCheckout = () => {
    setStep('checkout');
    setFormError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" id="billing-modal-backdrop">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl"
        id="billing-modal-content"
      >
        {/* Header Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'plan' && (
          <div className="p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold mb-3 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Ampliar Límites de Extracción
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Planes y Créditos Profesionales</h2>
              <p className="text-sm md:text-base text-neutral-400 mt-2 max-w-xl mx-auto">
                ¿Llegaste a tu límite diario de 50 búsquedas? Desbloquea más capacidad de scraping real sin límites ni bloqueos CORS mediante nuestra pasarela.
              </p>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative flex flex-col p-6 rounded-xl border cursor-pointer transition-all duration-300 ${
                      isSelected 
                        ? 'bg-black border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] transform -translate-y-1' 
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {plan.badge}
                      </span>
                    )}
                    {!plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-neutral-900 text-neutral-300 text-[10px] font-medium rounded-full border border-neutral-700">
                        {plan.badge}
                      </span>
                    )}

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-extrabold text-white">${plan.price.toFixed(2)}</span>
                      <span className="text-xs text-neutral-500">USD {plan.id === 'unlimited_year' ? '/ año' : 'pago único'}</span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-neutral-300 mb-6 flex-grow">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto">
                      <div className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-center transition-all ${
                        isSelected 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                          : 'bg-neutral-850 text-neutral-300 hover:bg-neutral-800'
                      }`}>
                        {isSelected ? 'Seleccionado' : 'Elegir Plan'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Plan Bar & CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-black rounded-xl border border-neutral-800 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-neutral-400">Plan Seleccionado</p>
                  <p className="text-sm font-bold text-white">{selectedPlan.name} — ${selectedPlan.price.toFixed(2)} USD</p>
                </div>
              </div>
              {user ? (
                <button
                  onClick={startCheckout}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold text-sm transition cursor-pointer"
                >
                  Continuar al Pago <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                  <span className="text-xs text-amber-400 font-semibold text-center sm:text-right max-w-xs">
                    ⚠️ Debes registrarte o iniciar sesión para comprar créditos.
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onLogin();
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition cursor-pointer"
                  >
                    Identificarse
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'checkout' && (
          <div className="p-6 md:p-8 max-w-xl mx-auto">
            <div className="mb-6">
              <button 
                onClick={() => setStep('plan')} 
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mb-2 font-medium"
              >
                ← Volver a los planes
              </button>
              <h2 className="text-xl md:text-2xl font-bold text-white">Pasarela de Pago Segura</h2>
              <p className="text-xs text-neutral-400 mt-1">Completa tu pago oficial de ${selectedPlan.price.toFixed(2)} USD utilizando PayPal.</p>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-400 rounded-lg text-xs border border-red-500/20 mb-4 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/15 text-xs text-neutral-300 leading-relaxed">
                <p className="font-semibold text-emerald-400 mb-1">💡 Conexión de pago segura con PayPal:</p>
                Estás utilizando la pasarela de pagos oficial. Al hacer clic en los botones de abajo, podrás iniciar sesión con tu cuenta de PayPal para completar la transacción real de manera 100% segura.
              </div>

              {/* Container for PayPal buttons */}
              <div className="bg-black p-4 rounded-xl border border-neutral-800 min-h-[150px] flex flex-col justify-center">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center py-6 text-neutral-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    <span className="text-xs">Confirmando y capturando la transacción...</span>
                  </div>
                ) : (
                  <div id="paypal-button-container" className="w-full"></div>
                )}
              </div>

              <div className="p-3 bg-black rounded-lg border border-neutral-800 flex items-center justify-between text-xs text-neutral-400 mt-2">
                <span>Concepto: <strong className="text-white">{selectedPlan.name}</strong></span>
                <span>Total: <strong className="text-white text-sm">${selectedPlan.price.toFixed(2)} USD</strong></span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 justify-center">
                <Shield className="w-3.5 h-3.5 text-emerald-500" /> Transacción procesada con autenticación SSL oficial de PayPal
              </div>
            </div>
          </div>
        )}

        {step === 'success' && invoice && (
          <div className="p-8 text-center max-w-md mx-auto animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 mb-6">
              <Check className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">¡Pago Procesado!</h2>
            <p className="text-sm text-neutral-400 mt-2">Tu cuenta ha sido actualizada con éxito de forma real e inmediata.</p>

            {/* Premium Invoice */}
            <div className="my-6 p-5 bg-neutral-950 rounded-xl border border-neutral-800 text-left text-xs font-mono space-y-2">
              <p className="text-neutral-500 text-center border-b border-neutral-800 pb-2 mb-2 font-bold uppercase tracking-wider text-[10px]">Factura de Scraping Premium</p>
              <div className="flex justify-between">
                <span className="text-neutral-400">ID Factura:</span>
                <span className="text-white font-bold">{invoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Plan:</span>
                <span className="text-white">{invoice.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Monto:</span>
                <span className="text-emerald-400 font-bold">${invoice.amount.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Fecha:</span>
                <span className="text-white text-[10px]">{invoice.date}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-800 mt-2">
                <span className="text-neutral-400">Estado:</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-semibold border border-emerald-500/20 uppercase">APROBADO</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-sm transition"
            >
              Cerrar y Empezar a Extraer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
