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
  QrCode,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Quote, MoodType, CategoryType } from './types';
import { fallbackQuotes, moodConfigs, categoryConfigs } from './data/fallbackQuotes';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function App() {
  // Navigation & tabs
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'create' | 'stats'>('home');

  // Supabase Integration state (disabled for local only mode)
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

  // Generated Quote history & statistics
  const [generatedHistory, setGeneratedHistory] = useState<Quote[]>([]);

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

    // Load generated quote history from local storage
    const storedHistory = localStorage.getItem('pocket_motivation_generated_history');
    if (storedHistory) {
      try {
        setGeneratedHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error('Error parsing stored history', e);
      }
    } else {
      setGeneratedHistory([]);
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

      // Save to tracking history
      const newGeneratedQuote: Quote = {
        ...quoteData,
        timestamp: Date.now()
      };
      setGeneratedHistory(prev => {
        const next = [newGeneratedQuote, ...prev];
        localStorage.setItem('pocket_motivation_generated_history', JSON.stringify(next));
        return next;
      });

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
      
      const newGeneratedQuote: Quote = {
        ...fallbackSelected,
        id: `fb-fallback-${Date.now()}`,
        timestamp: Date.now(),
        mood: selectedMood,
        category: selectedCategory
      };
      setCurrentQuote(newGeneratedQuote);

      // Save to tracking history
      setGeneratedHistory(prev => {
        const next = [newGeneratedQuote, ...prev];
        localStorage.setItem('pocket_motivation_generated_history', JSON.stringify(next));
        return next;
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

  // Filter history to last 30 days
  const last30DaysQuotes = generatedHistory.filter(q => {
    const qTime = q.timestamp || Date.now();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return qTime >= thirtyDaysAgo;
  });

  // Mood calculations
  const moodCounts = moodConfigs.reduce((acc, config) => {
    acc[config.id] = 0;
    return acc;
  }, {} as Record<string, number>);

  last30DaysQuotes.forEach(q => {
    const mood = (q.mood || 'general') as MoodType;
    if (moodCounts[mood] !== undefined) {
      moodCounts[mood]++;
    } else {
      moodCounts['general']++;
    }
  });

  // Calculate top mood
  let topMoodId: MoodType = 'general';
  let maxMoodCount = -1;
  Object.entries(moodCounts).forEach(([m, val]) => {
    if (val > maxMoodCount) {
      maxMoodCount = val;
      topMoodId = m as MoodType;
    }
  });
  const topMoodConfig = moodConfigs.find(m => m.id === topMoodId) || moodConfigs[5];

  // Category calculations
  const categoryCounts = categoryConfigs.reduce((acc, config) => {
    acc[config.id] = 0;
    return acc;
  }, {} as Record<string, number>);

  last30DaysQuotes.forEach(q => {
    const cat = (q.category || 'general') as CategoryType;
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat]++;
    } else {
      categoryCounts['general']++;
    }
  });

  // Calculate top category
  let topCategoryId: CategoryType = 'general';
  let maxCatCount = -1;
  Object.entries(categoryCounts).forEach(([c, val]) => {
    if (val > maxCatCount) {
      maxCatCount = val;
      topCategoryId = c as CategoryType;
    }
  });
  const topCategoryConfig = categoryConfigs.find(c => c.id === topCategoryId) || categoryConfigs[0];

  // Recharts Chart Data
  const moodChartData = moodConfigs.map(config => ({
    name: config.label,
    value: moodCounts[config.id] || 0,
    color: config.color,
    emoji: config.emoji
  })).filter(item => item.value > 0);

  const categoryChartData = categoryConfigs.map(config => ({
    name: config.label,
    shortName: config.label.split(' ')[0],
    value: categoryCounts[config.id] || 0,
    color: config.color
  }));

  const activeCategoryConfig = categoryConfigs.find(c => c.id === selectedCategory);
  const activeMoodConfig = moodConfigs.find(m => m.id === selectedMood);

  return (
    <div className="w-full h-screen sm:h-auto sm:min-h-screen bg-[#F4EFE6] flex items-center justify-center font-sans overflow-hidden sm:overflow-x-hidden sm:p-4 md:p-8 relative">
      {/* Decorative Warm Vignette shadow */}
      <div className="absolute inset-0 bg-radial-[rgba(252,250,242,0)_40%,rgba(140,120,95,0.06)_100%] pointer-events-none"></div>

      {/* Main Grid: Responsive layout containing both mock device and active details */}
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center relative z-10 h-full sm:h-auto">
        
        {/* Left Side: Aesthetic and explanatory details for desktop layouts */}
        <div className="hidden lg:flex flex-col col-span-5 space-y-6 pr-6">
          <div className="border-l-[3px] border-[#8F2A19] pl-4 space-y-1">
            <span className="text-[#8F2A19] text-xs font-bold uppercase tracking-widest font-sans block">Aesthetic Concept</span>
            <h2 className="text-[#2D2824] text-3xl font-extrabold font-classic-heading leading-tight">Classic Library</h2>
            <p className="text-[#615A52] text-sm">
              A timeless, distraction-free workspace styled with warm parchment papers, delicate book borders, and elegant serif typography to calm your mind and focus your intent.
            </p>
          </div>

          <div className="bg-[#FCFAF2] rounded-2xl p-5 border border-[#E6DEC9] classic-shadow space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#8F2A19]/15 flex items-center justify-center text-[#8F2A19]">
                <Flame className="w-4 h-4 animate-bounce text-[#C59B27] fill-[#C59B27]" />
              </div>
              <div>
                <span className="text-xs text-[#615A52] font-semibold block uppercase tracking-wider">Current Streak</span>
                <span className="text-lg font-bold text-[#2D2824] font-display">{streakCount} Days Motivated</span>
              </div>
            </div>

            <p className="text-xs text-[#615A52] leading-relaxed">
              Pocket Motivation is designed to make intentional reflection a daily habit. Generate quotes matching your current mood and watch your momentum burn brighter.
            </p>
          </div>
        </div>

        {/* Right Side: Smartphone Device Mockup */}
        <div className="col-span-1 lg:col-span-7 flex justify-center w-full h-full sm:h-auto">
          
          <div className="relative w-full max-w-full sm:max-w-[395px] h-screen sm:h-[780px] bg-[#FDFBF7] rounded-none sm:rounded-[44px] border-none sm:border sm:border-[#C4B295] shadow-none sm:classic-shadow flex flex-col overflow-hidden animate-[fadeIn_0.5s_ease-out]">
            
            {/* Header Area */}
            <div className="px-7 pt-6 sm:pt-5 pb-4 flex justify-between items-center border-b border-[#E6DEC9] relative z-20 bg-[#F8F5EE]">
              <div>
                <h1 className="text-[#2D2824] text-lg font-bold tracking-widest font-classic-heading">Pocket Motive</h1>
                <p className="text-[#8C8276] text-[9px] uppercase tracking-widest font-semibold font-sans">Daily Inspiration</p>
              </div>
              
              {/* Daily Streak Counter */}
              <div className="flex items-center space-x-2 bg-[#F3EFE3] px-3 py-1.5 rounded-full border border-[#D6CDB5]">
                <Flame className="w-4 h-4 text-[#C59B27] fill-[#C59B27]" />
                <span className="text-[#2D2824] font-bold text-xs font-mono">{streakCount}d</span>
              </div>
            </div>

            {/* Scrolling Content Panel */}
            <div className="flex-1 overflow-y-auto px-6 py-5 relative z-10 space-y-5 custom-scroll">
              
              {/* Tab: HOME (GENERATOR) */}
              {activeTab === 'home' && (
                <div className="space-y-5">
                  {/* Active Quote Display Area */}
                  <div className="relative bg-[#FCFAF3] rounded-3xl p-6 border-4 border-double border-[#C4B295] classic-shadow min-h-[280px] flex flex-col justify-between overflow-hidden group">
                    
                    {/* Top Quote Icon and category chip */}
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-4xl text-[#8F2A19]/25 font-serif select-none">“</span>
                      {currentQuote && (
                        <div className="flex space-x-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#F5F2EB] text-[#615A52] border border-[#E6DEC9]">
                            {currentQuote.category}
                          </span>
                          {currentQuote.mood && currentQuote.mood !== 'general' && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#8F2A19]/10 text-[#8F2A19] border border-[#8F2A19]/20">
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
                          <div className="h-4 bg-stone-200/60 rounded-md w-full animate-pulse"></div>
                          <div className="h-4 bg-stone-200/60 rounded-md w-11/12 animate-pulse"></div>
                          <div className="h-4 bg-stone-200/60 rounded-md w-4/5 animate-pulse"></div>
                        </div>
                      ) : currentQuote ? (
                        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                          <p className="text-[#2D2824] text-xl md:text-2xl font-serif font-display leading-relaxed italic">
                            {currentQuote.text}
                          </p>
                          <p className="text-[#8F2A19] font-bold tracking-widest text-xs uppercase text-right">
                            — {currentQuote.author}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[#615A52] text-center text-sm py-8">Select criteria below to generate your customized pocket motivation.</p>
                      )}
                    </div>

                    {/* Interactive explanation/coaching toggle */}
                    {currentQuote?.explanation && !isLoading && (
                      <div className="border-t border-[#E6DEC9] pt-4 flex justify-between items-center relative z-10">
                        <button 
                          onClick={() => setShowExplanation(!showExplanation)}
                          className="flex items-center space-x-1.5 text-xs text-[#2D2824] hover:text-[#8F2A19] transition-all bg-[#F5F2EB] hover:bg-[#EAE3D2] px-2.5 py-1 rounded-lg border border-[#E6DEC9]"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>{showExplanation ? 'Hide Coaching Guide' : 'Read Deep Coaching'}</span>
                        </button>
                        
                        {currentQuote.isCustom && (
                          <span className="text-[9px] text-[#3A5F43] bg-[#3A5F43]/10 px-2 py-0.5 rounded-full border border-[#3A5F43]/20">
                            Custom Authored
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Animated explanation slide-down */}
                  {showExplanation && currentQuote?.explanation && !isLoading && (
                    <div className="bg-[#F3EFE3] rounded-2xl p-4 border border-[#D6CDB5] animate-[slideDown_0.25s_ease-out] text-[#2D2824] text-xs leading-relaxed space-y-1 relative">
                      <p className="font-semibold text-[#8F2A19] uppercase tracking-widest text-[9px] mb-1">Perspective & Guidance</p>
                      <p>{currentQuote.explanation}</p>
                    </div>
                  )}

                  {/* Generation customization controls */}
                  <div className="bg-[#F8F5EE] rounded-3xl p-5 border border-[#E6DEC9] space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E6DEC9] pb-2">
                      <div className="flex items-center space-x-1.5 text-[#2D2824]">
                        <Sliders className="w-4 h-4 text-[#8F2A19]" />
                        <span className="text-xs font-bold tracking-wider uppercase font-sans">Refine Topic & Mind</span>
                      </div>
                      <span className="text-[10px] text-[#8C8276]">Tailored Content</span>
                    </div>

                    {/* Mood Selector Grid */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#615A52] font-semibold uppercase tracking-wider block">How are you feeling right now?</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {moodConfigs.map((mood) => {
                          const isSelected = selectedMood === mood.id;
                          return (
                            <button
                              key={mood.id}
                              onClick={() => setSelectedMood(mood.id as MoodType)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                                isSelected 
                                  ? 'bg-[#8F2A19] border-[#8F2A19] text-[#FCFAF3] scale-[1.02] font-semibold classic-shadow' 
                                  : 'bg-[#FCFAF3] border-[#E6DEC9] hover:bg-[#F3EFE3] text-[#615A52]'
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
                      <label className="text-[10px] text-[#615A52] font-semibold uppercase tracking-wider block">Inspirational Theme Focus</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {categoryConfigs.map((cat) => {
                          const isSelected = selectedCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.id as CategoryType)}
                              className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border transition-all text-left ${
                                isSelected 
                                  ? 'bg-[#8F2A19] border-[#8F2A19] text-[#FCFAF3] font-semibold classic-shadow' 
                                  : 'bg-[#FCFAF3] border-[#E6DEC9] hover:bg-[#F3EFE3] text-[#615A52]'
                              }`}
                            >
                              <span className={`p-1 rounded-lg ${isSelected ? 'bg-white/20 text-[#FCFAF3]' : 'bg-[#F5F2EB] text-[#8F2A19]'}`}>
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
                        <label className="text-[10px] text-[#615A52] font-semibold uppercase tracking-wider block">Custom Focus (Optional)</label>
                        {customTopic && (
                          <button onClick={() => setCustomTopic('')} className="text-[9px] text-[#8F2A19] hover:underline">Clear</button>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="e.g. debugging, deep focus, workout..." 
                        className="w-full text-xs px-3 py-2 bg-[#FCFAF3] border border-[#E6DEC9] rounded-xl text-[#2D2824] placeholder-stone-400 focus:outline-none focus:border-[#8F2A19] focus:ring-1 focus:ring-[#8F2A19]/20"
                      />
                    </div>
                  </div>

                  {/* Core Actions Buttons */}
                  <div className="space-y-2">
                    <button 
                      onClick={generateNewQuote}
                      disabled={isLoading}
                      className="w-full py-4 bg-[#8F2A19] hover:bg-[#731F11] disabled:opacity-50 text-[#FCFAF3] font-bold tracking-widest text-xs uppercase rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2"
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
                            ? 'bg-[#8F2A19]/15 hover:bg-[#8F2A19]/25 border-[#8F2A19]/30 text-[#8F2A19]' 
                            : 'bg-[#FCFAF3] hover:bg-[#F3EFE3] border-[#E6DEC9] text-[#615A52]'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isCurrentFavorited ? 'fill-[#8F2A19] text-[#8F2A19]' : ''}`} />
                        <span className="text-[10px] font-bold tracking-widest uppercase">
                          {isCurrentFavorited ? 'Favorited' : 'Save'}
                        </span>
                      </button>

                      <button 
                        onClick={() => shareQuote(currentQuote)}
                        disabled={!currentQuote || isLoading}
                        className="flex items-center justify-center space-x-2 py-3.5 bg-[#FCFAF3] hover:bg-[#F3EFE3] rounded-xl border border-[#E6DEC9] text-[#615A52] transition-all active:scale-95 disabled:opacity-40"
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
                    <span className="text-[11px] font-bold tracking-wider text-[#2D2824] uppercase">My Saved Library ({savedQuotes.length})</span>
                    {savedQuotes.length > 0 && (
                      <button 
                        onClick={() => {
                          if (confirm('Are you sure you want to clear your entire saved library?')) {
                            updateSavedQuotes([]);
                            triggerToast('Library cleared.');
                          }
                        }}
                        className="text-[9px] text-red-700 hover:text-red-800 hover:underline font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {savedQuotes.length === 0 ? (
                    <div className="bg-[#F8F5EE] border border-[#E6DEC9] rounded-3xl p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#F5F2EB] flex items-center justify-center mx-auto text-[#8C8276]">
                        <Heart className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#2D2824] text-sm font-semibold">Your Library is Empty</p>
                        <p className="text-[#615A52] text-xs">Tap "Save" on the generator screen to archive quotes that resonate with you.</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('home')}
                        className="text-xs font-bold text-[#8F2A19] hover:underline pt-2 inline-block"
                      >
                        Go find inspiration
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedQuotes.map((quote) => (
                        <div 
                          key={quote.id}
                          className="bg-[#FCFAF3] border border-[#E6DEC9] rounded-2xl p-4 space-y-3 hover:border-[#C4B295] transition-all relative group classic-shadow"
                        >
                          <p className="text-[#2D2824] text-sm font-serif italic leading-relaxed">
                            "{quote.text}"
                          </p>
                          
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[#8F2A19] font-bold uppercase tracking-wider">— {quote.author}</span>
                            
                            <div className="flex items-center space-x-1.5 opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => shareQuote(quote)}
                                className="p-1.5 rounded-lg bg-[#F5F2EB] hover:bg-[#EAE3D2] text-[#615A52] border border-[#E6DEC9]"
                                title="Share Quote"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => deleteFromLibrary(quote.id)}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                                title="Delete Quote"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {quote.explanation && (
                            <details className="text-[11px] text-[#615A52] border-t border-[#E6DEC9] pt-2">
                              <summary className="cursor-pointer hover:text-[#8F2A19] focus:outline-none select-none font-semibold text-[#8F2A19]">
                                View Coaching Context
                              </summary>
                              <p className="mt-1 leading-relaxed bg-[#F3EFE3] p-2.5 rounded-lg text-[#2D2824] border border-[#D6CDB5]">
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
                  <span className="text-[11px] font-bold tracking-wider text-[#2D2824] uppercase block">Write Your Own Wisdom</span>
                  
                  <form onSubmit={handleSaveCustomQuote} className="bg-[#F8F5EE] border border-[#E6DEC9] rounded-3xl p-5 space-y-4 classic-shadow">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#615A52] font-semibold uppercase tracking-wider block">Your Motivational Quote</label>
                      <textarea
                        required
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Type a powerful phrase or daily reminder that lifts you up..."
                        rows={4}
                        className="w-full text-xs p-3 bg-[#FCFAF3] border border-[#E6DEC9] rounded-xl text-[#2D2824] placeholder-stone-400 focus:outline-none focus:border-[#8F2A19] focus:ring-1 focus:ring-[#8F2A19]/20 resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#615A52] font-semibold uppercase tracking-wider block">Author Attribution</label>
                      <input
                        type="text"
                        value={customAuthor}
                        onChange={(e) => setCustomAuthor(e.target.value)}
                        placeholder="e.g. My Inner Voice, Ancient Proverb, or Anonymous"
                        className="w-full text-xs px-3 py-2 bg-[#FCFAF3] border border-[#E6DEC9] rounded-xl text-[#2D2824] placeholder-stone-400 focus:outline-none focus:border-[#8F2A19] focus:ring-1 focus:ring-[#8F2A19]/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#615A52] font-semibold uppercase tracking-wider block">Category Alignment</label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as CategoryType)}
                        className="w-full text-xs px-3 py-2 bg-[#FCFAF3] border border-[#E6DEC9] rounded-xl text-[#2D2824] focus:outline-none focus:border-[#8F2A19] focus:ring-1 focus:ring-[#8F2A19]/20"
                      >
                        {categoryConfigs.map((c) => (
                          <option key={c.id} value={c.id} className="bg-[#FCFAF3] text-[#2D2824]">
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#8F2A19] hover:bg-[#731F11] text-[#FCFAF3] text-xs font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to My Library</span>
                    </button>
                  </form>

                  <div className="bg-[#F3EFE3] border border-[#D6CDB5] rounded-2xl p-4 text-xs text-[#615A52] space-y-2">
                    <p className="font-semibold text-[#8F2A19]">💡 Tip: Self-Generated Reminders</p>
                    <p className="leading-relaxed">
                      Writing your own reminders reinforces intentional thought loops. These will show up in your Saved Library tab where you can easily read, copy, or share them.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab: STATISTICS */}
              {activeTab === 'stats' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold tracking-wider text-[#2D2824] uppercase">30-Day Insights</span>
                    <div className="flex items-center space-x-2">
                      {generatedHistory.length > 0 && (
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to reset all your statistics and local history? This cannot be undone.')) {
                              setGeneratedHistory([]);
                              localStorage.removeItem('pocket_motivation_generated_history');
                              triggerToast('Statistics and logs have been reset.');
                            }
                          }}
                          className="text-[10px] text-[#8F2A19] hover:underline flex items-center gap-1 font-bold"
                          title="Reset Statistics"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      )}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-[#8F2A19]/10 text-[#8F2A19] border-[#8F2A19]/20 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        LOCAL LOGS
                      </span>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#F8F5EE] border border-[#E6DEC9] rounded-2xl p-2.5 flex flex-col items-center text-center classic-shadow">
                      <span className="text-[9px] text-[#615A52] font-bold uppercase tracking-wider text-[8px]">Generated</span>
                      <span className="text-sm font-extrabold text-[#8F2A19] mt-1 font-display">{last30DaysQuotes.length}</span>
                      <span className="text-[7px] text-[#8C8276] mt-0.5">last 30d</span>
                    </div>

                    <div className="bg-[#F8F5EE] border border-[#E6DEC9] rounded-2xl p-2.5 flex flex-col items-center text-center truncate classic-shadow">
                      <span className="text-[9px] text-[#615A52] font-bold uppercase tracking-wider text-[8px]">Top Mood</span>
                      <span className="text-xs font-bold text-[#3D6E53] mt-1 flex items-center gap-0.5">
                        <span>{topMoodConfig.emoji}</span>
                        <span className="truncate max-w-[40px]">{topMoodConfig.label}</span>
                      </span>
                      <span className="text-[7px] text-[#8C8276] mt-0.5">felt {maxMoodCount}x</span>
                    </div>

                    <div className="bg-[#F8F5EE] border border-[#E6DEC9] rounded-2xl p-2.5 flex flex-col items-center text-center truncate classic-shadow">
                      <span className="text-[9px] text-[#615A52] font-bold uppercase tracking-wider text-[8px]">Top Focus</span>
                      <span className="text-xs font-bold text-[#965664] mt-1 flex items-center gap-0.5">
                        <span className="truncate max-w-[48px]">{topCategoryConfig.label.split(' ')[0]}</span>
                      </span>
                      <span className="text-[7px] text-[#8C8276] mt-0.5">read {maxCatCount}x</span>
                    </div>
                  </div>

                  {/* Mood Ring Card */}
                  <div className="bg-[#F8F5EE] border border-[#E6DEC9] rounded-3xl p-4 space-y-2 classic-shadow">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-[10px] font-bold text-[#2D2824] uppercase tracking-wider flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-[#8F2A19]" />
                        <span>Mood Distribution</span>
                      </h3>
                      <span className="text-[8px] text-[#8C8276] font-mono">Radial Profiles</span>
                    </div>

                    {moodChartData.length === 0 ? (
                      <div className="h-28 flex items-center justify-center text-[#615A52] text-xs">
                        No generations logged yet.
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-full h-32 relative flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={moodChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={28}
                                outerRadius={42}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {moodChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-[#FCFAF3] border border-[#E6DEC9] px-2.5 py-1 rounded text-[10px] text-[#2D2824] flex items-center gap-1 classic-shadow">
                                        <span>{data.emoji}</span>
                                        <span>{data.name}:</span>
                                        <span className="font-bold">{data.value}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Inner details */}
                          <div className="absolute flex flex-col items-center pointer-events-none">
                            <span className="text-[8px] text-[#8C8276] font-bold uppercase tracking-wider">Top</span>
                            <span className="text-xs">{topMoodConfig.emoji}</span>
                          </div>
                        </div>

                        {/* Custom Legend */}
                        <div className="grid grid-cols-2 gap-1.5 w-full pt-1">
                          {moodChartData.map((m, idx) => (
                            <div key={idx} className="flex items-center space-x-1.5 text-[8px] text-[#2D2824] bg-[#FCFAF3] border border-[#E6DEC9] px-2 py-1 rounded-lg">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                              <span className="truncate">{m.emoji} {m.name}</span>
                              <span className="font-bold text-[#8C8276] ml-auto">{m.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Focus Categories Card */}
                  <div className="bg-[#F8F5EE] border border-[#E6DEC9] rounded-3xl p-4 space-y-2 classic-shadow">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-[10px] font-bold text-[#2D2824] uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#8F2A19]" />
                        <span>Inspirational Focus</span>
                      </h3>
                      <span className="text-[8px] text-[#8C8276] font-mono">Categories</span>
                    </div>

                    <div className="w-full pr-2">
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart
                          data={categoryChartData}
                          layout="vertical"
                          margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis 
                            type="category" 
                            dataKey="shortName" 
                            stroke="#615A52" 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(143, 42, 25, 0.05)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-[#FCFAF3] border border-[#E6DEC9] px-2.5 py-1 rounded text-[10px] text-[#2D2824] classic-shadow">
                                    <span className="font-bold text-[#8F2A19]">{data.name}:</span> {data.value} quotes
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={8}>
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Tab Navigation Bar */}
            <div className="h-16 border-t border-[#E6DEC9] flex items-center justify-around px-2 bg-[#F8F5EE] relative z-20">
              <button 
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center flex-1 py-1 transition-all ${
                  activeTab === 'home' ? 'text-[#8F2A19] scale-105 font-semibold' : 'text-[#8C8276] hover:text-[#2D2824]'
                }`}
              >
                <Compass className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wide">Generator</span>
              </button>

              <button 
                onClick={() => setActiveTab('library')}
                className={`flex flex-col items-center flex-1 py-1 transition-all ${
                  activeTab === 'library' ? 'text-[#8F2A19] scale-105 font-semibold' : 'text-[#8C8276] hover:text-[#2D2824]'
                }`}
              >
                <Heart className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wide">Library</span>
              </button>

              <button 
                onClick={() => setActiveTab('create')}
                className={`flex flex-col items-center flex-1 py-1 transition-all ${
                  activeTab === 'create' ? 'text-[#8F2A19] scale-105 font-semibold' : 'text-[#8C8276] hover:text-[#2D2824]'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wide">Custom</span>
              </button>

              <button 
                onClick={() => setActiveTab('stats')}
                className={`flex flex-col items-center flex-1 py-1 transition-all ${
                  activeTab === 'stats' ? 'text-[#8F2A19] scale-105 font-semibold' : 'text-[#8C8276] hover:text-[#2D2824]'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wide">Stats</span>
               </button>
             </div>
 
             {/* Native Toast Alerts */}
             {toastMessage && (
               <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#8F2A19] border border-[#E6DEC9] text-[#FCFAF3] px-4 py-2 rounded-full text-xs font-medium tracking-wide shadow-lg flex items-center space-x-2 z-50 animate-[fadeIn_0.2s_ease-out]">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#C59B27] animate-ping"></div>
                 <span>{toastMessage}</span>
               </div>
             )}

          </div>

        </div>

      </div>
    </div>
  );
}
