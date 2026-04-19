import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Crown, Info, ShieldCheck } from 'lucide-react';
import logoImage from '../assets/images.jpg';

const ChatApp = () => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "بەخێربێیت بۆ سەکۆی زیرەکی دەستکردی حکومەت. ئامادەین بۆ پێدانی زانیاری دروست و باوەڕپێکراو دەربارەی یاسا و ڕێنماییە فەرمییەکان بە خێرایی و وردی.", 
      sender: "bot" 
    }
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  // Intro states
  const [showIntro, setShowIntro] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => setShowIntro(false), 800);
    }, 2500);
    return () => clearTimeout(timer);
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

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    const newMsg = { id: Date.now(), text: inputText, sender: "user" };
    setMessages([...messages, newMsg]);
    setInputText("");

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "زانیارییەکان بە پێی ڕێنماییە فەرمییەکانی حکومەت شی دەکرێنەوە. بۆ وەڵامی تەواوەتی پێویستە سێرڤەری بنکەی زانیاری (PostgreSQL) چالاک بکرێت.",
        sender: "bot"
      }]);
    }, 1500);
  };

  return (
    <>
      {/* Intro Loading Screen */}
      {showIntro && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-primary to-primary_dark ${isExiting ? 'intro-exit-anim' : ''}`}>
          <div className="relative mb-6 intro-logo-anim">
            <div className="absolute -inset-4 bg-secondary opacity-30 rounded-full blur-xl"></div>
            <img src={logoImage} alt="لۆگۆی حکومەت" className="relative w-32 h-32 md:w-40 md:h-40 object-cover rounded-full border-4 border-secondary/80 shadow-2xl" />
          </div>
          <h1 className="text-white text-2xl md:text-4xl font-black tracking-wide intro-text-anim mt-4">
            حکومەتی هەرێمی کوردستان
          </h1>
          <p className="text-secondary font-bold tracking-widest mt-3 text-sm md:text-base intro-text-anim opacity-90 shadow-sm px-4 py-1.5 bg-black/20 rounded-full border border-secondary/20">
            سیستەمی زیرەکی دەستکرد
          </p>
          <div className="absolute bottom-10 flex flex-col items-center intro-text-anim">
            <div className="w-8 h-8 relative">
              <div className="absolute inset-0 rounded-full animate-ping bg-secondary opacity-40"></div>
              <div className="relative rounded-full w-8 h-8 border-2 border-t-secondary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            </div>
            <span className="text-xs text-gray-400 mt-3 font-semibold tracking-wider">ئامادەکردنی زانیارییەکان...</span>
          </div>
        </div>
      )}

      {/* Main App Layout - STRICTLY FIXED TO VIEWPORT */}
      <div className={`fixed inset-0 flex flex-col overflow-hidden bg-bg font-sans bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] ${!showIntro ? 'page-enter-anim' : 'opacity-0'}`}>
        
        {/* Decorative Background Elements */}
        <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary opacity-5 rounded-full blur-3xl z-0 pointer-events-none"></div>
        <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-secondary opacity-[0.03] rounded-full blur-3xl z-0 pointer-events-none"></div>

        {/* 1. HEADER - Static at the top */}
        <header className="flex-none glass-nav-dark z-20 text-white shadow-md border-b-4 border-secondary">
          <div className="container mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-yellow-200 rounded-full blur opacity-40"></div>
                <img src={logoImage} alt="لۆگۆی حکومەت" className="relative w-12 h-12 object-cover rounded-full border-2 border-secondary/80 shadow-lg object-center bg-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg md:text-2xl font-black tracking-tight flex items-center gap-2">
                  <Crown size={18} className="text-secondary" />
                  یاریدەدەری زیرەکی دەستکرد
                </h1>
                <span className="text-xs md:text-sm text-gray-300 font-medium tracking-wide flex items-center gap-1.5 outline-none mt-0.5">
                  <ShieldCheck size={14} className="text-secondary" /> ماڵپەڕی فەرمی فەرمانگە
                </span>
              </div>
            </div>
            <a 
              href="/admin" 
              className="hidden md:flex text-sm font-bold items-center gap-2 px-5 py-2.5 rounded-full border border-secondary/50 text-secondary hover:bg-secondary hover:text-primary transition-all duration-300 shadow-[0_0_15px_rgba(197,160,89,0.1)] hover:shadow-[0_0_20px_rgba(197,160,89,0.3)]"
            >
               چوونەژوورەوەی بەڕێوەبەر
            </a>
          </div>
        </header>

        {/* 2. MESSAGES AREA - Takes all middle space and scrolls */}
        <main id="scroll-container" className="flex-1 min-h-0 overflow-y-auto scroll-smooth z-10 p-4 md:p-8">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            
            {/* Info Banner */}
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl flex items-start gap-4 text-primary_dark w-full animate-message border-l-4 border-l-secondary shadow-sm">
              <Info className="flex-shrink-0 text-secondary mt-1" size={24} />
              <p className="font-semibold leading-relaxed text-sm md:text-base">
                ئەم سیستمە زانیارییەکانی لەسەر بنەمای یاسا کارپێکراوەکان وەرگرتووە. تکایە پرسیارەکەت بە ڕوونی بنووسە بۆ بەدەستهێنانی باشترین وەڵام.
              </p>
            </div>

            {/* Chat Bubbles */}
            {messages.map(msg => (
              <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-message`}>
                <div className={`max-w-[90%] md:max-w-[75%] p-5 rounded-2xl flex gap-4 shadow-sm ${
                  msg.sender === 'user' 
                  ? 'bg-gradient-to-br from-primary to-primary_dark text-white rounded-tr-sm border border-primary/20' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
                }`}>
                  <div className="mt-1 flex-shrink-0">
                    {msg.sender === 'user' ? (
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/30 shadow-inner">
                        <User size={22} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm overflow-hidden bg-white">
                         <img src={logoImage} alt="AI" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="leading-loose whitespace-pre-wrap text-[15px] md:text-base font-medium pt-1.5">{msg.text}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-2 w-full" />
          </div>
        </main>

        {/* 3. INPUT BOX - Static at the bottom */}
        <footer className="flex-none bg-white z-20 border-t border-gray-200 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
          <div className="max-w-4xl mx-auto px-4 py-4 md:px-8">
            <div className="relative flex items-center w-full">
              {/* Modern Rounded Input */}
              <input
                type="text"
                className="w-full h-14 bg-gray-50 border-2 border-gray-200 rounded-full pr-6 pl-16 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white shadow-inner text-gray-800 font-medium placeholder-gray-400 text-[15px] md:text-base transition-all"
                placeholder="پرسیارەکەت دەربارەی مامەڵە و ڕێنماییەکان لێرە بنووسە..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              
              {/* Integrated Send Icon inside input (Left side for RTL) */}
              <button 
                onClick={handleSend}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary_dark text-secondary w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                disabled={!inputText.trim()}
              >
                <Send size={18} className="transform -rotate-90 -translate-x-0.5" />
              </button>
            </div>
            
            <div className="text-center text-[10px] md:text-xs font-bold text-gray-400 mt-2">
              پەرەپێدراوە لەلایەن سیستەمی زیرەکی دەستکردی حکومەت
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default ChatApp;
