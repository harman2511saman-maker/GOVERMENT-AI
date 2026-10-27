import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Crown, Info, ShieldCheck, MessageSquare, PlusCircle, ThumbsUp, ThumbsDown, Printer, Menu, X, Trash2, MessageCircle, Copy, Check, Globe } from 'lucide-react';
import logoImage from '../assets/images.jpg';
import { translations } from '../utils/translations';

// Helper to get or create User ID
const getUserId = () => {
  let uid = localStorage.getItem('gov_user_id');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem('gov_user_id', uid);
  }
  return uid;
};

const generateSessionId = () => 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();

const ChatApp = () => {
  const [userId] = useState(getUserId());
  const [currentSessionId, setCurrentSessionId] = useState(generateSessionId());
  const [sessions, setSessions] = useState([]);
  
  // Language State: 'ku' (Kurdish), 'ar' (Arabic), 'en' (English)
  const [lang, setLang] = useState(() => localStorage.getItem('gov_lang') || 'ku');
  const t = translations[lang] || translations.ku;

  const [messages, setMessages] = useState([
    { 
      id: "welcome", 
      text: t.welcome, 
      sender: "bot",
      feedback_score: 0
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionName, setSuggestionName] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionSending, setSuggestionSending] = useState(false);
  const [suggestionSent, setSuggestionSent] = useState(false);
  const messagesEndRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState(null); // stores message id being copied

  // Change Language Handler
  const handleLanguageChange = (newLang) => {
    if (newLang === lang) return;
    setLang(newLang);
    localStorage.setItem('gov_lang', newLang);
    document.documentElement.dir = translations[newLang].dir;
    document.documentElement.lang = newLang;

    // Update welcome message if no conversation has started yet
    setMessages(prev => prev.map(m => {
      if (m.id === "welcome") {
        return { ...m, text: translations[newLang].welcome };
      }
      return m;
    }));
  };

  useEffect(() => {
    document.documentElement.dir = t.dir;
    document.documentElement.lang = lang;
  }, [lang, t.dir]);

  // Load Sessions History
  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/sessions/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch(e) { console.error("Error fetching sessions", e); }
  };

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load specific past session
  const loadSession = async (sessionId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setCurrentSessionId(sessionId);
        setMessages(data.map(m => ({
          id: m.id,
          text: m.content,
          sender: m.role,
          sources: m.sources ? JSON.parse(m.sources) : [],
          feedback_score: m.feedback_score || 0
        })));
        setSidebarOpen(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(generateSessionId());
    setMessages([
      { 
        id: "welcome", 
        text: t.welcome, 
        sender: "bot",
        feedback_score: 0
      }
    ]);
    setSidebarOpen(false);
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      if(window.confirm(t.deleteConfirm)) {
        await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
        if (sessionId === currentSessionId) startNewChat();
        fetchSessions();
      }
    } catch(err) { console.error(err); }
  };

  const handleSend = async (overrideText = null) => {
    const textToSend = overrideText && typeof overrideText === 'string' ? overrideText : inputText;
    if (!textToSend.trim() || isLoading) return;
    
    // Remove welcome message on first real interaction
    const currentMsgs = messages.filter(m => m.id !== "welcome");
    
    const userMsg = { id: Date.now(), text: textToSend, sender: "user" };
    setMessages([...currentMsgs, userMsg]);
    if (!overrideText || typeof overrideText !== 'string') setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: textToSend, 
          session_id: currentSessionId, 
          user_id: userId,
          language: lang
        })
      });

      if (response.status === 429) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: t.rateLimit,
          sender: "bot",
          feedback_score: 0
        }]);
        return;
      }

      if (!response.ok) throw new Error(t.serverError);

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: data.message_id || Date.now() + 1,
        text: data.answer,
        sender: "bot",
        sources: data.sources || [],
        feedback_score: 0
      }]);

      if (data.session_title) {
         fetchSessions();
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: t.serverError,
        sender: "bot",
        feedback_score: 0
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionSend = async () => {
    if (!suggestionText.trim()) return;
    setSuggestionSending(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: suggestionName, message: suggestionText })
      });
      if (res.ok) {
        setSuggestionSent(true);
        setSuggestionText('');
        setSuggestionName('');
        setTimeout(() => setShowSuggestion(false), 2500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSuggestionSending(false);
    }
  };

  const sendFeedback = async (messageId, score) => {
    try {
      setMessages(prev => prev.map(m => m.id === messageId ? {...m, feedback_score: score} : m));
      let note = "";
      if (score === -1) {
        note = window.prompt(t.feedbackPrompt);
      }
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, score: score, note: note || "" })
      });
    } catch(err) { console.error(err); }
  };

  const handlePrint = (messageText) => {
    const printWindow = window.open('', '_blank');
    const today = new Date().toLocaleString(lang === 'en' ? 'en-US' : (lang === 'ar' ? 'ar-IQ' : 'ckb'));
    printWindow.document.write(`
      <html dir="${t.dir}">
        <head>
          <title>${t.printDocTitle}</title>
          <style>
            body { font-family: 'NRT-Reg', sans-serif, Arial; padding: 40px; line-height: 1.8; color: #1e293b; direction: ${t.dir}; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { font-size: 24px; color: #0f172a; margin-top: 10px; }
            .content { font-size: 16px; min-height: 50vh; white-space: pre-wrap; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #64748b; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${t.printMinistry}</h1>
            <p style="color: #64748b; font-size: 14px;">${t.printDocSubtitle}</p>
          </div>
          <div class="content">
            ${messageText.replace(/\n/g, '<br/>')}
          </div>
          <div class="footer">
            ${t.printFooter}<br/>
            ${t.printDate} ${today}
          </div>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopy = async (text, id) => {
    const cleanContent = text.replace(/[*#_\[\]()]/g, '');
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cleanContent);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = cleanContent;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (error) {
          console.error(error);
        } finally {
          textArea.remove();
        }
      }
      setCopyStatus(id);
      setTimeout(() => setCopyStatus(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const renderMessageText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\[.*?\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const optionText = part.slice(1, -1);
        return (
          <button
            key={idx}
            onClick={() => handleSend(optionText)}
            className="inline-block mt-2 mb-2 mx-1 px-4 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 rounded-full transition-all text-sm font-bold shadow-sm active:scale-95"
          >
            {optionText}
          </button>
        );
      }
      return <span key={idx} className="whitespace-pre-wrap leading-relaxed inline-block">{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[#070b14] text-slate-100 font-sans selection:bg-blue-600 selection:text-white" dir={t.dir}>
      
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR - CHAT HISTORY */}
      <aside className={`fixed top-0 bottom-0 z-50 w-72 h-full bg-[#0a0f1d] border-slate-800/90 md:relative md:order-last shadow-2xl md:shadow-none flex flex-col transition-transform duration-300 ${
        t.dir === 'rtl' ? 'border-r left-0' : 'border-l right-0'
      } ${
        sidebarOpen 
          ? 'translate-x-0' 
          : (t.dir === 'rtl' ? '-translate-x-full md:translate-x-0' : 'translate-x-full md:translate-x-0')
      }`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0d1424]">
           <h2 className="text-sm font-black text-white flex items-center gap-2">
             <MessageSquare size={18} className="text-amber-400" />
             {t.chatHistory}
           </h2>
           <button className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" onClick={() => setSidebarOpen(false)}>
             <X size={20} className="stroke-[2.5]" />
           </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2 mt-2">{t.chatHistorySub}</h3>
          {sessions.length === 0 ? (
            <p className="text-xs text-center text-slate-500 mt-10">{t.noChats}</p>
          ) : (
            sessions.map(s => (
              <div 
                key={s.id} 
                onClick={() => loadSession(s.id)}
                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                  s.id === currentSessionId 
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 font-bold shadow-md shadow-blue-900/20' 
                    : 'bg-transparent border-transparent hover:bg-slate-850 hover:bg-slate-800/50 text-slate-300'
                }`}
              >
                <MessageSquare size={18} className={`${s.id === currentSessionId ? 'text-amber-400' : 'text-slate-500 group-hover:text-blue-400 transition-colors'}`} />
                <span className="flex-1 text-sm truncate">{s.title || t.newChat}</span>
                <button 
                  onClick={(e) => deleteSession(e, s.id)}
                  className="opacity-30 hover:opacity-100 text-slate-400 hover:text-rose-400 transition-all p-1"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer - Suggestion Button */}
        <div className="flex-none p-3 border-t border-slate-800/80 bg-[#0d1424]">
          <button 
            onClick={() => { setShowSuggestion(true); setSuggestionSent(false); }}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-95 text-sm"
          >
            <MessageCircle size={18} />
            {t.sendFeedbackBtn}
          </button>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#070b14] relative">
        
        {/* Header */}
        <header className="flex-none bg-[#0a0f1d]/95 backdrop-blur-xl z-20 text-white shadow-2xl border-b border-amber-500/30">
          <div className="px-4 py-3.5 md:px-6 md:py-4 flex items-center justify-between gap-3">
            
            {/* Branding */}
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full blur opacity-40"></div>
                <img src={logoImage} alt="KRG Logo" className="relative w-11 h-11 md:w-13 md:h-13 object-cover rounded-full border-2 border-amber-400 shadow-xl object-center bg-slate-900" />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[7px] md:text-[8px] font-black px-1.5 py-0.2 rounded-full border border-blue-400 shadow-sm flex items-center gap-0.5 tracking-wider whitespace-nowrap">
                  <ShieldCheck size={9} /> {t.official}
                </span>
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-[17px] md:text-xl font-bold tracking-tight flex items-center gap-1.5 md:gap-2 text-white whitespace-nowrap">
                  <Crown size={18} className="text-amber-400 flex-shrink-0" />
                  {t.title}
                </h1>
                <span className="flex text-[10px] md:text-xs text-slate-300 font-medium tracking-wide items-center gap-1.5 mt-0.5">
                  <ShieldCheck size={12} className="text-amber-400 opacity-90" /> {t.subtitle}
                </span>
              </div>
            </div>

            {/* Language Switcher & Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              
              {/* Language Switcher Selector */}
              <div className="flex items-center bg-[#070b14] p-1 rounded-xl border border-slate-700/80 shadow-inner">
                {[
                  { code: 'ku', label: 'کوردی', flag: '☀️' },
                  { code: 'ar', label: 'العربية', flag: '🇮🇶' },
                  { code: 'en', label: 'English', flag: '🇬🇧' },
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => handleLanguageChange(item.code)}
                    className={`flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      lang === item.code
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-xs">{item.flag}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden uppercase">{item.code}</span>
                  </button>
                ))}
              </div>

              {/* New Chat Button (Desktop & Mobile) */}
              <button 
                onClick={startNewChat} 
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md active:scale-95"
                title={t.newChat}
              >
                <PlusCircle size={16} />
                <span>{t.newChat}</span>
              </button>

              {/* Mobile Actions */}
              <button 
                onClick={startNewChat} 
                className="sm:hidden p-2 text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md active:scale-95"
                title={t.newChat}
              >
                <PlusCircle size={18} />
              </button>
              <button 
                className="p-2 text-slate-300 bg-slate-800/80 rounded-xl hover:bg-slate-700 transition-all md:hidden border border-slate-700" 
                onClick={() => setSidebarOpen(true)}
                title={t.chatHistory}
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Messages Container */}
        <main id="scroll-container" className="flex-1 overflow-y-auto scroll-smooth z-10 p-3 md:p-8 bg-[#070b14]">
          <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-6 pt-4">
            
            {messages.map(msg => (
              <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-message`}>
                <div className={`max-w-[98%] md:max-w-[85%] p-4 md:p-5 rounded-2xl flex gap-3 md:gap-4 shadow-xl relative group ${
                  msg.sender === 'user' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-400/20 shadow-blue-950/40' 
                  : 'bg-[#0f172a] border border-slate-800 text-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
                }`}>
                  <div className="mt-1 flex-shrink-0">
                    {msg.sender === 'user' ? (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-amber-300 border border-white/20 shadow-inner">
                        <User size={20} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-amber-500/30 shadow-md overflow-hidden">
                         <img src={logoImage} alt="AI" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 flex-1 min-w-0">
                    <div className="leading-loose text-[16px] md:text-base font-normal pt-1 break-words text-slate-100">
                      {renderMessageText(msg.text)}
                    </div>
                    
                    {/* Bot Actions Footer */}
                    {msg.sender === 'bot' && msg.id !== "welcome" && (
                      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        {/* Feedback & Print Group */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-1.5 bg-[#0b1120] p-1.5 rounded-xl border border-slate-800 shadow-inner">
                               <button 
                                 onClick={() => sendFeedback(msg.id, 1)}
                                 className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${msg.feedback_score === 1 ? 'bg-emerald-950 text-emerald-400' : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'}`}
                                 title={t.goodFeedback}
                               >
                                 <ThumbsUp size={16} className={msg.feedback_score === 1 ? "fill-current" : ""} />
                               </button>
                               <div className="w-[1px] h-3.5 bg-slate-800"></div>
                               <button 
                                 onClick={() => sendFeedback(msg.id, -1)}
                                 className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${msg.feedback_score === -1 ? 'bg-rose-950 text-rose-400' : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'}`}
                                 title={t.badFeedback}
                               >
                                 <ThumbsDown size={16} className={msg.feedback_score === -1 ? "fill-current" : ""} />
                               </button>
                            </div>

                            <button 
                              onClick={() => handlePrint(msg.text)}
                              className="flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-[#0b1120] hover:bg-slate-800 py-2 px-3.5 rounded-xl transition-colors border border-slate-800 shadow-sm"
                            >
                              <Printer size={14} className="text-amber-400" /> {t.pdf}
                            </button>

                            <button 
                              onClick={() => handleCopy(msg.text, msg.id)}
                              className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl transition-all border shadow-sm ${
                                copyStatus === msg.id 
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                                : 'bg-[#0b1120] text-slate-200 hover:bg-slate-800 border-slate-800'
                              }`}
                            >
                              {copyStatus === msg.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-amber-400" />}
                              {copyStatus === msg.id ? t.copied : t.copy}
                            </button>
                        </div>

                        {/* Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="w-full mt-2">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                               <Crown size={12} className="text-amber-400" />
                               {t.sourcesTitle}
                             </p>
                             <ul className="space-y-1.5">
                               {msg.sources.map((src, idx) => (
                                 <li key={idx}>
                                   <button 
                                     onClick={() => setSelectedSource(src)}
                                     className="w-full flex items-center gap-2 bg-[#0b1120] hover:bg-[#131d33] text-slate-200 hover:text-amber-300 text-[12px] font-bold py-2 px-3 rounded-xl transition-all border border-slate-800 hover:border-amber-500/40 group text-start"
                                   >
                                     <div className="w-5 h-5 rounded-md bg-slate-900 shadow-sm flex items-center justify-center text-[9px] text-amber-400 border border-slate-800 group-hover:bg-amber-400 group-hover:text-black transition-colors">
                                       {idx + 1}
                                     </div>
                                     <span className="flex-1 truncate">{src.title}</span>
                                     <Info size={14} className="text-amber-400 opacity-60 group-hover:opacity-100" />
                                   </button>
                                 </li>
                               ))}
                             </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex w-full justify-start animate-pulse">
                <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
                   <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border border-amber-500/30">
                      <img src={logoImage} alt="AI" className="w-full h-full object-cover opacity-60" />
                   </div>
                   <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                   </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2 w-full" />
          </div>
        </main>

        {/* Input Footer */}
        <footer className="flex-none bg-[#0a0f1d]/95 backdrop-blur-xl z-20 border-t border-slate-800/80 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] p-3 md:p-6 pb-5 md:pb-7">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                className={`w-full h-13 md:h-16 bg-[#0f172a] border-2 border-slate-700/80 rounded-2xl md:rounded-full focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-white font-medium placeholder-slate-400 text-base transition-all shadow-inner ${
                  t.dir === 'rtl' ? 'pr-5 pl-14 md:pl-20' : 'pl-5 pr-14 md:pr-20'
                }`}
                placeholder={t.inputPlaceholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={() => handleSend()}
                className={`absolute top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-full flex items-center justify-center transition-all shadow-lg shadow-blue-900/30 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${
                  t.dir === 'rtl' ? 'left-2' : 'right-2'
                }`}
                disabled={!inputText.trim()}
              >
                <Send size={18} className={t.dir === 'rtl' ? 'transform -rotate-90 -translate-x-0.5' : ''} />
              </button>
            </div>
            <div className="text-center text-[10px] md:text-xs font-semibold text-slate-400 mt-2.5 md:mt-3 px-2">
              {t.disclaimer}
            </div>
          </div>
        </footer>
      </div>

      {/* Source Details Modal */}
      {selectedSource && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedSource(null)}></div>
          
          <div className="relative bg-[#0f172a] text-slate-100 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-700 animate-in zoom-in duration-300" dir={t.dir}>
            <div className="flex-none bg-[#0a0f1d] p-4 md:p-6 text-white flex justify-between items-center border-b border-amber-500/30">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="bg-amber-500/10 p-2 rounded-xl hidden sm:block border border-amber-500/30">
                  <ShieldCheck className="text-amber-400" size={20} />
                </div>
                <div>
                  <h2 className="text-sm md:text-xl font-bold tracking-tight leading-tight text-white">{selectedSource.title}</h2>
                  <p className="text-[10px] md:text-xs text-amber-400 font-bold uppercase tracking-widest mt-0.5 md:mt-1">{t.department} {selectedSource.department}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSource(null)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-all text-slate-300 hover:text-white font-bold"
              >✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#070b14]">
              <div className="bg-[#0f172a] p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-inner border border-slate-800 leading-relaxed text-slate-200 text-sm md:text-base font-normal">
                {selectedSource.content
                  .replace(/(پرسیار:|سؤال:|Question:)/gi, '\n$1')
                  .replace(/(وەڵام:|إجابة:|Answer:)/gi, '\n$1')
                  .split('\n').filter(line => line.trim())
                  .map((line, i) => (
                  <div key={i} className="flex gap-3 md:gap-4 mb-4 last:mb-0 group/line hover:bg-slate-800/40 p-2 rounded-xl transition-colors">
                    <div className="mt-2 w-2 h-2 rounded-full bg-amber-400 ring-4 ring-amber-400/10 flex-shrink-0" />
                    <span className={`flex-1 leading-loose ${line.includes(':') ? 'text-amber-300 font-bold text-base' : 'text-slate-200'}`}>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-none p-4 md:p-6 bg-[#0a0f1d] border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedSource(null)}
                className="bg-blue-600 text-white font-bold px-6 py-2 md:px-8 md:py-2.5 rounded-xl hover:bg-blue-500 transition-all shadow-lg active:scale-95 text-sm md:text-base w-full sm:w-auto"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestion Modal */}
      {showSuggestion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 text-slate-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300" dir={t.dir}>
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle size={22} /> {t.suggestionTitle}
              </h3>
              <button onClick={() => setShowSuggestion(false)} className="text-white/80 hover:text-white">
                <X size={22} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {suggestionSent ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 bg-emerald-950 text-emerald-400 border border-emerald-700/50 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <ShieldCheck size={32} />
                  </div>
                  <p className="text-lg font-bold text-white">{t.suggestionSuccess}</p>
                  <p className="text-sm text-slate-400">{t.suggestionThanks}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.suggestionNameLabel}</label>
                    <input 
                      type="text" 
                      value={suggestionName}
                      onChange={(e) => setSuggestionName(e.target.value)}
                      placeholder={t.suggestionNamePlaceholder}
                      className="w-full p-3 bg-[#070b14] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.suggestionTextLabel}</label>
                    <textarea 
                      rows="4"
                      value={suggestionText}
                      onChange={(e) => setSuggestionText(e.target.value)}
                      placeholder={t.suggestionTextPlaceholder}
                      className="w-full p-3 bg-[#070b14] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                    ></textarea>
                  </div>
                  <button 
                    onClick={handleSuggestionSend}
                    disabled={suggestionSending || !suggestionText.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {suggestionSending ? t.suggestionSending : t.suggestionSubmit}
                    <Send size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp;
