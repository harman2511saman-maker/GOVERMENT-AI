import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Crown, 
    MessageSquare, 
    ThumbsDown, 
    Info, 
    PlusCircle, 
    Trash2, 
    User,
    ShieldCheck,
    LogOut,
    Activity,
    ExternalLink
} from 'lucide-react';

const DEPARTMENTS = [
  "گشتی", 
  "پاسپۆرت", 
  "هاتووچۆ", 
  "نشینگە", 
  "تەندروستی", 
  "کارەبا", 
  "پەروەردە", 
  "ناوخۆ", 
  "داد", 
  "شارەوانی"
];

const AdminApp = () => {
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('گشتی');
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editId, setEditId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [activeTab, setActiveTab] = useState('documents'); // 'documents', 'suggestions', 'feedback'
  const [deleteMode, setDeleteMode] = useState(null); // 'doc', 'sug', 'feed', 'clear_sug', 'clear_feed'
  const [suggestions, setSuggestions] = useState([]);
  const [negativeFeedback, setNegativeFeedback] = useState([]);
  const [missedQuestions, setMissedQuestions] = useState([]);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const navigate = useNavigate();

  const getHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/login');
      return false;
    }
    // Set verify to false once we know there's at least a token
    // (Actual API calls will handle 401 if token is invalid)
    setIsVerifying(false);
    return true;
  };

  const fetchDocuments = async () => {
    if (!await checkAuth()) return;
    try {
      const res = await fetch('/api/admin/documents', {
        headers: getHeaders()
      });
      
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/login');
        return;
      }

      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  };

  const fetchSuggestions = async () => {
    if (!await checkAuth()) return;
    try {
      const res = await fetch('/api/admin/suggestions', { headers: getHeaders() });
      if (res.ok) setSuggestions(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchNegativeFeedback = async () => {
    if (!await checkAuth()) return;
    try {
      const res = await fetch('/api/admin/feedback/negative', { headers: getHeaders() });
      if (res.ok) setNegativeFeedback(await res.json());
    } catch (err) { console.error(err); }
  };
  
  const fetchMissedQuestions = async () => {
    if (!await checkAuth()) return;
    try {
      const res = await fetch('/api/admin/missed-questions', { headers: getHeaders() });
      if (res.ok) setMissedQuestions(await res.json());
    } catch (err) { console.error(err); }
  };
  
  const handleReindex = async () => {
    if (!window.confirm("ئایا دڵنیایت لە بونیادنانەوەی هەموو مێشکی AI؟ ئەمە هەموو ڤێکتەرەکان نوێ دەکاتەوە بەپێی ڕێکخستنی نوێ (600/100).")) return;
    
    setIsReindexing(true);
    try {
      const res = await fetch('/api/admin/reindex', { 
        method: 'POST', 
        headers: getHeaders() 
      });
      const data = await res.json();
      alert(data.message || "بونیادنانەوە بە سەرکەوتوویی جێبەجێ کرا.");
      fetchDocuments();
    } catch (err) {
      alert("هەڵەیەک ڕوویدا لە کاتی بونیادنانەوە.");
    } finally {
      setIsReindexing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const auth = await checkAuth();
      if (auth) {
        if (activeTab === 'documents') fetchDocuments();
        if (activeTab === 'suggestions') fetchSuggestions();
        if (activeTab === 'feedback') fetchNegativeFeedback();
        if (activeTab === 'missed') fetchMissedQuestions();
      }
    };
    init();
  }, [activeTab]);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      setMessage('تکایە ناونیشان و دەقەکە پڕبکەرەوە.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const url = editId ? `/api/admin/documents/${editId}` : '/api/admin/ingest';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: getHeaders(),
        body: JSON.stringify({ title, department, content, link })
      });

      if (res.ok) {
        setMessage(editId ? 'زانیارییەکە بە سەرکەوتوویی نوێکرایەوە.' : 'زانیارییەکە بە سەرکەوتوویی خەزن کرا و بۆ AI ئامادەکرا.');
        resetForm();
        fetchDocuments();
      } else {
        setMessage('هەڵەیەک ڕوویدا لە کاتی جێبەجێکردندا.');
      }
    } catch (err) {
      console.error(err);
      setMessage('کێشە لە پەیوەندی بە سێرڤەرەوە هەیە.');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (doc) => {
    setEditId(doc.id);
    setTitle(doc.title);
    setDepartment(doc.department || 'گشتی');
    setContent(doc.content);
    setLink(doc.link || '');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditId(null);
    setTitle('');
    setDepartment('گشتی');
    setContent('');
    setLink('');
  };
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/admin/documents/${id}`, { 
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        if (editId === id) resetForm();
        setDeleteConfirmId(null);
        setDeleteMode(null);
        fetchDocuments();
      } else if (res.status === 401) {
        navigate('/login');
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };
  const handleDeleteSuggestion = async (id) => {
    try {
      const res = await fetch(`/api/admin/suggestions/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        setDeleteConfirmId(null);
        setDeleteMode(null);
        fetchSuggestions();
      }
    } catch (err) { console.error(err); }
  };

  const handleClearSuggestions = async () => {
    try {
      const res = await fetch('/api/admin/suggestions/all/clear', { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        setDeleteConfirmId('all');
        setDeleteMode(null);
        setDeleteConfirmId(null);
        fetchSuggestions();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteFeedback = async (id) => {
    try {
      const res = await fetch(`/api/admin/feedback/negative/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        setDeleteConfirmId(null);
        setDeleteMode(null);
        fetchNegativeFeedback();
      }
    } catch (err) { console.error(err); }
  };

  const handleClearFeedback = async () => {
    try {
      const res = await fetch('/api/admin/feedback/negative/all/clear', { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        setDeleteConfirmId(null);
        setDeleteMode(null);
        fetchNegativeFeedback();
      }
    } catch (err) { console.error(err); }
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs/clear', { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        setDeleteConfirmId(null);
        setDeleteMode(null);
        setMessage('هەموو لۆگەکان بە سەرکەوتوویی سڕانەوە.');
        fetchMissedQuestions();
        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) { 
      console.error(err);
      setMessage('هەڵەیەک ڕوویدا لە کاتی سڕینەوەی لۆگەکان.');
    }
  };


  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold">خەریکی سەلماندنی ناسنامەیە...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" dir="rtl">
      <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
             <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                <ShieldCheck size={28} />
             </div>
             <div>
                <h1 className="text-xl font-bold font-['Noto_Sans_Arabic'] tracking-tight">پنێڵی بەڕێوبەر</h1>
                <p className="text-slate-400 text-xs font-medium opacity-80">سیستەمی چاودێری و نوێکردنەوە</p>
             </div>
          </div>

          <div className="flex items-center bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-md">
            <button 
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'documents' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Info size={18} /> پەرەپێدانی زانیاری
            </button>
            <button 
              onClick={() => setActiveTab('suggestions')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'suggestions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <MessageSquare size={18} /> پێشنیارەکان
            </button>
             <button 
              onClick={() => setActiveTab('missed')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'missed' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Activity size={18} /> کێشەی زانیاری
            </button>
            <button 
              onClick={() => setActiveTab('feedback')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'feedback' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <ThumbsDown size={18} /> نارەزایەتییەکان
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-400 p-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-2 font-bold text-sm"
              title="Logout"
            >
              <LogOut size={16} /> چوونە دەرەوە
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search and Stats Row */}
            <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-3xl border border-slate-200 shadow-sm gap-4">
               <div className="relative w-full md:w-96">
                  <input
                    type="text"
                    placeholder="بگەڕێ لە ناو بابەتەکان..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-12 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                  />
                  <span className="absolute right-4 top-3.5 text-slate-400">🔍</span>
               </div>
               <div className="flex gap-4">
                  <div className="bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                     <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">سەرچاوەکان</span>
                     <span className="text-blue-600 font-black text-lg">{documents.length}</span>
                  </div>
                  <button 
                    onClick={handleReindex}
                    disabled={isReindexing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {isReindexing ? "خەریکی نوێکردنەوەیە..." : "بونیادنانەوەی مێشک (Re-index)"}
                  </button>
               </div>
            </div>

            {/* Form Column */}
            <section className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-fit sticky top-24">
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                {editId ? <span className="text-amber-500 text-xl font-bold">✏️</span> : <PlusCircle size={22} className="text-blue-600" />}
                {editId ? 'دەستکاریکردنی زانیاری' : 'زیادکردنی سەرچاوەی نوێ'}
              </h2>
              <form onSubmit={handleIngest} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest mr-1">بەش / فەرمانگە</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                  >
                    {DEPARTMENTS.map(dep => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest mr-1">ناونیشانی کورت</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    placeholder="بۆ نموونە: نرخی نوێی تابلۆ"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest mr-1">
                    لینکی فەرمی / ماڵپەڕ (ئارەزوومەندانە)
                  </label>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    placeholder="بۆ نموونە: https://moi.gov.krd یان لینکی ئەپڵیکەیشن"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest mr-1">دەقی فەرمی (وەک خۆی)</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows="10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    placeholder="ڕێنماییەکان لێرە کۆپی بکە..."
                  ></textarea>
                </div>

                {message && (
                  <div className={`p-4 rounded-2xl text-xs font-bold animate-in zoom-in duration-300 flex items-center gap-2 ${message.includes('سەرکەوتوویی') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {message.includes('سەرکەوتوویی') ? '✅' : '❌'} {message}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 ${
                      editId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                    }`}
                  >
                    {isLoading ? '...' : (editId ? 'نوێکردنەوەی پڕۆژە' : 'بڵاوکردنەوەی فەرمی')}
                  </button>
                  {editId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="bg-slate-100 text-slate-500 px-6 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                    >
                      لابردن
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* List Column */}
            <section className="lg:col-span-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredDocuments.length === 0 ? (
                  <div className="col-span-2 bg-white/50 p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-4">
                    <div className="bg-slate-100 p-5 rounded-full text-slate-300">
                       <Info size={40} />
                    </div>
                    <p className="font-bold text-slate-400">هیچ ئەنجامێک نەدۆزرایەوە بۆ گەڕانەکەت</p>
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <div key={doc.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150 group-hover:bg-blue-100/50"></div>
                      
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider border border-blue-100">
                            {doc.department}
                          </span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <button onClick={() => startEdit(doc)} className="bg-white text-blue-600 shadow-md p-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-50">
                              ✏️
                            </button>
                            <button onClick={() => { setDeleteConfirmId(doc.id); setDeleteMode('doc'); }} className="bg-white text-red-500 shadow-md p-2 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-50">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2 text-lg leading-snug">{doc.title}</h3>
                        {doc.link && (
                          <div className="mb-3">
                            <a 
                              href={doc.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors"
                            >
                              <ExternalLink size={13} />
                              <span className="truncate max-w-[200px]">{doc.link}</span>
                            </a>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed font-medium">
                          {doc.content}
                        </p>
                        <div className="mt-6 pt-5 border-t border-slate-50 text-[10px] font-bold text-slate-400 flex justify-between items-center">
                          <span className="flex items-center gap-1">🕒 {new Date(doc.created_at).toLocaleDateString()}</span>
                          <span className="bg-slate-50 px-2 py-1 rounded-md">ID: {doc.id}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
             <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                <div>
                   <h2 className="text-2xl font-black text-slate-800">پێشنیارەکانی هاوڵاتییان</h2>
                   <p className="text-slate-500 text-sm font-medium mt-1">لیستی هەموو ئەو پێشنیارانەی کە لە لایەن بەکارهێنەرانەوە نێردراون</p>
                </div>
                <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-200">
                   {suggestions.length}
                </div>
                {suggestions.length > 0 && (
                  <button 
                    onClick={() => { setDeleteConfirmId('all'); setDeleteMode('clear_sug'); }}
                    className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all border border-red-100"
                  >
                    سڕینەوەی هەمووی
                  </button>
                )}
             </div>

             <div className="grid grid-cols-1 gap-4">
                {suggestions.length === 0 ? (
                  <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
                     <p className="font-bold text-slate-400 tracking-wide">تا ئێستا هیچ پێشنیارێک نییە</p>
                  </div>
                ) : (
                  suggestions.map((sug) => (
                    <div key={sug.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-start">
                       <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 shrink-0">
                          <User size={24} />
                       </div>
                       <div className="flex-1">
                          <div className="flex justify-between items-center mb-3">
                             <h4 className="font-bold text-slate-800 text-lg">{sug.name || 'Anonymous User'}</h4>
                             <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full flex items-center gap-1">
                                🕒 {new Date(sug.created_at).toLocaleString()}
                             </span>
                          </div>
                          <p className="text-slate-600 text-[15px] leading-relaxed font-medium bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                             {sug.message}
                          </p>
                       </div>
                       <button 
                         onClick={() => { setDeleteConfirmId(sug.id); setDeleteMode('sug'); }}
                         className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                         title="Delete Suggestion"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
             <div className="flex justify-between items-center mb-8 bg-red-50 p-6 rounded-[32px] border border-red-100 shadow-sm">
                <div>
                   <h2 className="text-2xl font-black text-red-800">نارەزایەتییە تۆمارکراوەکان</h2>
                   <p className="text-red-700/60 text-sm font-medium mt-1">ئەو وەڵامانەی کە بەکارهێنەران بە "هەڵە" یان "نەگونجاو"یان داناوە</p>
                </div>
                <div className="bg-red-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-red-200">
                   {negativeFeedback.length}
                </div>
                {negativeFeedback.length > 0 && (
                  <button 
                    onClick={() => { setDeleteConfirmId('all'); setDeleteMode('clear_feed'); }}
                    className="bg-white text-red-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all border border-red-100"
                  >
                    سڕینەوەی هەمووی
                  </button>
                )}
             </div>

             <div className="grid grid-cols-1 gap-6">
                {negativeFeedback.length === 0 ? (
                  <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
                     <p className="font-bold text-slate-400">سیستەمەکە بە باشی کاردەکات، هیچ نارەزایەتییەکی تێدا نییە</p>
                  </div>
                ) : (
                  negativeFeedback.map((f) => (
                    <div key={f.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden border-r-4 border-r-red-500 transition-all hover:shadow-xl">
                       <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                             <div className="flex items-center gap-2 mb-4">
                                <div className="bg-slate-100 p-2 rounded-xl text-slate-600">
                                   <User size={16} />
                                </div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">پرسیاری بەکارهێنەر</span>
                             </div>
                             <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-slate-800 font-bold text-[15px] leading-relaxed">
                                {f.user_query}
                             </div>
                          </div>
                          <div>
                             <div className="flex items-center gap-2 mb-4">
                                <div className="bg-red-50 p-2 rounded-xl text-red-600 font-bold">
                                   ⚠️
                                </div>
                                <span className="text-[11px] font-black text-red-400 uppercase tracking-widest">تێبینی بەکارهێنەر (بۆچی دیسڵایکی کرد)</span>
                             </div>
                             <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 text-red-800 font-black text-[15px] leading-relaxed">
                                {f.feedback_note || 'تێبینی نەنووسراوە'}
                             </div>
                          </div>
                          
                          <div className="md:col-span-2">
                             <div className="flex items-center gap-2 mb-4">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">وەڵامی سیستم (کە هەڵە بووە)</span>
                             </div>
                             <div className="bg-slate-800 text-slate-200 p-6 rounded-2xl text-[14px] leading-relaxed font-medium">
                                {f.bot_response}
                             </div>
                          </div>
                       </div>
                       <div className="bg-slate-50 px-8 py-4 flex justify-between items-center text-[11px] font-bold text-slate-400 border-t border-slate-100">
                          <span className="flex items-center gap-2">🕒 {new Date(f.created_at).toLocaleString()}</span>
                          <div className="flex items-center gap-4">
                             <span className="bg-white px-3 py-1 rounded-full shadow-sm">SESSION: {f.session_id}</span>
                             <button 
                               onClick={() => { setDeleteConfirmId(f.id); setDeleteMode('feed'); }}
                               className="text-slate-400 hover:text-red-600 transition-colors p-1"
                               title="Clear Feedback"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                       </div>
                    </div>
                  ))
                )}
          </div>
        </div>
      )}

      {activeTab === 'missed' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8 bg-amber-50 p-6 rounded-[32px] border border-amber-100 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-amber-800">کێشەی زانیاری (Knowledge Gaps)</h2>
              <p className="text-amber-700/60 text-sm font-medium mt-1">ئەو پرسیارانەی کە AI نەیتوانیوە وەڵامیان بداتەوە لەبەر کەمی زانیاری</p>
            </div>
            <div className="bg-amber-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-amber-200">
              {missedQuestions.length}
            </div>
            {missedQuestions.length > 0 && (
              <button 
                onClick={() => { setDeleteConfirmId('all'); setDeleteMode('clear_logs'); }}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"
              >
                سڕینەوەی هەمووی
              </button>
            )}
          </div>


          <div className="grid grid-cols-1 gap-4">
            {missedQuestions.length === 0 ? (
              <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
                <p className="font-bold text-slate-400 font-['Noto_Sans_Arabic']">هیچ پرسارێکی بێ وەڵام نییە! زانیارییەکان تەواون.</p>
              </div>
            ) : (
              missedQuestions.map((q) => (
                <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-amber-100 p-4 rounded-2xl text-amber-600 font-black flex flex-col items-center">
                    <span className="text-xs uppercase">دووبارەبوونەوە</span>
                    <span className="text-xl">{q.count}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-lg leading-relaxed font-['Noto_Sans_Arabic']">{q.query_text}</h4>
                    <span className="text-[11px] font-bold text-slate-400 mt-2 block">
                      دواین جار: {new Date(q.last_asked).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setTitle(q.query_text); setActiveTab('documents'); }}
                      className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                      چارەسەرکردن
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <div className="text-center">
              <div className="bg-red-50 text-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                ⚠️
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">دڵنیایت لە سڕینەوە؟</h3>
              <p className="text-slate-500 text-sm mb-8">
                ئەو زانیارییەی کە دەیسڕیتەوە بە هیچ شێوەیەک ناگەڕێتەوە و لە مێشکی AIـەکەش دەسڕێتەوە.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (deleteMode === 'doc' || !deleteMode) handleDelete(deleteConfirmId);
                    else if (deleteMode === 'sug') handleDeleteSuggestion(deleteConfirmId);
                    else if (deleteMode === 'feed') handleDeleteFeedback(deleteConfirmId);
                    else if (deleteMode === 'clear_sug') handleClearSuggestions();
                    else if (deleteMode === 'clear_feed') handleClearFeedback();
                    else if (deleteMode === 'clear_logs') handleClearLogs();
                  }}

                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  بەڵێ، بسڕەوە
                </button>
                <button
                  onClick={() => { setDeleteConfirmId(null); setDeleteMode(null); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all"
                >
                  نەخێر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApp;
