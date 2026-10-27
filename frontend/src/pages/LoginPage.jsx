import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../utils/api';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
 
    React.useEffect(() => {
        // Clear previous session on login page load
        localStorage.removeItem('admin_token');
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch(apiUrl('/api/auth/login'), {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('admin_token', data.access_token);
                navigate('/admin');
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'ناوی بەکارهێنەر یان پاسوۆرد هەڵەیە');
            }
        } catch (err) {
            setError('کێشەیەک لە پەیوەندی بە سێرڤەرەوە هەیە');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6" dir="rtl">
            <div className="max-w-md w-full bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-700 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                        <span className="text-3xl">🛡️</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">چوونەژوورەوە</h1>
                    <p className="text-slate-400 text-sm">تەنها بەڕێوەبەرانی ڕێگەپێدراو دەتوانن بچنە ناوەوە</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-slate-400 text-xs font-semibold uppercase mb-2 mr-1">ناوی بەکارهێنەر</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            placeholder="admin"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs font-semibold uppercase mb-2 mr-1">پاسوۆرد</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-3 px-4 rounded-xl text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
                    >
                        {isLoading ? '...' : 'چوونەژوورەوە'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-700 text-center">
                    <button 
                        onClick={() => navigate('/')}
                        className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
                    >
                        گەڕانەوە بۆ چات
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
