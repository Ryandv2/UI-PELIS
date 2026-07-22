import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  LifeBuoy, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Bot, 
  Loader2,
  HelpCircle,
  Wrench,
  ArrowLeft
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

interface SupportTicket {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: 'Abierto' | 'En Progreso' | 'Respondido';
  date: string;
  replies: Array<{
    sender: 'user' | 'agent';
    message: string;
    date: string;
  }>;
}

interface TechnicalSupportProps {
  onBackToExtractor: () => void;
  user: FirebaseUser | null;
}

const FAQS = [
  {
    question: "¿Cómo funciona la extracción de iframe?",
    answer: "Nuestro extractor procesa el código HTML de la URL objetivo en el servidor (Node.js). Esto evade el bloqueo de CORS y extrae los reproductores de vídeo integrados como Streamwish, Netu, Filemoon, entre otros."
  },
  {
    question: "Me sale 'Error en la extracción', ¿qué hago?",
    answer: "Verifica que la URL sea pública y accesible desde un navegador normal. Algunos sitios web usan protecciones agresivas de Cloudflare. Si el error persiste, envía un ticket de soporte y nuestro equipo revisará la pasarela de scraping."
  },
  {
    question: "¿Cómo funciona el límite de búsquedas?",
    answer: "Todos los usuarios tienen 50 extracciones gratuitas por día. El límite se restablece automáticamente cada 24 horas. Para obtener más capacidad o uso ilimitado, puedes adquirir un plan con PayPal."
  },
  {
    question: "Compré un plan pero mis créditos no se actualizaron",
    answer: "Si tu pago de PayPal se completó con éxito pero los créditos no se han reflejado, abre la pestaña de 'Tickets' e introduce tu ID de transacción de PayPal. Se resolverá de forma automática."
  }
];

