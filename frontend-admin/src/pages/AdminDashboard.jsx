import React, { useState } from 'react';
import { Upload, Database, Settings, Server, LogOut, ShieldCheck, Activity } from 'lucide-react';
import logoImage from '../assets/images.jpg';

const AdminDashboard = () => {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");

  const handleSave = () => {
    alert("پێویستە PostgreSQL بنکەی زانیاری دابمەزرێت بۆ ئەوەی داتاکە بگۆڕین بۆ ڤێکتۆر لە ناو ChromaDB یان pgvector");
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex font-sans overflow-hidden">
      {/* Premium Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-primary to-primary_dark text-white hidden lg:flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.1)] z-20 border-l border-primary_dark relative">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary to-transparent"></div>
        
        <div className="p-8 pb-6 flex flex-col items-center justify-center border-b border-white/10 relative">
          <div className="relative mb-4 group cursor-pointer">
            <div className="absolute -inset-2 bg-secondary opacity-20 rounded-full blur-md group-hover:opacity-40 transition duration-500"></div>
            <img src={logoImage} alt="دەزگای حکومی" className="relative w-20 h-20 object-cover rounded-full border-2 border-secondary/80 shadow-xl" /> 
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-primary_dark shadow-sm flex items-center justify-center">
              <ShieldCheck size={12} className="text-primary_dark"/>
            </div>
          </div>
          <h2 className="text-xl font-black text-center w-full tracking-wide">دەسەڵاتی بەڕێوەبردن</h2>
          <p className="text-sm text-secondary/90 mt-1.5 font-bold bg-black/20 px-3 py-1 rounded-full border border-white/5">ژینگەی تەواو پارێزراو</p>
        </div>
        
        <nav className="flex-1 px-4 py-8 flex flex-col gap-3">
          <a href="#" className="flex items-center gap-3 bg-secondary/15 text-secondary px-4 py-3.5 rounded-xl border border-secondary/20 font-bold transition-all shadow-inner">
            <Database size={22}/> بنکەی زانیاری (Knowledge)
          </a>
          <a href="#" className="flex items-center gap-3 text-gray-300 hover:text-white hover:bg-white/5 px-4 py-3.5 rounded-xl transition duration-300 font-medium">
            <Settings size={22}/> ڕێکخستنەکانی مۆدێل
          </a>
          <a href="#" className="flex items-center gap-3 text-gray-300 hover:text-white hover:bg-white/5 px-4 py-3.5 rounded-xl transition duration-300 font-medium">
            <Activity size={22}/> چاودێری سیستەم (Logs)
          </a>
        </nav>
        
        <div className="p-6 border-t border-white/10 bg-black/10">
          <a href="/" className="flex items-center justify-center gap-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 px-4 py-3 rounded-xl transition-all duration-300 font-bold">
            <LogOut size={20}/> چوونەدەرەوە لە سیستەم
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute top-0 right-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
        
        <header className="glass-panel mx-6 mt-6 rounded-2xl flex justify-between items-center z-10 border border-white p-5 px-8 shadow-sm">
          <div className="flex flex-col">
             <h2 className="text-xl font-black text-primary">زیادکردنی ڕێنماییەکان</h2>
             <p className="text-sm text-gray-500 font-medium mt-1">بەڕێوەبردنی زانیارییە ناوخۆییەکانی سیستەم</p>
          </div>
          <span className="bg-green-50 text-green-700 text-sm font-bold px-4 py-2 rounded-xl border border-green-200 shadow-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
            گرێدراوە بۆ خەزن
          </span>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto pt-4 pb-12">
            
            {/* Input Section */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 animate-message relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-secondary to-yellow-200"></div>
              
              <div className="mb-4 bg-blue-50/50 p-5 rounded-xl border border-blue-100 flex gap-4">
                <ShieldCheck className="text-secondary shrink-0" size={28} />
                <div>
                  <h4 className="font-bold text-primary text-lg mb-1">ئاستی پاراستنی ناوەڕۆک: نهێنی (Top Secret)</h4>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    هەر زانیارییەک لێرە دادەنرێت ڕاستەوخۆ دەگۆڕێت بۆ کۆدی ئاڵۆز (Vector Embeddings) و لەسەر سێرڤەری لۆکاڵی دادەنرێت. زیرەکی دەستکرد پێشتر هیچ زانیارییەکی لەسەر ئەم یاسایانە نییە مەگەر تۆ بە خێرایی فێری بکەیت.
                  </p>
                </div>
              </div>
              
              <div className="space-y-6 mt-8">
                <div>
                  <label className="block text-base font-black text-primary mb-2">بابەت / سەردێڕی فەرمی</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl p-4 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-lg bg-gray-50/50"
                    placeholder="نموونە: گشتاندنی ژمارە (١٢) - پشووە فەرمییەکان"
                  />
                </div>

                <div>
                  <label className="block text-base font-black text-primary mb-2">دەقی تەواوەتی بەڵگەنامەکە</label>
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl p-5 h-80 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base font-medium bg-gray-50/50 resize-y leading-loose"
                    placeholder="وردەکارییەکان لێرە بنووسە یان کۆپی بکە... AI توانای تێگەیشتنی تەواوەتی هەیە لەم دەقانە."
                  ></textarea>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleSave}
                    className="bg-primary hover:bg-primary_dark text-white px-10 py-4 rounded-xl shadow-lg shadow-primary/30 font-black flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 w-full sm:w-auto"
                  >
                    <Upload size={22} className="text-secondary" /> داخڵکردن بە سیستەمی RAG
                  </button>
                </div>
              </div>
            </div>
            
            {/* Server Settings */}
            <h3 className="text-xl font-black mt-12 mb-6 text-primary flex items-center gap-2">
               <Server className="text-secondary" size={24}/> دۆخی سێرڤەر و مۆدێلەکان
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cloud Option */}
              <div className="bg-white border-2 border-transparent hover:border-secondary/30 p-6 rounded-2xl shadow-lg shadow-gray-200/50 cursor-pointer transition-all duration-300 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"><Activity className="text-blue-600" size={24}/></div>
                    <span className="font-black text-primary text-xl">Groq API</span>
                  </div>
                  <span className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> چاڵاکە
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed font-semibold">پەیوەستکراوە بو مۆدێلی (Llama 3 70B). خێراییەکی بێسنوور لە وەڵامدانەوە و تێگەیشتن لە زمانی کوردی. گونجاوە بۆ زانیاری گشتی.</p>
              </div>

              {/* Local Option */}
              <div className="bg-gradient-to-br from-primary to-primary_dark border-2 border-secondary/50 p-6 rounded-2xl shadow-xl shadow-primary/20 cursor-default relative overflow-hidden text-white">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-secondary opacity-10 rounded-full blur-2xl"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center"><ShieldCheck className="text-secondary" size={24}/></div>
                    <span className="font-black text-white text-xl">Ollama Local</span>
                  </div>
                  <span className="bg-secondary text-primary_dark px-3 py-1 rounded-lg text-xs font-black shadow-sm">
                    پێشنیارکراو
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed font-medium relative z-10">بۆ بەکارهێنان لە ناوخۆی بینای حکومەت بۆ دڵنیابوون لەوەی سەدا سەد زانیارییەکان دزە ناکەن یان ناچنە دەرەوەی ئێرە.</p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
