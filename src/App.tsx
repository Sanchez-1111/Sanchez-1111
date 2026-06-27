/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Compass,
  Brain,
  Briefcase,
  Sparkles,
  Heart,
  Users,
  Share2,
  Bookmark,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  X,
  Copy,
  Check,
  Flame,
  Info,
  Calendar,
  Sparkle,
  Database,
  Smartphone,
  QrCode
} from 'lucide-react';
import { Quote, MoodType, CategoryType } from './types';
import { fallbackQuotes, moodConfigs, categoryConfigs } from './data/fallbackQuotes';

export default function App() {
  // Navigation & tabs
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'create' | 'database'>('home');

  // Supabase Integration state
  const [supabaseUrl, setSupabaseUrl] = useState('https://vjanavkcawdkzrazmlwx.supabase.co');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqYW5hdmtjYXdka3pyYXptbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0Njk5NTgsImV4cCI6MjA5ODA0NTk1OH0.ppgcMMt2xd4_afAIKaPBXp6prxPSz27xteli9vNb2M4');
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(false);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);

  // Interactive generation settings
  const [selectedMood, setSelectedMood] = useState<MoodType>('general');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('general');
  const [customTopic, setCustomTopic] = useState('');

  // Quotes state
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [dbQuotes, setDbQuotes] = useState<Quote[]>([]);
  
  // Custom Quote creation inputs
  const [customText, setCustomText] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customCategory, setCustomCategory] = useState<CategoryType>('general');

  // UI status states
  const [showExplanation, setShowExplanation] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [streakCount, setStreakCount] = useState(1);
  const [hasGeneratedToday, setHasGeneratedToday] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize data
  useEffect(() => {
    // Load favorites from local storage
    const stored = localStorage.getItem('pocket_motivation_favorites');
    if (stored) {
      try {
        setSavedQuotes(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing stored favorites', e);
      }
    }

    // Load streak & daily info
    const lastGenStr = localStorage.getItem('pocket_motivation_last_gen');
    const savedStreakStr = localStorage.getItem('pocket_motivation_streak');
    
    if (savedStreakStr) {
      setStreakCount(parseInt(savedStreakStr, 10));
    }

    if (lastGenStr) {
      const lastGenDate = new Date(parseInt(lastGenStr, 10)).toDateString();
      const todayDate = new Date().toDateString();
      if (lastGenDate === todayDate) {
        setHasGeneratedToday(true);
      } else {
        // If it was yesterday, keep streak. If older, reset streak to 1.
        const lastGenTime = parseInt(lastGenStr, 10);
        const oneDayMs = 24 * 60 * 60 * 1000;
        const diffDays = Math.floor((Date.now() - lastGenTime) / oneDayMs);
        if (diffDays > 1) {
          setStreakCount(1);
          localStorage.setItem('pocket_motivation_streak', '1');
        }
      }
    }

    // Select initial random fallback quote
    const initialQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    setCurrentQuote({ ...initialQuote, id: `fb-init-${Date.now()}` });

    // Load Supabase credentials and initialize if present
    const savedUrl = localStorage.getItem('pocket_supabase_url') || 'https://vjanavkcawdkzrazmlwx.supabase.co';
    const savedKey = localStorage.getItem('pocket_supabase_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqYW5hdmtjYXdka3pyYXptbHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0Njk5NTgsImV4cCI6MjA5ODA0NTk1OH0.ppgcMMt2xd4_afAIKaPBXp6prxPSz27xteli9vNb2M4';
    if (savedUrl && savedKey) {
      setSupabaseUrl(savedUrl);
      setSupabaseAnonKey(savedKey);
      testAndConnectSupabase(savedUrl, savedKey, false);
    }
  }, []);

  // Sync Supabase function
  const testAndConnectSupabase = async (url: string, anonKey: string, showToast = true) => {
    if (!url || !anonKey) {
      if (showToast) triggerToast('Please enter both Supabase Project URL and Anon Key.');
      return;
    }
    setIsSupabaseLoading(true);
    try {
      const client = createClient(url, anonKey);
      // Fetch existing quotes from 'pocket_quotes' table
      const { data, error } = await client
        .from('pocket_quotes')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      const mappedQuotes: Quote[] = (data || []).map((row: any) => ({
        id: row.id,
        text: row.text,
        author: row.author,
        category: row.category,
        mood: row.mood || 'general',
        explanation: row.explanation || '',
        isCustom: row.is_custom || false,
        isFavorite: row.is_favorite !== undefined ? row.is_favorite : true,
        timestamp: Number(row.timestamp)
      }));

      setDbQuotes(mappedQuotes);
      const favoritesOnly = mappedQuotes.filter(q => q.isFavorite !== false || q.isCustom);
      setSavedQuotes(favoritesOnly);
      setIsSupabaseConfigured(true);
      localStorage.setItem('pocket_supabase_url', url);
      localStorage.setItem('pocket_supabase_key', anonKey);
      if (showToast) triggerToast('🚀 Connected to Supabase! Database synced successfully.');
    } catch (err: any) {
      console.warn('Supabase connection warning:', err);
      setIsSupabaseConfigured(false);
      if (showToast) {
        triggerToast(`Supabase: ${err.message || 'Check if table exists.'}`);
      }
    } finally {
      setIsSupabaseLoading(false);
    }
  };

  const disconnectSupabase = () => {
    localStorage.removeItem('pocket_supabase_url');
    localStorage.removeItem('pocket_supabase_key');
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setIsSupabaseConfigured(false);
    
    // Fallback to local storage favorites
    const stored = localStorage.getItem('pocket_motivation_favorites');
    if (stored) {
      try {
        setSavedQuotes(JSON.parse(stored));
      } catch (e) {
        setSavedQuotes([]);
      }
    } else {
      setSavedQuotes([]);
    }
    setDbQuotes([]);
    triggerToast('Disconnected. Using Local Storage.');
  };

  // Save favorites helper (keeps Local Storage and Supabase in sync)
  const updateSavedQuotes = async (newQuotes: Quote[], quoteToInsert?: Quote, isDeleteId?: string) => {
    setSavedQuotes(newQuotes);
    localStorage.setItem('pocket_motivation_favorites', JSON.stringify(newQuotes));

    if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
      try {
        const client = createClient(supabaseUrl, supabaseAnonKey);
        if (quoteToInsert) {
          const { error } = await client
            .from('pocket_quotes')
            .upsert([{
              id: quoteToInsert.id,
              text: quoteToInsert.text,
              author: quoteToInsert.author,
              category: quoteToInsert.category,
              mood: quoteToInsert.mood || 'general',
              explanation: quoteToInsert.explanation || '',
              is_custom: quoteToInsert.isCustom || false,
              is_favorite: quoteToInsert.isFavorite !== undefined ? quoteToInsert.isFavorite : true,
              timestamp: quoteToInsert.timestamp
            }]);
          if (error) throw error;
        } else if (isDeleteId) {
          if (isDeleteId.startsWith('fb-')) {
            const { error } = await client
              .from('pocket_quotes')
              .update({ is_favorite: false })
              .eq('id', isDeleteId);
            if (error) throw error;
          } else {
            const { error } = await client
              .from('pocket_quotes')
              .delete()
              .eq('id', isDeleteId);
            if (error) throw error;
          }
        }

        // Refresh database quote pool
        const { data } = await client.from('pocket_quotes').select('*');
        if (data) {
          const updatedMapped = data.map((row: any) => ({
            id: row.id,
            text: row.text,
            author: row.author,
            category: row.category,
            mood: row.mood || 'general',
            explanation: row.explanation || '',
            isCustom: row.is_custom || false,
            isFavorite: row.is_favorite !== undefined ? row.is_favorite : true,
            timestamp: Number(row.timestamp)
          }));
          setDbQuotes(updatedMapped);
        }
      } catch (err: any) {
        console.warn('Supabase Sync warning:', err);
        const isRlsError = err.message?.toLowerCase().includes('row-level security') || err.message?.toLowerCase().includes('policy');
        if (isRlsError) {
          triggerToast('Sync error: Please disable RLS or enable public policies on your pocket_quotes table.');
        } else {
          triggerToast(`Saved locally! Supabase sync: ${err.message || 'connection issue'}`);
        }
      }
    }
  };

  // Toast notifier
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Generate new quote (API proxy with client-side fallback)
  const generateNewQuote = async () => {
    setIsLoading(true);
    setShowExplanation(false);

    try {
      const response = await fetch('/api/generate-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          mood: selectedMood,
          customTopic: customTopic.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('API failed');
      }

      const quoteData: Quote = await response.json();
      setCurrentQuote(quoteData);

      // Manage generation streak
      const todayDate = new Date().toDateString();
      const lastGenStr = localStorage.getItem('pocket_motivation_last_gen');
      
      if (lastGenStr) {
        const lastGenDate = new Date(parseInt(lastGenStr, 10)).toDateString();
        if (lastGenDate !== todayDate) {
          const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
          if (lastGenDate === yesterdayStr) {
            const nextStreak = streakCount + 1;
            setStreakCount(nextStreak);
            localStorage.setItem('pocket_motivation_streak', nextStreak.toString());
          } else {
            setStreakCount(1);
            localStorage.setItem('pocket_motivation_streak', '1');
          }
          localStorage.setItem('pocket_motivation_last_gen', Date.now().toString());
          setHasGeneratedToday(true);
        }
      } else {
        localStorage.setItem('pocket_motivation_last_gen', Date.now().toString());
        localStorage.setItem('pocket_motivation_streak', '1');
        setStreakCount(1);
        setHasGeneratedToday(true);
      }

      triggerToast('✨ A fresh quote was created just for you!');
    } catch (err) {
      console.warn('API error, choosing a tailored fallback quote instead:', err);
      // Fallback pool: use database quotes if available, otherwise local curated fallbackQuotes
      const sourcePool = dbQuotes.length > 0 ? dbQuotes : fallbackQuotes;
      const matched = sourcePool.filter(
        q => q.category === selectedCategory || q.mood === selectedMood
      );
      const pool = matched.length > 0 ? matched : sourcePool;
      const fallbackSelected = pool[Math.floor(Math.random() * pool.length)];
      
      setCurrentQuote({
        ...fallbackSelected,
        id: `fb-fallback-${Date.now()}`,
        timestamp: Date.now()
      });
      triggerToast('Chosen from curated pocket archives.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if current is favorited
  const isCurrentFavorited = currentQuote 
    ? savedQuotes.some(q => q.text.toLowerCase() === currentQuote.text.toLowerCase())
    : false;

  // Toggle favorite status
  const toggleFavoriteCurrent = () => {
    if (!currentQuote) return;

    if (isCurrentFavorited) {
      const target = savedQuotes.find(q => q.text.toLowerCase() === currentQuote.text.toLowerCase());
      const filtered = savedQuotes.filter(q => q.text.toLowerCase() !== currentQuote.text.toLowerCase());
      updateSavedQuotes(filtered, undefined, target?.id);
      triggerToast('Removed from your library.');
    } else {
      const updated = [currentQuote, ...savedQuotes];
      updateSavedQuotes(updated, currentQuote);
      triggerToast('Saved to your library! ❤️');
    }
  };

  // Save manual quote
  const handleSaveCustomQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const newQuote: Quote = {
      id: `custom-${Date.now()}`,
      text: customText.trim(),
      author: customAuthor.trim() || 'Anonymous Self',
      category: customCategory,
      mood: 'general',
      explanation: 'You wrote this beautiful reminder yourself to light up your journey.',
      isCustom: true,
      timestamp: Date.now(),
    };

    const updated = [newQuote, ...savedQuotes];
    updateSavedQuotes(updated, newQuote);
    
    // Reset fields
    setCustomText('');
    setCustomAuthor('');
    triggerToast('Custom wisdom saved to your library!');
    setActiveTab('library');
  };

  // Delete quote from library
  const deleteFromLibrary = (id: string) => {
    const filtered = savedQuotes.filter(q => q.id !== id);
    updateSavedQuotes(filtered, undefined, id);
    triggerToast('Quote removed.');
  };

  // Share quote helper
  const shareQuote = async (quote: Quote | null) => {
    if (!quote) return;
    const shareText = `"${quote.text}" — ${quote.author} (via Pocket Motivation)`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pocket Motivation Quote',
          text: shareText,
        });
        triggerToast('Shared successfully!');
      } catch (e) {
        // Fallback copy to clipboard
        navigator.clipboard.writeText(shareText);
        setHasCopied(true);
        triggerToast('Copied inspiration to clipboard!');
        setTimeout(() => setHasCopied(false), 2000);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setHasCopied(true);
      triggerToast('Copied inspiration to clipboard!');
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  // Category Icon helper
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass': return <Compass className="w-4 h-4" />;
      case 'Brain': return <Brain className="w-4 h-4" />;
      case 'Briefcase': return <Briefcase className="w-4 h-4" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4" />;
      case 'Heart': return <Heart className="w-4 h-4" />;
      case 'Users': return <Users className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const activeCategoryConfig = categoryConfigs.find(c => c.id === selectedCategory);
  const activeMoodConfig = moodConfigs.find(m => m.id === selectedMood);

  return (
    <div className="w-full min-h-screen bg-[#060814] flex items-center justify-center font-sans overflow-x-hidden p-4 md:p-8 relative">
      {/* Mesh Ambient Orbs (Frosted Theme Backgrounds) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none animate-pulse duration-10000"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none animate-pulse duration-[8000ms]"></div>
      <div className="absolute top-[30%] right-[10%] w-[350px] h-[350px] bg-cyan-500/15 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>

      {/* Main Grid: Responsive layout containing both mock device and active details */}
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center relative z-10">
        
        {/* Left Side: Aesthetic and explanatory details for desktop layouts */}
        <div className="hidden lg:flex flex-col col-span-5 space-y-6 pr-6">
          <div className="border-l-[3px] border-fuchsia-500 pl-4 space-y-1">
            <span className="text-fuchsia-400 text-xs font-bold uppercase tracking-widest font-display block">Aesthetic Concept</span>
            <h2 className="text-white text-3xl font-extrabold font-display leading-tight">Frosted Glass UI</h2>
            <p className="text-slate-400 text-sm">
              An elegant, distraction-free environment utilizing high-transparency glass surfaces, fluid organic colors, and precise typography spacing.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                <Flame className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">Current Streak</span>
                <span className="text-lg font-bold text-white font-display">{streakCount} Days Motivated</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Pocket Motivation is designed to make intentional reflection a daily habit. Generate quotes matching your current mood and watch your momentum burn brighter.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
              <span className="text-[10px] uppercase text-indigo-400 font-bold block tracking-wider mb-1">AI Engine</span>
              <span className="text-white text-xs font-medium font-mono">Gemini-3.5-Flash</span>
            </div>
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
              <span className="text-[10px] uppercase text-fuchsia-400 font-bold block tracking-wider mb-1">Mode</span>
              <span className="text-white text-xs font-medium font-mono">Fully Client Proxy</span>
            </div>
          </div>
        </div>

        {/* Right Side: Smartphone Device Mockup (375px wide, beautiful glass panel) */}
        <div className="col-span-1 lg:col-span-7 flex justify-center w-full">
          
          <div className="relative w-full max-w-[395px] h-[780px] bg-white/[0.08] backdrop-blur-3xl rounded-[44px] border border-white/20 shadow-2xl flex flex-col overflow-hidden iphone-bezel animate-[fadeIn_0.5s_ease-out]">
            
            {/* Status Bar / Top Notch Simulation */}
            <div className="flex justify-between items-center px-8 pt-6 pb-2 text-white/90 text-xs font-semibold relative z-20">
              <span className="font-display">9:41</span>
              {/* Dynamic device pill */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#060814] rounded-b-2xl border-x border-b border-white/10 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white/5 mr-2"></div>
                <div className="w-10 h-1 bg-white/20 rounded-full"></div>
              </div>
              <div className="flex space-x-1.5 items-center">
                <span className="text-[9px] font-mono text-fuchsia-400 bg-fuchsia-500/10 px-1.5 py-0.5 rounded border border-fuchsia-500/20 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-fuchsia-400 animate-pulse"></span>
                  LIVE
                </span>
                <span className="text-white/60">⚡</span>
              </div>
            </div>

            {/* Header Area */}
            <div className="px-7 pt-4 pb-3 flex justify-between items-center border-b border-white/10 relative z-20 bg-white/[0.02]">
              <div>
                <h1 className="text-white text-lg font-bold tracking-tight font-display">Pocket Motive</h1>
                <p className="text-white/50 text-[9px] uppercase tracking-widest font-semibold">Daily Inspiration</p>
              </div>
              
              {/* Daily Streak Counter with Glow */}
              <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 shadow-inner">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                <span className="text-white font-bold text-xs font-mono">{streakCount}d</span>
              </div>
            </div>

            {/* Scrolling Content Panel */}
            <div className="flex-1 overflow-y-auto px-6 py-5 relative z-10 space-y-5 custom-scroll">
              
              {/* Tab: HOME (GENERATOR) */}
              {activeTab === 'home' && (
                <div className="space-y-5">
                  {/* Active Quote Display Area */}
                  <div className="relative bg-white/[0.04] rounded-3xl p-6 border border-white/10 shadow-lg min-h-[280px] flex flex-col justify-between overflow-hidden group">
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-fuchsia-500/10 rounded-full blur-2xl group-hover:bg-fuchsia-500/25 transition-all"></div>
                    <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/25 transition-all"></div>
                    
                    {/* Top Quote Icon and category chip */}
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-4xl text-fuchsia-400/30 font-serif select-none">“</span>
                      {currentQuote && (
                        <div className="flex space-x-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                            {currentQuote.category}
                          </span>
                          {currentQuote.mood && currentQuote.mood !== 'general' && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {currentQuote.mood}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Loading & Text container */}
                    <div className="my-5 flex-1 flex flex-col justify-center relative z-10">
                      {isLoading ? (
                        <div className="space-y-3 py-4">
                          <div className="h-4 bg-white/10 rounded-md w-full animate-pulse"></div>
                          <div className="h-4 bg-white/10 rounded-md w-11/12 animate-pulse"></div>
                          <div className="h-4 bg-white/10 rounded-md w-4/5 animate-pulse"></div>
                        </div>
                      ) : currentQuote ? (
                        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                          <p className="text-white text-xl md:text-2xl font-medium leading-relaxed italic font-display">
                            {currentQuote.text}
                          </p>
                          <p className="text-fuchsia-400 font-bold tracking-widest text-xs uppercase text-right">
                            — {currentQuote.author}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center text-sm py-8">Select criteria below to generate your customized pocket motivation.</p>
                      )}
                    </div>

                    {/* Interactive explanation/coaching toggle */}
                    {currentQuote?.explanation && !isLoading && (
                      <div className="border-t border-white/5 pt-4 flex justify-between items-center relative z-10">
                        <button 
                          onClick={() => setShowExplanation(!showExplanation)}
                          className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>{showExplanation ? 'Hide Coaching Guide' : 'Read Deep Coaching'}</span>
                        </button>
                        
                        {currentQuote.isCustom && (
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                            Custom Authored
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Animated explanation slide-down */}
                  {showExplanation && currentQuote?.explanation && !isLoading && (
                    <div className="bg-indigo-500/10 rounded-2xl p-4 border border-indigo-500/25 animate-[slideDown_0.25s_ease-out] text-slate-200 text-xs leading-relaxed space-y-1 relative">
                      <p className="font-semibold text-indigo-300 uppercase tracking-widest text-[9px] mb-1">Perspective & Guidance</p>
                      <p>{currentQuote.explanation}</p>
                    </div>
                  )}

                  {/* Generation customization controls */}
                  <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center space-x-1.5 text-slate-200">
                        <Sliders className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold tracking-wider uppercase font-display">Refine Topic & Mind</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Tailored Content</span>
                    </div>

                    {/* Mood Selector Grid */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">How are you feeling right now?</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {moodConfigs.map((mood) => {
                          const isSelected = selectedMood === mood.id;
                          return (
                            <button
                              key={mood.id}
                              onClick={() => setSelectedMood(mood.id as MoodType)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                                isSelected 
                                  ? 'bg-white/15 border-white/30 text-white font-medium scale-[1.03]' 
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                              }`}
                            >
                              <span className="text-lg mb-0.5">{mood.emoji}</span>
                              <span className="text-[10px] leading-tight truncate w-full">{mood.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Category Selector Rows */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Inspirational Theme Focus</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {categoryConfigs.map((cat) => {
                          const isSelected = selectedCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.id as CategoryType)}
                              className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border transition-all text-left ${
                                isSelected 
                                  ? 'bg-white/15 border-white/30 text-white font-medium' 
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                              }`}
                            >
                              <span className="p-1 rounded-lg bg-white/5 text-indigo-300">
                                {getCategoryIcon(cat.iconName)}
                              </span>
                              <span className="text-[10px] font-medium truncate">{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Topic Focus Input */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Custom Focus (Optional)</label>
                        {customTopic && (
                          <button onClick={() => setCustomTopic('')} className="text-[9px] text-fuchsia-400 hover:underline">Clear</button>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="e.g. debugging, deep focus, workout..." 
                        className="w-full text-xs px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Core Actions Buttons */}
                  <div className="space-y-2">
                    <button 
                      onClick={generateNewQuote}
                      disabled={isLoading}
                      className="w-full py-4 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 disabled:opacity-50 text-white font-bold tracking-widest text-xs uppercase rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating Wisdom...</span>
                        </>
                      ) : (
                        <>
                          <Sparkle className="w-4 h-4" />
                          <span>Generate New Quote</span>
                        </>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={toggleFavoriteCurrent}
                        disabled={!currentQuote || isLoading}
                        className={`flex items-center justify-center space-x-2 py-3.5 rounded-xl border transition-all active:scale-95 disabled:opacity-40 ${
                          isCurrentFavorited 
                            ? 'bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border-fuchsia-500/40 text-fuchsia-300' 
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isCurrentFavorited ? 'fill-fuchsia-500 text-fuchsia-500' : ''}`} />
                        <span className="text-[10px] font-bold tracking-widest uppercase">
                          {isCurrentFavorited ? 'Favorited' : 'Save'}
                        </span>
                      </button>

                      <button 
                        onClick={() => shareQuote(currentQuote)}
                        disabled={!currentQuote || isLoading}
                        className="flex items-center justify-center space-x-2 py-3.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/80 transition-all active:scale-95 disabled:opacity-40"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold tracking-widest uppercase">Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: LIBRARY (FAVORITES) */}
              {activeTab === 'library' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">My Saved Library ({savedQuotes.length})</span>
                    {savedQuotes.length > 0 && (
                      <button 
                        onClick={() => {
                          if (confirm('Are you sure you want to clear your entire saved library?')) {
                            updateSavedQuotes([]);
                            triggerToast('Library cleared.');
                          }
                        }}
                        className="text-[9px] text-red-400 hover:underline hover:text-red-300"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {savedQuotes.length === 0 ? (
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                        <Heart className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-white text-sm font-semibold">Your Library is Empty</p>
                        <p className="text-slate-400 text-xs">Tap "Save" on the generator screen to archive quotes that resonate with you.</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('home')}
                        className="text-xs font-bold text-fuchsia-400 hover:underline pt-2 inline-block"
                      >
                        Go find inspiration
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedQuotes.map((quote) => (
                        <div 
                          key={quote.id}
                          className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3 hover:border-white/20 transition-all relative group"
                        >
                          <p className="text-white text-sm font-medium italic leading-relaxed">
                            "{quote.text}"
                          </p>
                          
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-fuchsia-400 font-bold uppercase tracking-wider">— {quote.author}</span>
                            
                            <div className="flex items-center space-x-1.5 opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => shareQuote(quote)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                                title="Share Quote"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => deleteFromLibrary(quote.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                title="Delete Quote"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {quote.explanation && (
                            <details className="text-[11px] text-slate-400 border-t border-white/5 pt-2">
                              <summary className="cursor-pointer hover:text-slate-200 focus:outline-none select-none font-semibold text-indigo-300">
                                View Coaching Context
                              </summary>
                              <p className="mt-1 leading-relaxed bg-black/25 p-2 rounded-lg text-slate-300 border border-white/5">
                                {quote.explanation}
                              </p>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: CREATE CUSTOM REMINDERS */}
              {activeTab === 'create' && (
                <div className="space-y-4">
                  <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase block">Write Your Own Wisdom</span>
                  
                  <form onSubmit={handleSaveCustomQuote} className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Your Motivational Quote</label>
                      <textarea
                        required
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Type a powerful phrase or daily reminder that lifts you up..."
                        rows={4}
                        className="w-full text-xs p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Author Attribution</label>
                      <input
                        type="text"
                        value={customAuthor}
                        onChange={(e) => setCustomAuthor(e.target.value)}
                        placeholder="e.g. My Inner Voice, Ancient Proverb, or Anonymous"
                        className="w-full text-xs px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Category Alignment</label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as CategoryType)}
                        className="w-full text-xs px-3 py-2 bg-[#0d122b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                      >
                        {categoryConfigs.map((c) => (
                          <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to My Library</span>
                    </button>
                  </form>

                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
                    <p className="font-semibold text-slate-300">💡 Tip: Self-Generated Reminders</p>
                    <p className="leading-relaxed">
                      Writing your own reminders reinforces intentional thought loops. These will show up in your Saved Library tab where you can easily read, copy, or share them.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Tab Navigation Bar */}
            <div className="h-16 border-t border-white/10 flex items-center justify-around px-2 bg-white/[0.04] relative z-20">
              <button 
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center flex-1 py-1 transition-all ${
                  activeTab === 'home' ? 'text-fuchsia-400 scale-105 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wide">Generator</span>
              </button>

              <button 
                onClick={() => setActiveTab('library')}
                className={`flex flex-col items-center flex-1 py-1 transition-all ${
                  activeTab === 'library' ? 'text-fuchsia-400 scale-105 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Heart className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wide">Library</span>
              </button>

              <button 
                onClick={() => setActiveTab('create')}
                className={`flex flex-col items-center flex-1 py-1 transition-all ${
                  activeTab === 'create' ? 'text-fuchsia-400 scale-105 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wide">Custom</span>
              </button>
            </div>

            {/* Native Toast Alerts */}
            {toastMessage && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-white/20 text-white px-4 py-2 rounded-full text-xs font-medium tracking-wide shadow-2xl flex items-center space-x-2 z-50 animate-[fadeIn_0.2s_ease-out]">
                <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-ping"></div>
                <span>{toastMessage}</span>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