export default function TechnicalSupport({ onBackToExtractor, user }: TechnicalSupportProps) {
  const [activeTab, setActiveTab] = useState<'faq' | 'ticket' | 'chat'>('faq');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  
  // FAQs state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // New Ticket state
  const [ticketName, setTicketName] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketCategory, setTicketCategory] = useState('scrapper');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSuccessMessage, setTicketSuccessMessage] = useState('');

  // Live Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: '¡Hola! Soy el asistente virtual de soporte técnico de Embed Link Extractor. ¿En qué puedo ayudarte hoy?',
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Pre-fill fields if user is logged in
  useEffect(() => {
    if (user) {
      setTicketName(user.displayName || '');
      setTicketEmail(user.email || '');
    }
  }, [user]);

  // Load and sync tickets on mount / auth change
  useEffect(() => {
    let unsubscribe = () => {};
    
    if (user) {
      const ticketsPath = `users/${user.uid}/tickets`;
      const ticketsRef = collection(db, 'users', user.uid, 'tickets');
      
      unsubscribe = onSnapshot(ticketsRef, (snapshot) => {
        const cloudTickets: SupportTicket[] = [];
        snapshot.forEach((doc) => {
          cloudTickets.push(doc.data() as SupportTicket);
        });
        cloudTickets.sort((a, b) => b.id.localeCompare(a.id));
        setTickets(cloudTickets);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, ticketsPath);
      });
    } else {
      const saved = localStorage.getItem('support_tickets_data');
      if (saved) {
        try {
          setTickets(JSON.parse(saved));
        } catch (e) {
          console.error("Error loading tickets", e);
        }
      } else {
        setTickets([]);
      }
    }
    
    return () => unsubscribe();
  }, [user]);

  // Save ticket helper for guests
  const saveTickets = (newTickets: SupportTicket[]) => {
    setTickets(newTickets);
    localStorage.setItem('support_tickets_data', JSON.stringify(newTickets));
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketName || !ticketEmail || !ticketSubject || !ticketMessage) return;

    setIsSubmittingTicket(true);

    const ticketId = `TK-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTicket: SupportTicket = {
      id: ticketId,
      name: ticketName,
      email: ticketEmail,
      category: ticketCategory,
      subject: ticketSubject,
      message: ticketMessage,
      status: 'Abierto',
      date: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      replies: []
    };

    if (user) {
      const path = `users/${user.uid}/tickets/${ticketId}`;
      try {
        const ticketDocRef = doc(db, 'users', user.uid, 'tickets', ticketId);
        await setDoc(ticketDocRef, newTicket);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const updated = [newTicket, ...tickets];
      saveTickets(updated);
    }

    // Reset form
    setTicketSubject('');
    setTicketMessage('');
    setIsSubmittingTicket(false);
    setTicketSuccessMessage(`¡Ticket creado con éxito! Tu ID es: ${newTicket.id}. Lo revisaremos lo antes posible.`);

    // Simulated auto-reply after 12 seconds
    setTimeout(async () => {
      const agentReply = {
        sender: 'agent' as const,
        message: `Hola ${newTicket.name}, gracias por contactar a soporte técnico. Hemos analizado tu ticket sobre '${newTicket.subject}' y nuestro equipo de desarrollo ha reiniciado la pasarela correspondiente. Por favor, vuelve a intentar tu operación. Si persiste el inconveniente, responde directamente aquí.`,
        date: new Date().toLocaleDateString('es-ES', { hour: '2-digit', minute: '2-digit' })
      };

      if (user) {
        try {
          const ticketDocRef = doc(db, 'users', user.uid, 'tickets', ticketId);
          const ticketSnap = await getDoc(ticketDocRef);
          if (ticketSnap.exists()) {
            const currentTicket = ticketSnap.data() as SupportTicket;
            const updatedTicket = {
              ...currentTicket,
              status: 'Respondido' as const,
              replies: [...currentTicket.replies, agentReply]
            };
            await setDoc(ticketDocRef, updatedTicket);
          }
        } catch (error) {
          console.error("Error auto-replying in Firestore:", error);
        }
      } else {
        const freshSaved = localStorage.getItem('support_tickets_data');
        if (freshSaved) {
          const parsed: SupportTicket[] = JSON.parse(freshSaved);
          const idx = parsed.findIndex(t => t.id === newTicket.id);
          if (idx !== -1) {
            parsed[idx].status = 'Respondido';
            parsed[idx].replies.push(agentReply);
            localStorage.setItem('support_tickets_data', JSON.stringify(parsed));
            setTickets(parsed);
          }
        }
      }
    }, 12000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');

    // Append User Message
    const updatedMessages = [
      ...chatMessages,
      {
        sender: 'user' as const,
        text: userMsg,
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setChatMessages(updatedMessages);
    setIsBotTyping(true);

    // Simulated response logic
    setTimeout(() => {
      let replyText = "Entiendo tu duda. He registrado tu inquietud. Si el extractor no responde como esperabas, te sugiero abrir un ticket detallado en la pestaña 'Nuevo Ticket' indicando la URL exacta para que la analicemos manualmente.";
      
      const textLower = userMsg.toLowerCase();
      if (textLower.includes('error') || textLower.includes('falla') || textLower.includes('no extrae')) {
        replyText = "Los errores de extracción suelen ocurrir cuando la web objetivo bloquea temporalmente las IPs del servidor o requiere login. Puedes intentar de nuevo en unos minutos o enviarnos un ticket con el enlace.";
      } else if (textLower.includes('paypal') || textLower.includes('pagar') || textLower.includes('compra') || textLower.includes('plan') || textLower.includes('crédito') || textLower.includes('credito')) {
        replyText = "La pasarela de PayPal se ejecuta 100% en vivo. Al completar la orden se agregan los créditos automáticamente. Si tienes algún problema con tu saldo, facilítanos tu ID de transacción en un ticket para validar tu compra inmediatamente.";
      } else if (textLower.includes('gratis') || textLower.includes('limite') || textLower.includes('límite') || textLower.includes('cuanto')) {
        replyText = "Cada día recibes 50 créditos gratuitos. El sistema se reinicia a las 00:00 UTC. Si requieres más volumen de scraping para tus proyectos, puedes expandir tu plan desde el botón 'Ampliar Cuenta'.";
      } else if (textLower.includes('streamwish') || textLower.includes('reproductor') || textLower.includes('iframe') || textLower.includes('video')) {
        replyText = "¡Sí! Soportamos extracción de iframes directos, reproductores mp4 ocultos y scripts ofuscados de servidores de streaming conocidos de forma nativa.";
      }

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot' as const,
          text: replyText,
          time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsBotTyping(false);
    }, 1200);
  };

  const handleDeleteTicket = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'tickets', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/tickets/${id}`);
      }
    } else {
      const updated = tickets.filter(t => t.id !== id);
      saveTickets(updated);
    }
  };

  return (
    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden shadow-2xl animate-fade-in" id="technical-support-workspace">
      {/* Header */}
      <div className="p-6 border-b border-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-950">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Centro de Soporte Técnico <span className="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold uppercase">Premium</span>
            </h2>
            <p className="text-[11px] text-neutral-400">Canal de ayuda técnica y resolución de incidencias en vivo</p>
          </div>
        </div>
        
        <button 
          onClick={onBackToExtractor}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold border border-neutral-800 transition cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Extractor
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-900 px-6 gap-2 bg-neutral-950/40 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('faq'); setTicketSuccessMessage(''); }}
          className={`py-3 px-3 text-[11px] font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'faq'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> Preguntas Frecuentes
        </button>
        <button
          onClick={() => { setActiveTab('ticket'); setTicketSuccessMessage(''); }}
          className={`py-3 px-3 text-[11px] font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'ticket'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" /> Nuevo Ticket / Incidencia
        </button>
        <button
          onClick={() => { setActiveTab('chat'); setTicketSuccessMessage(''); }}
          className={`py-3 px-3 text-[11px] font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'chat'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chat de Soporte AI
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6">
        
        {/* TAB 1: FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 mb-2 text-left">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Antes de abrir una incidencia, consulta estas respuestas rápidas para ver si tu consulta tiene solución inmediata.
              </p>
            </div>

            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="border border-neutral-900 rounded-xl overflow-hidden bg-neutral-900/10 text-left"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-3.5 text-left hover:bg-neutral-900/30 transition text-xs font-semibold text-neutral-200"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                  </button>
                  {isOpen && (
                    <div className="p-3.5 bg-black border-t border-neutral-900 text-xs text-neutral-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: Ticket Form */}
        {activeTab === 'ticket' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form */}
            <div className="lg:col-span-7 space-y-4 text-left">
              {ticketSuccessMessage ? (
                <div className="p-4 bg-emerald-950/25 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-white">¡Inconveniente Registrado!</h4>
                      <p className="text-[11px] text-neutral-300 mt-1">{ticketSuccessMessage}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTicketSuccessMessage('')}
                    className="text-[10px] text-emerald-400 hover:underline font-bold"
                  >
                    Enviar otro reporte técnico
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tu Nombre</label>
                      <input
                        type="text"
                        required
                        value={ticketName}
                        onChange={(e) => setTicketName(e.target.value)}
                        placeholder="Ej. Bryan"
                        className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Email de Contacto</label>
                      <input
                        type="email"
                        required
                        value={ticketEmail}
                        onChange={(e) => setTicketEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Categoría Técnica</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="scrapper">Error de Extracción de Iframe</option>
                      <option value="billing">Pago o Plan de PayPal</option>
                      <option value="bug">Fallo del Sistema / Bug de UI</option>
                      <option value="feature">Sugerencia de Nueva Web para Scrapear</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Asunto de la Incidencia</label>
                    <input
                      type="text"
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Ej. Error al intentar extraer de streamwish"
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Detalles o URL Afectada</label>
                    <textarea
                      required
                      rows={3}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Especifica la URL que falló o describe el inconveniente..."
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingTicket}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingTicket ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registrando...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Enviar Reporte de Soporte
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* My Tickets History */}
            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-neutral-900 pt-6 lg:pt-0 lg:pl-6 space-y-4 text-left">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide pb-2 border-b border-neutral-900">
                <FileText className="w-4 h-4 text-emerald-400" /> Mis Tickets ({tickets.length})
              </h3>

              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-neutral-600 text-center space-y-1">
                  <Clock className="w-6 h-6 text-neutral-800" />
                  <span className="text-[11px]">No tienes reportes creados.</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {tickets.map((t) => (
                    <div 
                      key={t.id}
                      className="p-3 bg-neutral-900/30 border border-neutral-800 rounded-xl space-y-2 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-neutral-400">{t.id}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                          t.status === 'Respondido'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white truncate">{t.subject}</h4>
                        <p className="text-[10px] text-neutral-500 line-clamp-2 mt-0.5">{t.message}</p>
                      </div>
                      
                      {t.replies.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-neutral-800/60 bg-black/40 p-2 rounded-lg">
                          <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                            <Bot className="w-3 h-3" /> Respuesta de Soporte:
                          </span>
                          <p className="text-[10px] text-neutral-300 leading-relaxed mt-1">
                            {t.replies[0].message}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[9px] text-neutral-500">
                        <span>{t.date}</span>
                        <button
                          onClick={() => handleDeleteTicket(t.id)}
                          className="text-red-400 hover:underline cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: Chat de Soporte AI */}
        {activeTab === 'chat' && (
          <div className="max-w-2xl mx-auto flex flex-col h-[340px] border border-neutral-900 rounded-xl bg-neutral-950 overflow-hidden">
            {/* Messages */}
            <div className="flex-grow p-4 overflow-y-auto space-y-3 flex flex-col bg-neutral-900/10">
              {chatMessages.map((msg, index) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div 
                    key={index} 
                    className={`flex items-start gap-2.5 max-w-[85%] ${
                      isBot ? 'self-start' : 'self-end flex-row-reverse'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isBot 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                        : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                    }`}>
                      {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed text-left ${
                        isBot 
                          ? 'bg-neutral-950 text-neutral-200 rounded-tl-none border border-neutral-900' 
                          : 'bg-emerald-600 text-white rounded-tr-none'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-neutral-600 mt-1 block px-1 text-right">
                        {msg.time}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isBotTyping && (
                <div className="flex items-start gap-2.5 self-start">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-neutral-950 text-neutral-400 p-3 rounded-2xl rounded-tl-none border border-neutral-900 text-xs flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Escribiendo respuesta de soporte...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-neutral-900 bg-neutral-950 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe tu duda (ej: 'no extrae', 'créditos')..."
                className="flex-grow bg-black border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="p-3 bg-black/60 text-center text-[10px] text-neutral-500 flex items-center justify-between px-6 border-t border-neutral-900">
        <span>Canal de Soporte Activo 24/7</span>
        <span className="font-mono text-neutral-400">© 2026 Embed Link Extractor</span>
      </div>
    </div>
  );
}
