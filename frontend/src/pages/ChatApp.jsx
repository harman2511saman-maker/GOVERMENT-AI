import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, User, Info, ShieldCheck, MessageSquare, Plus, 
  ThumbsUp, ThumbsDown, Printer, Menu, X, Trash2, MessageCircle, 
  Copy, Check, Globe, Sun, Moon, ChevronDown 
} from 'lucide-react';
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
  
  // Theme State: 'dark' or 'light'
  const [theme, setTheme] = useState(() => localStorage.getItem('gov_theme') || 'dark');
  const isDark = theme === 'dark';

  // Language State: 'ku' (Kurdish), 'ar' (Arabic), 'en' (English)
  const [lang, setLang] = useState(() => localStorage.getItem('gov_lang') || 'ku');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);

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
  const [copyStatus, setCopyStatus] = useState(null);

  // Sync theme
  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('gov_theme', nextTheme);
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#070b14';
      document.body.style.color = '#f8fafc';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  }, [isDark]);

  // Sync language
  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    setLangDropdownOpen(false);
    localStorage.setItem('gov_lang', newLang);
    document.documentElement.dir = translations[newLang].dir;
    document.documentElement.lang = newLang;

    // Update welcome message if conversation hasn't started yet
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load past session
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
            className={`inline-block mt-2 mb-2 mx-1 px-4 py-1.5 rounded-full transition-all text-sm font-bold shadow-sm active:scale-95 ${
              isDark 
                ? 'bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40' 
                : 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200'
            }`}
          >
            {optionText}
          </button>
        );
      }
      return <span key={idx} className="whitespace-pre-wrap leading-relaxed inline-block">{part}</span>;
    });
  };

  // Pure language names without any emoji flags or letters like IQ / GB
  const languagesList = [
    { code: 'ku', label: 'کوردی' },
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
  ];

  const currentLangObj = languagesList.find(l => l.code === lang) || languagesList[0];

  return (
    <div 
      className={`fixed inset-0 flex overflow-hidden font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#070b14] text-slate-100' : 'bg-[#f8fafc] text-slate-800'
      }`} 
      dir={t.dir}
    >
      
      {/* Mobile-Only Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* SIDEBAR - CHAT HISTORY
          - On Mobile: slide-in drawer controlled by sidebarOpen
          - On Laptop/Desktop: permanent docked sidebar without hamburger button
      */}
      <aside 
        className={`fixed top-0 bottom-0 z-50 w-72 md:w-80 h-full flex flex-col transition-all duration-300 shadow-2xl md:shadow-none md:relative md:translate-x-0 ${
          isDark 
            ? 'bg-[#0a0f1d] border-slate-800 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-800'
        } ${
          t.dir === 'rtl' ? 'border-r right-0 md:order-last' : 'border-l left-0 md:order-first'
        } ${
          sidebarOpen 
            ? 'translate-x-0' 
            : (t.dir === 'rtl' ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')
        }`}
      >
        
        {/* Sidebar Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#0d1424] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
           <h2 className="text-sm font-black flex items-center gap-2">
             <MessageSquare size={18} className={isDark ? "text-amber-400" : "text-blue-600"} />
             {t.chatHistory}
           </h2>
           {/* Close Button - ONLY on mobile */}
           <button 
             className={`p-2 rounded-xl transition-colors md:hidden ${
               isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
             }`} 
             onClick={() => setSidebarOpen(false)}
             title={t.close}
           >
             <X size={20} />
           </button>
        </div>

        {/* PRIMARY "NEW CHAT" BUTTON - INSIDE SIDEBAR ONLY */}
        <div className="p-3 pb-1">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
          >
            <Plus size={18} className="stroke-[2.5]" />
            <span>{t.newChat}</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-2 mt-2 mb-2">
            {t.chatHistorySub}
          </h3>

          {sessions.length === 0 ? (
            <p className="text-xs text-center text-slate-500 mt-12">{t.noChats}</p>
          ) : (
            sessions.map(s => (
              <div 
                key={s.id} 
                onClick={() => loadSession(s.id)}
                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                  s.id === currentSessionId 
                    ? (isDark 
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 font-bold shadow-md' 
                        : 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm')
                    : (isDark 
                        ? 'bg-transparent border-transparent hover:bg-slate-800/60 text-slate-300' 
                        : 'bg-transparent border-transparent hover:bg-slate-100 text-slate-700')
                }`}
              >
                <MessageSquare size={16} className={`${
                  s.id === currentSessionId 
                    ? (isDark ? 'text-amber-400' : 'text-blue-600') 
                    : 'text-slate-400 group-hover:text-blue-500 transition-colors'
                }`} />
                <span className="flex-1 text-sm truncate">{s.title || t.newChat}</span>
                <button 
                  onClick={(e) => deleteSession(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all p-1"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer - Suggestion Button */}
        <div className={`flex-none p-3 border-t ${
          isDark ? 'border-slate-800 bg-[#0d1424]' : 'border-slate-200 bg-slate-50'
        }`}>
          <button 
            onClick={() => { setShowSuggestion(true); setSuggestionSent(false); }}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-95 text-xs sm:text-sm border border-slate-700"
          >
            <MessageCircle size={17} />
            {t.sendFeedbackBtn}
          </button>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* RESPONSIVE HEADER */}
        <header className={`flex-none z-20 transition-colors duration-300 shadow-md ${
          isDark 
            ? 'bg-[#0a0f1d]/95 backdrop-blur-xl border-b border-slate-800/80 text-white' 
            : 'bg-white/95 backdrop-blur-xl border-b border-slate-200 text-slate-900'
        }`}>
          <div className="max-w-7xl mx-auto px-3 py-2.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Branding + Mobile Hamburger Button */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              
              {/* 3-LINES HAMBURGER MENU BUTTON - ONLY FOR MOBILE (md:hidden) */}
              <button 
                onClick={() => setSidebarOpen(true)}
                className={`p-2 rounded-xl transition-all flex items-center justify-center flex-shrink-0 border shadow-sm md:hidden ${
                  isDark 
                    ? 'bg-[#131d33] hover:bg-[#1a2744] border-slate-700 text-amber-400' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-blue-700'
                }`}
                title={t.chatHistory}
                aria-label="Toggle chat history"
              >
                <Menu size={20} className="stroke-[2.5]" />
              </button>

              {/* Logo */}
              <div className="relative flex-shrink-0">
                <img 
                  src={logoImage} 
                  alt="KRG Logo" 
                  className={`w-9 h-9 sm:w-11 sm:h-11 object-cover rounded-full border-2 shadow-md ${
                    isDark ? 'border-amber-400/80 bg-slate-900' : 'border-blue-600 bg-white'
                  }`} 
                />
                <span className="hidden sm:flex absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.2 rounded-full border border-blue-400 shadow-sm items-center gap-0.5 tracking-wider whitespace-nowrap">
                  <ShieldCheck size={8} /> {t.official}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight truncate leading-tight">
                  {t.title}
                </h1>
                <span className={`hidden sm:flex text-[11px] md:text-xs font-medium items-center gap-1 mt-0.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <ShieldCheck size={12} className={isDark ? "text-amber-400" : "text-blue-600"} />
                  <span className="truncate">{t.subtitle}</span>
                </span>
              </div>
            </div>

            {/* Header Right Controls: Theme Toggle + Language Dropdown (NO "New Chat" button here!) */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              
              {/* THEME TOGGLE (Dark / Light Mode) */}
              <button
                onClick={toggleTheme}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center shadow-sm ${
                  isDark 
                    ? 'bg-[#131d33] hover:bg-[#1a2744] border-slate-700 text-amber-400 hover:text-amber-300' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
                }`}
                title={isDark ? t.lightMode : t.darkMode}
                aria-label="Toggle Dark / Light theme"
              >
                {isDark ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              {/* LANGUAGE DROPDOWN (Clean names only, no flag icons/letters) */}
              <div className="relative" ref={langDropdownRef}>
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                    isDark 
                      ? 'bg-[#131d33] hover:bg-[#1a2744] border-slate-700 text-slate-100' 
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                  aria-expanded={langDropdownOpen}
                >
                  <Globe size={15} className={isDark ? "text-amber-400" : "text-blue-600"} />
                  <span className="font-bold">{currentLangObj.label}</span>
                  <ChevronDown size={14} className={`opacity-70 transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {langDropdownOpen && (
                  <div className={`absolute top-full mt-2 w-36 rounded-2xl shadow-2xl border p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    t.dir === 'rtl' ? 'left-0' : 'right-0'
                  } ${
                    isDark ? 'bg-[#0f172a] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    {languagesList.map((item) => (
                      <button
                        key={item.code}
                        onClick={() => handleLanguageChange(item.code)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          lang === item.code 
                            ? 'bg-blue-600 text-white'
                            : (isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900')
                        }`}
                      >
                        <span>{item.label}</span>
                        {lang === item.code && <Check size={14} className="stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </header>

        {/* CHAT MESSAGES CONTAINER */}
        <main id="scroll-container" className={`flex-1 overflow-y-auto scroll-smooth z-10 p-3 sm:p-5 md:p-8 transition-colors duration-300 ${
          isDark ? 'bg-[#070b14]' : 'bg-[#f8fafc]'
        }`}>
          <div className="max-w-4xl mx-auto flex flex-col gap-5 sm:gap-6 pb-6 pt-2">
            
            {messages.map(msg => (
              <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-message`}>
                <div className={`max-w-[98%] sm:max-w-[90%] md:max-w-[85%] p-4 sm:p-5 rounded-2xl flex gap-3 sm:gap-4 shadow-md relative group transition-all ${
                  msg.sender === 'user' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-400/20 shadow-blue-900/20' 
                  : (isDark 
                      ? 'bg-[#0f172a] border border-slate-800 text-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
                      : 'bg-white border border-slate-200 text-slate-800 shadow-[0_4px_25px_rgba(0,0,0,0.04)]')
                }`}>
                  <div className="mt-1 flex-shrink-0">
                    {msg.sender === 'user' ? (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-inner">
                        <User size={18} className="text-white" />
                      </div>
                    ) : (
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border shadow-md overflow-hidden ${
                        isDark ? 'bg-slate-900 border-amber-500/30' : 'bg-slate-50 border-blue-200'
                      }`}>
                         <img src={logoImage} alt="AI" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                    <div className="leading-relaxed text-[15px] sm:text-base font-normal pt-0.5 break-words">
                      {renderMessageText(msg.text)}
                    </div>
                    
                    {/* Bot Actions Footer */}
                    {msg.sender === 'bot' && msg.id !== "welcome" && (
                      <div className={`mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2.5 ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                      }`}>
                        {/* Feedback & Tools */}
                        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                            <div className={`flex items-center gap-1 p-1 rounded-xl border shadow-inner ${
                              isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                               <button 
                                 onClick={() => sendFeedback(msg.id, 1)}
                                 className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${
                                   msg.feedback_score === 1 
                                     ? (isDark ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                     : (isDark ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-200')
                                 }`}
                                 title={t.goodFeedback}
                               >
                                 <ThumbsUp size={15} className={msg.feedback_score === 1 ? "fill-current" : ""} />
                               </button>
                               <div className={`w-[1px] h-3.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                               <button 
                                 onClick={() => sendFeedback(msg.id, -1)}
                                 className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${
                                   msg.feedback_score === -1 
                                     ? (isDark ? 'bg-rose-950 text-rose-400' : 'bg-rose-100 text-rose-700')
                                     : (isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-200')
                                 }`}
                                 title={t.badFeedback}
                               >
                                 <ThumbsDown size={15} className={msg.feedback_score === -1 ? "fill-current" : ""} />
                               </button>
                            </div>

                            <button 
                              onClick={() => handlePrint(msg.text)}
                              className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-xl transition-colors border shadow-sm ${
                                isDark 
                                  ? 'bg-[#0b1120] hover:bg-slate-800 text-slate-200 border-slate-800' 
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              <Printer size={13} className={isDark ? "text-amber-400" : "text-blue-600"} /> {t.pdf}
                            </button>

                            <button 
                              onClick={() => handleCopy(msg.text, msg.id)}
                              className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-xl transition-all border shadow-sm ${
                                copyStatus === msg.id 
                                  ? (isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-300')
                                  : (isDark ? 'bg-[#0b1120] text-slate-200 hover:bg-slate-800 border-slate-800' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200')
                              }`}
                            >
                              {copyStatus === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className={isDark ? "text-amber-400" : "text-blue-600"} />}
                              {copyStatus === msg.id ? t.copied : t.copy}
                            </button>
                        </div>

                        {/* Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="w-full mt-2">
                             <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${
                               isDark ? 'text-slate-400' : 'text-slate-500'
                             }`}>
                               <Info size={13} className={isDark ? "text-amber-400" : "text-blue-600"} />
                               {t.sourcesTitle}
                             </p>
                             <ul className="space-y-1.5">
                               {msg.sources.map((src, idx) => (
                                 <li key={idx}>
                                   <button 
                                     onClick={() => setSelectedSource(src)}
                                     className={`w-full flex items-center gap-2 py-1.5 px-3 rounded-xl transition-all border text-[12px] font-bold group text-start ${
                                       isDark 
                                         ? 'bg-[#0b1120] hover:bg-[#131d33] text-slate-200 hover:text-amber-300 border-slate-800 hover:border-amber-500/40' 
                                         : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-300'
                                     }`}
                                   >
                                     <div className={`w-5 h-5 rounded-md shadow-sm flex items-center justify-center text-[9px] font-bold border transition-colors ${
                                       isDark 
                                         ? 'bg-slate-900 text-amber-400 border-slate-800 group-hover:bg-amber-400 group-hover:text-black' 
                                         : 'bg-white text-blue-600 border-slate-200 group-hover:bg-blue-600 group-hover:text-white'
                                     }`}>
                                       {idx + 1}
                                     </div>
                                     <span className="flex-1 truncate">{src.title}</span>
                                     <Info size={13} className="opacity-60 group-hover:opacity-100" />
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
                <div className={`border p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 shadow-md ${
                  isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                   <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                      <img src={logoImage} alt="AI" className="w-full h-full object-cover opacity-60" />
                   </div>
                   <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                   </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2 w-full" />
          </div>
        </main>

        {/* INPUT FOOTER */}
        <footer className={`flex-none z-20 border-t transition-colors duration-300 p-3 sm:p-5 pb-5 sm:pb-7 ${
          isDark 
            ? 'bg-[#0a0f1d]/95 backdrop-blur-xl border-slate-800/80 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]' 
            : 'bg-white/95 backdrop-blur-xl border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]'
        }`}>
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                className={`w-full h-12 sm:h-14 md:h-15 border-2 rounded-2xl md:rounded-full focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-sm sm:text-base transition-all shadow-inner ${
                  isDark 
                    ? 'bg-[#0f172a] border-slate-700/80 text-white placeholder-slate-400' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                } ${
                  t.dir === 'rtl' ? 'pr-4 sm:pr-5 pl-13 sm:pl-16' : 'pl-4 sm:pl-5 pr-13 sm:pr-16'
                }`}
                placeholder={t.inputPlaceholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={() => handleSend()}
                className={`absolute top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white w-9 h-9 sm:w-11 sm:h-11 rounded-xl md:rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${
                  t.dir === 'rtl' ? 'left-1.5 sm:left-2' : 'right-1.5 sm:right-2'
                }`}
                disabled={!inputText.trim()}
              >
                <Send size={16} className={t.dir === 'rtl' ? 'transform -rotate-90 -translate-x-0.5' : ''} />
              </button>
            </div>
            <div className="text-center text-[10px] sm:text-xs font-semibold text-slate-400 mt-2 sm:mt-2.5 px-2">
              {t.disclaimer}
            </div>
          </div>
        </footer>
      </div>

      {/* Source Details Modal */}
      {selectedSource && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedSource(null)}></div>
          
          <div className={`relative w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border animate-in zoom-in duration-300 ${
            isDark ? 'bg-[#0f172a] text-slate-100 border-slate-700' : 'bg-white text-slate-800 border-slate-200'
          }`} dir={t.dir}>
            <div className={`flex-none p-4 sm:p-5 flex justify-between items-center border-b ${
              isDark ? 'bg-[#0a0f1d] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600/10 p-2 rounded-xl text-blue-600 hidden sm:block">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-bold tracking-tight leading-tight">{selectedSource.title}</h2>
                  <p className="text-[10px] sm:text-xs text-blue-500 font-bold uppercase tracking-widest mt-0.5">{t.department} {selectedSource.department}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSource(null)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all font-bold ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >✕</button>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${isDark ? 'bg-[#070b14]' : 'bg-slate-50/50'}`}>
              <div className={`p-4 sm:p-6 rounded-2xl shadow-inner border leading-relaxed text-sm sm:text-base ${
                isDark ? 'bg-[#0f172a] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                {selectedSource.content
                  .replace(/(پرسیار:|سؤال:|Question:)/gi, '\n$1')
                  .replace(/(وەڵام:|إجابة:|Answer:)/gi, '\n$1')
                  .split('\n').filter(line => line.trim())
                  .map((line, i) => (
                  <div key={i} className={`flex gap-3 mb-3.5 last:mb-0 p-2 rounded-xl transition-colors ${
                    isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                  }`}>
                    <div className="mt-2 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/10 flex-shrink-0" />
                    <span className={`flex-1 leading-loose ${line.includes(':') ? 'text-blue-500 font-bold' : ''}`}>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`flex-none p-4 sm:p-5 border-t flex justify-end ${
              isDark ? 'bg-[#0a0f1d] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button 
                onClick={() => setSelectedSource(null)}
                className="bg-blue-600 text-white font-bold px-6 py-2 rounded-xl hover:bg-blue-500 transition-all shadow-md active:scale-95 text-sm"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestion Modal */}
      {showSuggestion && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border animate-in zoom-in duration-300 ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`} dir={t.dir}>
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <MessageCircle size={20} /> {t.suggestionTitle}
              </h3>
              <button onClick={() => setShowSuggestion(false)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {suggestionSent ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <ShieldCheck size={28} />
                  </div>
                  <p className="text-base font-bold">{t.suggestionSuccess}</p>
                  <p className="text-xs text-slate-400">{t.suggestionThanks}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">{t.suggestionNameLabel}</label>
                    <input 
                      type="text" 
                      value={suggestionName}
                      onChange={(e) => setSuggestionName(e.target.value)}
                      placeholder={t.suggestionNamePlaceholder}
                      className={`w-full p-2.5 sm:p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm ${
                        isDark ? 'bg-[#070b14] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">{t.suggestionTextLabel}</label>
                    <textarea 
                      rows="4"
                      value={suggestionText}
                      onChange={(e) => setSuggestionText(e.target.value)}
                      placeholder={t.suggestionTextPlaceholder}
                      className={`w-full p-2.5 sm:p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none text-sm ${
                        isDark ? 'bg-[#070b14] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    ></textarea>
                  </div>
                  <button 
                    onClick={handleSuggestionSend}
                    disabled={suggestionSending || !suggestionText.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 sm:py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                  >
                    {suggestionSending ? t.suggestionSending : t.suggestionSubmit}
                    <Send size={15} />
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
