import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Crown, Info, ShieldCheck, MessageSquare, PlusCircle, ThumbsUp, ThumbsDown, Printer, Menu, X, Trash2, MessageCircle, Copy, Check, Share2 } from 'lucide-react';
import logoImage from '../assets/images.jpg';
import bgVideo from '../assets/LOGO.mp4';
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
  const [messages, setMessages] = useState([
    { 
      id: "welcome", 
      text: "بەخێربێیت بۆ ناوەندی زانیاری زیرەک. ئەم پلاتفۆرمە یاریدەدەرێکی فەرمییە بۆ وەڵامدانەوەی پرسیارەکانت سەبارەت بە ڕێنمایی و خزمەتگوزارییەکانی حکومەتی هەرێمی کوردستان. چۆن دەتوانم ئەمڕۆ یارمەتیت بدەم؟", 
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
  }, []);

  const scrollToBottom = () => {
    const container = document.getElementById('scroll-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSession = async (sessionId) => {
    try {
      setCurrentSessionId(sessionId);
      setSidebarOpen(false); // close mobile sidebar
      setMessages([]); // clear current
      setIsLoading(true);
      const res = await fetch(`/api/sessions/history/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setMessages(data.map(m => ({
            id: m.id,
            text: m.content,
            sender: m.role,
            feedback_score: m.feedback_score,
            sources: [] // Sources aren't saved in DB currently
          })));
        } else {
          startNewChat();
        }
      }
    } catch(e) {
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
        text: "بەخێربێیت بۆ ناوەندی زانیاری زیرەک. ئەم پلاتفۆرمە یاریدەدەرێکی فەرمییە بۆ وەڵامدانەوەی پرسیارەکانت سەبارەت بە ڕێنمایی و خزمەتگوزارییەکانی حکومەتی هەرێمی کوردستان. چۆن دەتوانم ئەمڕۆ یارمەتیت بدەم؟", 
        sender: "bot",
        feedback_score: 0
      }
    ]);
    setSidebarOpen(false);
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      if(window.confirm('دڵنیایت لە سڕینەوەی ئەم چاتە؟')) {
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
        body: JSON.stringify({ message: textToSend, session_id: currentSessionId, user_id: userId })
      });

      if (response.status === 429) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: "تکایە کەمێک چاوەڕێ بکە، چرکەساتێکی تر دەتوانیت پرسیار بکەیتەوە.",
          sender: "bot",
          feedback_score: 0
        }]);
        return;
      }

      if (!response.ok) throw new Error("سێرڤەر وەڵامی نەبوو");

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: data.message_id || Date.now() + 1,
        text: data.answer,
        sender: "bot",
        sources: data.sources || [],
        feedback_score: 0
      }]);

      if (data.session_title) {
         fetchSessions(); // Refresh list to get the auto-generated title
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "ببورە، ئێستا کێشەیەک لە پەیوەندی هەیە. تکایە دواتر هەوڵ بدەرەوە.",
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
        setTimeout(() => setShowSuggestion(false), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuggestionSending(false);
    }
  };

  const sendFeedback = async (messageId, score) => {
    if(!messageId || messageId === "welcome") return;
    try {
      setMessages(prev => prev.map(m => m.id === messageId ? {...m, feedback_score: score} : m));
      let note = "";
      if (score === -1) {
        note = window.prompt("تکایە پێمان بڵێ بۆچی ئەم وەڵامە گونجاو نەبوو؟ (ئەمە یارمەتیمان دەدات بۆ باشترکردنی سیستەمەکە)");
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
    const today = new Date().toLocaleString('en-GB');
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>بەڵگەنامەی فەرمی - حکومەتی هەرێمی کوردستان</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.8; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { font-size: 24px; color: #0f172a; margin-top: 10px; }
            .content { font-size: 16px; min-height: 50vh; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #64748b; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>وەزارەتی ناوخۆ - سیستەمی زیرەکی دەستکرد</h1>
            <p style="color: #64748b; font-size: 14px;">بەڵگەنامەی زانیاری ڕێنماییەکان</p>
          </div>
          <div class="content">
            ${messageText.replace(/\n/g, '<br/>')}
          </div>
          <div class="footer">
            ئەم وەڵامە لەلایەن ڕاوێژکاری ژیری دەستکردەوە دروستکراوە بەپێی ڕێنماییەکانی سیستەم.<br/>
            ڕێکەوتی دەرکردن: ${today}
          </div>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopy = (text, id) => {
    // Clean text from markdown for cleaner clipboard content
    const cleanContent = text.replace(/[*#_\[\]()]/g, '');
    navigator.clipboard.writeText(cleanContent);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
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
            className="inline-block mt-2 mb-2 ml-2 px-4 py-2 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white border border-secondary/30 rounded-full transition-all text-sm font-bold shadow-sm"
          >
            {optionText}
          </button>
        );
      }
      return <span key={idx} className="whitespace-pre-wrap leading-relaxed inline-block">{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-bg font-sans bg-[#f4f7fb]" dir="rtl">
      
      {/* Video Background Layer */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 mx-auto w-full max-w-md md:max-w-xl lg:max-w-2xl h-full object-contain object-center scale-[1.1] md:scale-100 opacity-15 pointer-events-none mix-blend-multiply z-0 -translate-x-2 md:-translate-x-4"
      >
        <source src={bgVideo} type="video/mp4" />
      </video>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-primary_dark/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* LEFT SIDEBAR - CHAT HISTORY */}
      <aside className={`absolute top-0 left-0 bottom-0 md:relative md:order-last z-50 w-72 h-full bg-white border-r border-gray-200 shadow-2xl md:shadow-none flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} `}>
        
        {/* Sidebar Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
           <h2 className="text-sm font-black text-primary_dark flex items-center gap-2">
             <MessageSquare size={18} className="text-secondary" />
             مێژووی چاتەکان
           </h2>
           <button className="md:hidden p-2 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setSidebarOpen(false)}>
             <X size={20} className="stroke-[2.5]" />
           </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-2 mt-2">مێژووی چاتەکان (٣٠ ڕۆژ)</h3>
          {sessions.length === 0 ? (
            <p className="text-xs text-center text-gray-400 mt-10">هیچ چاتێک بوونی نییە</p>
          ) : (
            sessions.map(s => (
              <div 
                key={s.id} 
                onClick={() => loadSession(s.id)}
                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${s.id === currentSessionId ? 'bg-primary/5 border-primary/20 text-primary_dark' : 'bg-transparent border-transparent hover:bg-gray-50 text-gray-700'}`}
              >
                <MessageSquare size={18} className={`${s.id === currentSessionId ? 'text-secondary' : 'text-gray-400 group-hover:text-primary transition-colors'}`} />
                <span className="flex-1 text-sm font-semibold truncate">{s.title || 'چاتی نوێ'}</span>
                <button 
                  onClick={(e) => deleteSession(e, s.id)}
                  className="opacity-30 hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer - Suggestion Button */}
        <div className="flex-none p-3 border-t border-gray-100 bg-slate-50">
          <button 
            onClick={() => { setShowSuggestion(true); setSuggestionSent(false); }}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 text-sm"
          >
            <MessageCircle size={16} /> ناردنی پێشنیار
          </button>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative bg-transparent">
        
        {/* Header */}
        <header className="flex-none glass-nav-dark z-20 text-white shadow-md border-b-4 border-secondary">
          <div className="px-3 py-2.5 md:px-6 md:py-4 flex items-center justify-between gap-2">
            {/* Right Side: Branding */}
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-yellow-200 rounded-full blur opacity-40"></div>
                <img src={logoImage} alt="لۆگۆی حکومەت" className="relative w-9 h-9 md:w-14 md:h-14 object-cover rounded-full border-2 border-secondary/80 shadow-lg object-center bg-white" />
                <span className="absolute -bottom-1.5 md:-bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[6px] md:text-[9px] font-black px-1 md:px-2 py-0.5 rounded-full border border-white shadow-sm flex items-center gap-0.5 tracking-wider whitespace-nowrap">
                  <ShieldCheck size={8} className="md:w-[10px] md:h-[10px]" /> فەرمی
                </span>
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-[13px] md:text-xl font-bold tracking-tight flex items-center gap-1 md:gap-2 text-white whitespace-nowrap">
                  <Crown size={14} className="text-secondary flex-shrink-0 md:w-[18px] md:h-[18px]" />
                  ناوەندی زانیاری زیرەک
                </h1>
                <span className="hidden sm:flex text-[9px] md:text-xs text-gray-300 font-medium tracking-wide items-center gap-1.5 mt-0.5 opacity-70">
                  <ShieldCheck size={12} className="text-secondary opacity-80" /> پلاتفۆرمی فەرمی وەڵامدانەوەی هاوڵاتی
                </span>
              </div>
            </div>

            {/* Left Side: Mobile Actions */}
            <div className="flex items-center gap-1.5 md:hidden flex-shrink-0" dir="ltr">
              <button 
                className="p-1.5 text-white bg-white/10 rounded-lg hover:bg-white/20 transition-all" 
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
              <button 
                onClick={startNewChat} 
                className="p-1.5 text-primary_dark bg-secondary hover:bg-yellow-400 rounded-lg transition-all shadow-md active:scale-95"
              >
                <PlusCircle size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <main id="scroll-container" className="flex-1 overflow-y-auto scroll-smooth z-10 p-4 md:p-8">
          <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-6 pt-4">
            
            {messages.map(msg => (
              <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-message`}>
                <div className={`max-w-[95%] md:max-w-[85%] p-4 md:p-5 rounded-2xl flex gap-3 md:gap-4 shadow-sm relative group ${
                  msg.sender === 'user' 
                  ? 'bg-gradient-to-br from-primary to-primary_dark text-white rounded-tr-sm border border-primary/20' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
                }`}>
                  <div className="mt-1 flex-shrink-0">
                    {msg.sender === 'user' ? (
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/30 shadow-inner">
                        <User size={18} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm overflow-hidden bg-white">
                         <img src={logoImage} alt="AI" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 flex-1 min-w-0">
                    <div className="leading-loose text-[14px] md:text-base font-medium pt-1.5 break-words">
                      {renderMessageText(msg.text)}
                    </div>
                    
                    {/* Bot Actions Footer */}
                    {msg.sender === 'bot' && msg.id !== "welcome" && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                        {/* Feedback & Print Group */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-100 shadow-sm">
                               <button 
                                 onClick={() => sendFeedback(msg.id, 1)}
                                 className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${msg.feedback_score === 1 ? 'bg-green-100 text-green-700' : 'bg-transparent text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                                 title="وەڵامێکی باش بوو"
                               >
                                 <ThumbsUp size={16} className={msg.feedback_score === 1 ? "fill-current" : ""} />
                               </button>
                               <div className="w-[1px] h-4 bg-gray-200"></div>
                               <button 
                                 onClick={() => sendFeedback(msg.id, -1)}
                                 className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${msg.feedback_score === -1 ? 'bg-red-100 text-red-700' : 'bg-transparent text-gray-400 hover:bg-red-50 hover:text-red-600'}`}
                                 title="لێی تێنەگەیشتم / هەڵەیە"
                               >
                                 <ThumbsDown size={16} className={msg.feedback_score === -1 ? "fill-current" : ""} />
                               </button>
                            </div>

                            <button 
                              onClick={() => handlePrint(msg.text)}
                              className="flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-primary_dark bg-white hover:bg-gray-50 py-2 px-3 rounded-xl transition-colors border border-gray-200 shadow-sm"
                            >
                              <Printer size={14} className="text-secondary" /> PDF
                            </button>

                            <button 
                              onClick={() => handleCopy(msg.text, msg.id)}
                              className={`flex items-center gap-1.5 text-[11px] md:text-xs font-bold py-2 px-3 rounded-xl transition-all border shadow-sm ${
                                copyStatus === msg.id 
                                ? 'bg-green-50 text-green-600 border-green-200' 
                                : 'bg-white text-primary_dark hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              {copyStatus === msg.id ? <Check size={14} /> : <Copy size={14} className="text-secondary" />}
                              {copyStatus === msg.id ? 'کۆپی کرا' : 'کۆپی'}
                            </button>
                        </div>

                        {/* Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="w-full mt-2">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                               <Crown size={12} className="text-secondary" />
                               سەرچاوە فەرمییەکان:
                             </p>
                             <ul className="space-y-1.5">
                               {msg.sources.map((src, idx) => (
                                 <li key={idx}>
                                   <button 
                                     onClick={() => setSelectedSource(src)}
                                     className="w-full flex items-center gap-2 bg-slate-50 hover:bg-secondary/10 text-primary_dark text-[12px] font-bold py-2 px-3 rounded-xl transition-all border border-slate-100 group text-right"
                                   >
                                     <div className="w-5 h-5 rounded-md bg-white shadow-[0_2px_5px_rgba(0,0,0,0.05)] flex items-center justify-center text-[9px] text-secondary border border-gray-100 group-hover:bg-secondary group-hover:text-white transition-colors">
                                       {idx + 1}
                                     </div>
                                     <span className="flex-1 truncate">{src.title}</span>
                                     <Info size={14} className="text-secondary opacity-60 group-hover:opacity-100" />
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
                <div className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm rounded-tl-sm">
                   <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img src={logoImage} alt="AI" className="w-full h-full object-cover opacity-50" />
                   </div>
                   <div className="flex gap-1">
                      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
                   </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2 w-full" />
          </div>
        </main>

        {/* Input Footer */}
        <footer className="flex-none bg-white z-20 border-t border-gray-200 shadow-[0_-5px_15px_rgba(0,0,0,0.03)] p-4 md:p-6 pb-6 md:pb-8">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                className="w-full h-14 md:h-16 bg-gray-50 border-2 border-gray-200 rounded-2xl md:rounded-full pr-5 pl-14 md:pl-20 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white shadow-inner text-gray-800 font-medium placeholder-gray-400 text-[15px] md:text-base transition-all"
                placeholder="پرسیارەکەت لێرە بنووسە بۆ وەرگرتنی ڕێنمایی فەرمی..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={() => handleSend()}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary_dark text-secondary w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                disabled={!inputText.trim()}
              >
                <Send size={18} className="transform -rotate-90 -translate-x-0.5" />
              </button>
            </div>
            <div className="text-center text-[10px] md:text-xs font-bold text-gray-400 mt-3 md:mt-4">
              یاریدەدەری زیرەک دەتوانێت هەڵە بکات، تکایە بۆ مامەڵەی فەرمی وردەکارییەکان لە فەرمانگەکان پشتڕاست بکەرەوە
            </div>
          </div>
        </footer>
      </div>

      {/* Source Details Modal */}
      {selectedSource && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-primary_dark/60 backdrop-blur-md" onClick={() => setSelectedSource(null)}></div>
          
          <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in duration-300" dir="rtl">
            <div className="flex-none bg-gradient-to-r from-primary to-primary_dark p-4 md:p-6 text-white flex justify-between items-center border-b-4 border-secondary">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="bg-white/10 p-2 rounded-xl hidden sm:block">
                  <ShieldCheck className="text-secondary" size={20} />
                </div>
                <div>
                  <h2 className="text-sm md:text-xl font-bold tracking-tight leading-tight">{selectedSource.title}</h2>
                  <p className="text-[10px] md:text-xs text-secondary font-bold uppercase tracking-widest mt-0.5 md:mt-1">بەشی: {selectedSource.department}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSource(null)}
                className="w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-all text-white font-bold text-xl"
              >✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
              <div className="prose prose-slate max-w-none bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 leading-relaxed text-gray-800 text-sm md:text-lg font-medium">
                {selectedSource.content
                  .replace(/(پرسیار:)/g, '\n$1')
                  .replace(/(وەڵام:)/g, '\n$1')
                  .split('\n').filter(line => line.trim())
                  .map((line, i) => (
                  <div key={i} className="flex gap-3 md:gap-4 mb-4 last:mb-0 group/line hover:bg-slate-50 p-2 rounded-xl transition-colors">
                    <div className="mt-1.5 md:mt-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-secondary ring-2 md:ring-4 ring-secondary/10 flex-shrink-0 group-hover/line:scale-125 transition-transform" />
                    <span className={`flex-1 leading-loose ${line.includes('پرسیار:') ? 'text-primary_dark font-bold text-base md:text-lg' : 'text-gray-700'}`}>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-none p-4 md:p-6 bg-white border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedSource(null)}
                className="bg-primary text-secondary font-bold px-6 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl hover:bg-primary_dark transition-all shadow-md active:scale-95 text-sm md:text-base w-full sm:w-auto"
              >داخستن</button>
            </div>
          </div>
        </div>
      )}
      {/* Suggestion Modal */}
      {showSuggestion && (
        <div className="fixed inset-0 bg-primary_dark/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle size={24} /> ناردنی پێشنیار
              </h3>
              <button onClick={() => setShowSuggestion(false)} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {suggestionSent ? (
                <div className="text-center py-8 space-y-4 animate-bounce">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck size={32} />
                  </div>
                  <p className="text-lg font-bold text-gray-800">پێشنیارەکەت بە سەرکەوتوویی نێردرا!</p>
                  <p className="text-sm text-gray-500">سوپاس بۆ هاوکاریت بۆ باشترکردنی سیستمەکە.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">ناوەکەت (ئارەزوومەندانە)</label>
                    <input 
                      type="text" 
                      value={suggestionName}
                      onChange={(e) => setSuggestionName(e.target.value)}
                      placeholder="ناوی تۆ..."
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">پێشنیار یان ڕەخنە</label>
                    <textarea 
                      rows="4"
                      value={suggestionText}
                      onChange={(e) => setSuggestionText(e.target.value)}
                      placeholder="لێرە بنووسە..."
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                    ></textarea>
                  </div>
                  <button 
                    onClick={handleSuggestionSend}
                    disabled={suggestionSending || !suggestionText.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {suggestionSending ? 'دەنێردرێت...' : 'ناردنی پێشنیار'}
                    <Send size={18} />
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
