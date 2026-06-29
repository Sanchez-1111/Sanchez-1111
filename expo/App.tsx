import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  SafeAreaView,
  Platform,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Compass,
  Brain,
  Briefcase,
  Sparkles,
  Heart,
  Users,
  Flame,
  Info,
  Sliders,
  Plus,
  Share2,
  Trash2,
  TrendingUp,
  Activity
} from 'lucide-react-native';

import { Quote, MoodType, CategoryType } from './src/types';
import { fallbackQuotes, moodConfigs, categoryConfigs } from './src/data/fallbackQuotes';

const API_HOST = 'https://ais-dev-w2doigfnlosfgitirh4hf7-197019432409.asia-east1.run.app';

export default function App() {
  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'create' | 'stats'>('home');

  // Customization criteria
  const [selectedMood, setSelectedMood] = useState<MoodType>('general');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('general');
  const [customTopic, setCustomTopic] = useState('');

  // Active Quote State
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // App-wide data persistence
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [generatedHistory, setGeneratedHistory] = useState<Quote[]>([]);
  const [streakCount, setStreakCount] = useState(1);
  const [customApiHost, setCustomApiHost] = useState('');

  // Custom Creator fields
  const [customText, setCustomText] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customCategory, setCustomCategory] = useState<CategoryType>('general');

  // Alerts & UX Feedbacks
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hostInput, setHostInput] = useState('');

  // Set default active quote on mount
  useEffect(() => {
    if (fallbackQuotes.length > 0 && !currentQuote) {
      setCurrentQuote({
        ...fallbackQuotes[0],
        id: 'initial',
        timestamp: Date.now()
      });
    }
  }, []);

  // Hydrate states from AsyncStorage
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem('pocket_motivation_generated_history');
        if (storedHistory) {
          setGeneratedHistory(JSON.parse(storedHistory));
        }

        const storedSaved = await AsyncStorage.getItem('pocket_motivation_saved_library');
        if (storedSaved) {
          setSavedQuotes(JSON.parse(storedSaved));
        }

        const storedStreak = await AsyncStorage.getItem('pocket_motivation_streak');
        if (storedStreak) {
          setStreakCount(parseInt(storedStreak, 10));
        }

        const storedApiHost = await AsyncStorage.getItem('pocket_motivation_api_host');
        if (storedApiHost) {
          setCustomApiHost(storedApiHost);
          setHostInput(storedApiHost);
        }
      } catch (err) {
        console.warn('Could not read persistent storage:', err);
      }
    };
    loadPersistedData();
  }, []);

  // Toast Trigger Helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Icon selector mapping helper
  const getCategoryIcon = (iconName: string, color: string, size = 18) => {
    switch (iconName) {
      case 'Compass': return <Compass color={color} size={size} />;
      case 'Brain': return <Brain color={color} size={size} />;
      case 'Briefcase': return <Briefcase color={color} size={size} />;
      case 'Sparkles': return <Sparkles color={color} size={size} />;
      case 'Heart': return <Heart color={color} size={size} />;
      case 'Users': return <Users color={color} size={size} />;
      default: return <Compass color={color} size={size} />;
    }
  };

  // Streak calculation logic
  const updateStreak = async () => {
    try {
      const now = Date.now();
      const lastActiveStr = await AsyncStorage.getItem('pocket_motivation_last_active');
      
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        const oneDayMs = 24 * 60 * 60 * 1000;
        const diff = now - lastActive;

        if (diff > oneDayMs && diff < 2 * oneDayMs) {
          const newStreak = streakCount + 1;
          setStreakCount(newStreak);
          await AsyncStorage.setItem('pocket_motivation_streak', newStreak.toString());
        } else if (diff >= 2 * oneDayMs) {
          setStreakCount(1);
          await AsyncStorage.setItem('pocket_motivation_streak', '1');
        }
      } else {
        setStreakCount(1);
        await AsyncStorage.setItem('pocket_motivation_streak', '1');
      }
      
      await AsyncStorage.setItem('pocket_motivation_last_active', now.toString());
    } catch (e) {
      console.warn('Streak update error:', e);
    }
  };

  // Async Quote Generator (AI live with offline fallback database)
  const generateNewQuote = async () => {
    setIsLoading(true);
    setShowExplanation(false);

    const activeHost = customApiHost.trim() || API_HOST;

    try {
      const response = await fetch(`${activeHost}/api/generate-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          mood: selectedMood,
          customTopic: customTopic
        })
      });

      if (!response.ok) {
        throw new Error('Server issues');
      }

      const quoteData = await response.json();
      setCurrentQuote(quoteData);

      // Save to logs
      const updatedHistory = [quoteData, ...generatedHistory];
      setGeneratedHistory(updatedHistory);
      await AsyncStorage.setItem('pocket_motivation_generated_history', JSON.stringify(updatedHistory));

      updateStreak();
      triggerToast('AI quote generated.');
    } catch (error) {
      console.warn('API error, loading offline matching resource... Error:', error);

      // Offline database match filtering
      const matched = fallbackQuotes.filter(
        q => q.category === selectedCategory || q.mood === selectedMood
      );
      const pool = matched.length > 0 ? matched : fallbackQuotes;
      const randIdx = Math.floor(Math.random() * pool.length);
      const matchedQuote = pool[randIdx];

      const localQuote: Quote = {
        ...matchedQuote,
        id: `fb-local-${Date.now()}`,
        isCustom: false,
        timestamp: Date.now()
      };

      setCurrentQuote(localQuote);

      const updatedHistory = [localQuote, ...generatedHistory];
      setGeneratedHistory(updatedHistory);
      await AsyncStorage.setItem('pocket_motivation_generated_history', JSON.stringify(updatedHistory));

      updateStreak();
      triggerToast('Offline quote matched.');
    } finally {
      setIsLoading(false);
    }
  };

  // Favorite toggle matching state
  const isCurrentFavorited = useMemo(() => {
    if (!currentQuote) return false;
    return savedQuotes.some(q => q.id === currentQuote.id);
  }, [currentQuote, savedQuotes]);

  const toggleFavorite = async () => {
    if (!currentQuote) return;

    let updatedSaved: Quote[];
    if (isCurrentFavorited) {
      updatedSaved = savedQuotes.filter(q => q.id !== currentQuote.id);
      triggerToast('Removed from Saved.');
    } else {
      const quoteToSave = { ...currentQuote, isFavorite: true };
      updatedSaved = [quoteToSave, ...savedQuotes];
      triggerToast('Saved to Library.');
    }

    setSavedQuotes(updatedSaved);
    await AsyncStorage.setItem('pocket_motivation_saved_library', JSON.stringify(updatedSaved));
  };

  // Mobile Native Sharing integration
  const shareQuote = async (quote: Quote | null) => {
    if (!quote) return;
    try {
      await Share.share({
        message: `"${quote.text}"\n— ${quote.author}\n\nGenerated with Pocket Motivation.`,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  // Delete quote from library
  const deleteFromLibrary = async (id: string) => {
    const updated = savedQuotes.filter(q => q.id !== id);
    setSavedQuotes(updated);
    await AsyncStorage.setItem('pocket_motivation_saved_library', JSON.stringify(updated));
    triggerToast('Quote deleted.');
  };

  // Custom Wisdom Builder Submit
  const handleSaveCustomQuote = async () => {
    if (!customText.trim()) {
      triggerToast('Please write your quote.');
      return;
    }

    const customQuote: Quote = {
      id: `custom-${Date.now()}`,
      text: customText,
      author: customAuthor.trim() || 'My Inner Voice',
      category: customCategory,
      isCustom: true,
      timestamp: Date.now()
    };

    const updatedSaved = [customQuote, ...savedQuotes];
    setSavedQuotes(updatedSaved);
    await AsyncStorage.setItem('pocket_motivation_saved_library', JSON.stringify(updatedSaved));

    // Reset Form
    setCustomText('');
    setCustomAuthor('');
    triggerToast('Custom quote saved.');
    setActiveTab('library');
  };

  // Advanced Connection host setup
  const updateCustomHost = async () => {
    try {
      await AsyncStorage.setItem('pocket_motivation_api_host', hostInput);
      setCustomApiHost(hostInput);
      triggerToast('Server host updated.');
      setShowAdvanced(false);
    } catch (e) {
      console.warn(e);
    }
  };

  // Reset all local variables
  const resetAllStatistics = async () => {
    Alert.alert(
      'Reset Statistics',
      'Are you sure you want to clear your statistics and local history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setGeneratedHistory([]);
            await AsyncStorage.removeItem('pocket_motivation_generated_history');
            triggerToast('Statistics cleared.');
          }
        }
      ]
    );
  };

  // 30-Day statistics calculation engine
  const last30DaysQuotes = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return generatedHistory.filter(q => q.timestamp >= thirtyDaysAgo);
  }, [generatedHistory]);

  const statsSummary = useMemo(() => {
    const total = last30DaysQuotes.length;
    
    const moodCounts: Record<string, number> = {};
    moodConfigs.forEach(m => { moodCounts[m.id] = 0; });
    
    const catCounts: Record<string, number> = {};
    categoryConfigs.forEach(c => { catCounts[c.id] = 0; });

    last30DaysQuotes.forEach(q => {
      if (q.mood && q.mood in moodCounts) {
        moodCounts[q.mood]++;
      }
      if (q.category && q.category in catCounts) {
        catCounts[q.category]++;
      }
    });

    let topMoodId = 'general';
    let maxMoodCount = 0;
    Object.entries(moodCounts).forEach(([moodId, count]) => {
      const currentCount = count as number;
      if (currentCount > maxMoodCount) {
        maxMoodCount = currentCount;
        topMoodId = moodId;
      }
    });

    let topCatId = 'general';
    let maxCatCount = 0;
    Object.entries(catCounts).forEach(([catId, count]) => {
      const currentCount = count as number;
      if (currentCount > maxCatCount) {
        maxCatCount = currentCount;
        topCatId = catId;
      }
    });

    const activeTopMood = moodConfigs.find(m => m.id === topMoodId) || moodConfigs[5];
    const activeTopCat = categoryConfigs.find(c => c.id === topCatId) || categoryConfigs[0];

    return {
      total,
      moodCounts,
      catCounts,
      activeTopMood,
      maxMoodCount,
      activeTopCat,
      maxCatCount
    };
  }, [last30DaysQuotes]);

  return (
    <SafeAreaView style={styles.outerContainer}>
      <StatusBar style="dark" />
      
      {/* Header Area */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoTitle}>POCKET MOTIVE</Text>
          <Text style={styles.logoSubtitle}>DAILY INSPIRATION</Text>
        </View>
        <View style={styles.streakPill}>
          <Flame color="#C59B27" fill="#C59B27" size={14} style={styles.streakIcon} />
          <Text style={styles.streakText}>{streakCount}d</Text>
        </View>
      </View>

      {/* Main Tab Views */}
      <View style={styles.contentContainer}>
        {activeTab === 'home' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Parchment Double-Border Card */}
            <View style={styles.quoteCardDoubleBorder}>
              <View style={styles.quoteCardInner}>
                
                {/* Quotation mark / Category badge */}
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.quoteMark}>“</Text>
                  {currentQuote && (
                    <View style={styles.badgeRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {currentQuote.category.toUpperCase()}
                        </Text>
                      </View>
                      {currentQuote.mood && currentQuote.mood !== 'general' && (
                        <View style={[styles.badge, styles.moodBadge]}>
                          <Text style={[styles.badgeText, styles.moodBadgeText]}>
                            {currentQuote.mood.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Quote details */}
                <View style={styles.quoteBody}>
                  {isLoading ? (
                    <View style={styles.loadingWrapper}>
                      <ActivityIndicator size="small" color="#8F2A19" />
                      <Text style={styles.loadingText}>Generating wisdom...</Text>
                    </View>
                  ) : currentQuote ? (
                    <View>
                      <Text style={styles.quoteText}>{currentQuote.text}</Text>
                      <Text style={styles.quoteAuthor}>— {currentQuote.author}</Text>
                    </View>
                  ) : (
                    <Text style={styles.emptyQuotePrompt}>
                      Refine criteria below to gather your customized focus theme.
                    </Text>
                  )}
                </View>

                {/* Deep coaching block */}
                {currentQuote?.explanation && !isLoading && (
                  <View style={styles.cardFooterRow}>
                    <TouchableOpacity 
                      onPress={() => setShowExplanation(!showExplanation)}
                      style={styles.coachingBtn}
                      activeOpacity={0.7}
                    >
                      <Info color="#8F2A19" size={14} />
                      <Text style={styles.coachingBtnText}>
                        {showExplanation ? 'Hide Coaching Guide' : 'Read Deep Coaching'}
                      </Text>
                    </TouchableOpacity>
                    {currentQuote.isCustom && (
                      <View style={styles.customLabel}>
                        <Text style={styles.customLabelText}>Custom Authored</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Explanation box slide container */}
            {showExplanation && currentQuote?.explanation && !isLoading && (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>PERSPECTIVE & GUIDANCE</Text>
                <Text style={styles.explanationBody}>{currentQuote.explanation}</Text>
              </View>
            )}

            {/* Selector Grid Area */}
            <View style={styles.configContainer}>
              <View style={styles.configHeader}>
                <Sliders color="#8F2A19" size={16} />
                <Text style={styles.configTitle}>REFINE TOPIC & MIND</Text>
              </View>

              {/* Mood Selection Row */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>HOW ARE YOU FEELING RIGHT NOW?</Text>
                <View style={styles.moodGrid}>
                  {moodConfigs.map((m) => {
                    const isSelected = selectedMood === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setSelectedMood(m.id)}
                        style={[
                          styles.moodBtn,
                          isSelected && styles.moodBtnSelected
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.moodEmoji}>{m.emoji}</Text>
                        <Text style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Category Focus Selector */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>INSPIRATIONAL THEME FOCUS</Text>
                <View style={styles.categoryGrid}>
                  {categoryConfigs.map((c) => {
                    const isSelected = selectedCategory === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setSelectedCategory(c.id)}
                        style={[
                          styles.categoryBtn,
                          isSelected && styles.categoryBtnSelected
                        ]}
                        activeOpacity={0.8}
                      >
                        <View style={[
                          styles.categoryIconCircle,
                          isSelected ? styles.categoryIconCircleSelected : styles.categoryIconCircleNormal
                        ]}>
                          {getCategoryIcon(c.iconName, isSelected ? '#FCFAF3' : '#8F2A19', 14)}
                        </View>
                        <Text 
                          style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]} 
                          numberOfLines={1}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Custom focus keyword */}
              <View style={styles.section}>
                <View style={styles.customTopicHeader}>
                  <Text style={styles.sectionLabel}>CUSTOM FOCUS (OPTIONAL)</Text>
                  {customTopic.length > 0 && (
                    <TouchableOpacity onPress={() => setCustomTopic('')}>
                      <Text style={styles.clearTopicBtnText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  value={customTopic}
                  onChangeText={setCustomTopic}
                  placeholder="e.g. debugging, deep focus, workout..."
                  placeholderTextColor="#8C8276"
                  style={styles.topicInput}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity 
              onPress={generateNewQuote} 
              disabled={isLoading}
              style={styles.primaryActionButton}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryActionButtonText}>
                {isLoading ? 'MATCHING RESOURCE...' : 'GENERATE POCKET WISDOM'}
              </Text>
            </TouchableOpacity>

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity 
                onPress={toggleFavorite}
                disabled={!currentQuote || isLoading}
                style={[
                  styles.secActionButton,
                  isCurrentFavorited && styles.secActionButtonSelected
                ]}
                activeOpacity={0.8}
              >
                <Heart 
                  color={isCurrentFavorited ? '#8F2A19' : '#615A52'} 
                  fill={isCurrentFavorited ? '#8F2A19' : 'transparent'} 
                  size={16} 
                />
                <Text style={[styles.secActionText, isCurrentFavorited && styles.secActionTextSelected]}>
                  {isCurrentFavorited ? 'FAVORITED' : 'SAVE'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => shareQuote(currentQuote)}
                disabled={!currentQuote || isLoading}
                style={styles.secActionButton}
                activeOpacity={0.8}
              >
                <Share2 color="#615A52" size={16} />
                <Text style={styles.secActionText}>SHARE</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        )}

        {/* Tab: LIBRARY ARCHIVES */}
        {activeTab === 'library' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.libraryHeaderRow}>
              <Text style={styles.libraryTitle}>MY SAVED LIBRARY ({savedQuotes.length})</Text>
              {savedQuotes.length > 0 && (
                <TouchableOpacity onPress={async () => {
                  Alert.alert('Clear Library', 'Clear all saved quotes from your device?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: async () => {
                      setSavedQuotes([]);
                      await AsyncStorage.removeItem('pocket_motivation_saved_library');
                      triggerToast('Library cleared.');
                    }}
                  ]);
                }}>
                  <Text style={styles.clearLibraryBtnText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {savedQuotes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyCircleIcon}>
                  <Heart color="#8C8276" size={24} />
                </View>
                <Text style={styles.emptyTitle}>Your Library is Empty</Text>
                <Text style={styles.emptyBody}>
                  Tap "Save" on generated quotes or create custom ones to list them here.
                </Text>
                <TouchableOpacity 
                  onPress={() => setActiveTab('home')}
                  style={styles.emptyLinkBtn}
                >
                  <Text style={styles.emptyLinkBtnText}>Go find inspiration</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.libraryGrid}>
                {savedQuotes.map((q) => (
                  <View key={q.id} style={styles.libraryCard}>
                    <Text style={styles.libraryQuoteText}>"{q.text}"</Text>
                    
                    <View style={styles.libraryFooterRow}>
                      <Text style={styles.libraryAuthorText}>— {q.author}</Text>
                      <View style={styles.libraryBtnGroup}>
                        <TouchableOpacity 
                          onPress={() => shareQuote(q)}
                          style={styles.libraryUtilBtn}
                          activeOpacity={0.7}
                        >
                          <Share2 color="#615A52" size={14} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => deleteFromLibrary(q.id)}
                          style={[styles.libraryUtilBtn, styles.deleteBtn]}
                          activeOpacity={0.7}
                        >
                          <Trash2 color="#A04838" size={14} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {q.explanation && (
                      <View style={styles.libraryCollapsibleBox}>
                        <Text style={styles.libraryCollapsibleTitle}>Coaching Context</Text>
                        <Text style={styles.libraryCollapsibleBody}>{q.explanation}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* Tab: CREATE WISDOM */}
        {activeTab === 'create' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.libraryTitle}>WRITE YOUR OWN WISDOM</Text>
            
            <View style={styles.createForm}>
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>YOUR MOTIVATIONAL QUOTE</Text>
                <TextInput
                  value={customText}
                  onChangeText={setCustomText}
                  multiline
                  numberOfLines={4}
                  placeholder="Type a powerful phrase or daily reminder that lifts you up..."
                  placeholderTextColor="#8C8276"
                  style={[styles.topicInput, styles.textArea]}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>AUTHOR ATTRIBUTION</Text>
                <TextInput
                  value={customAuthor}
                  onChangeText={setCustomAuthor}
                  placeholder="e.g. My Inner Voice, Ancient Proverb, or Anonymous"
                  placeholderTextColor="#8C8276"
                  style={styles.topicInput}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>CATEGORY ALIGNMENT</Text>
                <View style={styles.pickerAlternativeRow}>
                  {categoryConfigs.map((c) => {
                    const isSelected = customCategory === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setCustomCategory(c.id)}
                        style={[
                          styles.pickerAlternativeCell,
                          isSelected && styles.pickerAlternativeCellSelected
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.pickerAlternativeCellText,
                          isSelected && styles.pickerAlternativeCellTextSelected
                        ]}>
                          {c.label.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleSaveCustomQuote}
                style={styles.primaryActionButton}
                activeOpacity={0.9}
              >
                <Plus color="#FCFAF3" size={16} style={styles.btnIconSpacing} />
                <Text style={styles.primaryActionButtonText}>ADD TO MY LIBRARY</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tipBox}>
              <Text style={styles.tipTitle}>💡 Tip: Self-Generated Reminders</Text>
              <Text style={styles.tipBody}>
                Writing your own reminders reinforces intentional thought loops. These will show up in your Saved Library tab where you can easily read, copy, or share them.
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Tab: STATS & INSIGHTS */}
        {activeTab === 'stats' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.statsHeaderRow}>
              <Text style={styles.libraryTitle}>30-DAY INSIGHTS</Text>
              <View style={styles.statsHeaderBadgeRow}>
                {generatedHistory.length > 0 && (
                  <TouchableOpacity onPress={resetAllStatistics} style={styles.resetBtn}>
                    <Trash2 color="#8F2A19" size={12} />
                    <Text style={styles.resetBtnText}>Reset</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.statsEngineBadge}>
                  <TrendingUp color="#8F2A19" size={10} />
                  <Text style={styles.statsEngineBadgeText}>LOCAL LOGS</Text>
                </View>
              </View>
            </View>

            {/* Highlight Summary Row */}
            <View style={styles.statsHighlightsRow}>
              <View style={styles.statsHighlightCard}>
                <Text style={styles.highlightSubText}>Generated</Text>
                <Text style={styles.highlightValText}>{statsSummary.total}</Text>
                <Text style={styles.highlightPeriodText}>last 30d</Text>
              </View>

              <View style={styles.statsHighlightCard}>
                <Text style={styles.highlightSubText}>Top Mood</Text>
                <Text style={styles.highlightValText} numberOfLines={1}>
                  {statsSummary.activeTopMood.emoji} {statsSummary.activeTopMood.label}
                </Text>
                <Text style={styles.highlightPeriodText}>felt {statsSummary.maxMoodCount}x</Text>
              </View>

              <View style={styles.statsHighlightCard}>
                <Text style={styles.highlightSubText}>Top Focus</Text>
                <Text style={styles.highlightValText} numberOfLines={1}>
                  {statsSummary.activeTopCat.label.split(' ')[0]}
                </Text>
                <Text style={styles.highlightPeriodText}>read {statsSummary.maxCatCount}x</Text>
              </View>
            </View>

            {/* Custom Mood Distribution Native Chart */}
            <View style={styles.statsChartContainer}>
              <View style={styles.chartHeader}>
                <Activity color="#8F2A19" size={14} />
                <Text style={styles.chartTitle}>Mood Distribution</Text>
              </View>

              {statsSummary.total === 0 ? (
                <Text style={styles.chartEmptyMsg}>No generations logged yet.</Text>
              ) : (
                <View style={styles.nativeChartWrapper}>
                  {moodConfigs.map((m) => {
                    const count = statsSummary.moodCounts[m.id] || 0;
                    const maxCount = Math.max(...Object.values(statsSummary.moodCounts), 1);
                    const percent = count / maxCount;
                    return (
                      <View key={m.id} style={styles.nativeChartRow}>
                        <View style={styles.chartRowInfo}>
                          <Text style={styles.chartEmoji}>{m.emoji}</Text>
                          <Text style={styles.chartLabelName}>{m.label}</Text>
                          <Text style={styles.chartRowVal}>{count}</Text>
                        </View>
                        <View style={styles.chartProgressBackground}>
                          <View style={[
                            styles.chartProgressBar, 
                            { backgroundColor: m.color, width: `${percent * 100}%` }
                          ]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Custom Focus Category Native Chart */}
            <View style={styles.statsChartContainer}>
              <View style={styles.chartHeader}>
                <TrendingUp color="#8F2A19" size={14} />
                <Text style={styles.chartTitle}>Inspirational Focus</Text>
              </View>

              {statsSummary.total === 0 ? (
                <Text style={styles.chartEmptyMsg}>No generations logged yet.</Text>
              ) : (
                <View style={styles.nativeChartWrapper}>
                  {categoryConfigs.map((c) => {
                    const count = statsSummary.catCounts[c.id] || 0;
                    const maxCount = Math.max(...Object.values(statsSummary.catCounts), 1);
                    const percent = count / maxCount;
                    return (
                      <View key={c.id} style={styles.nativeChartRow}>
                        <View style={styles.chartRowInfo}>
                          <Text style={styles.chartLabelName}>{c.label}</Text>
                          <Text style={styles.chartRowVal}>{count}</Text>
                        </View>
                        <View style={styles.chartProgressBackground}>
                          <View style={[
                            styles.chartProgressBar, 
                            { backgroundColor: c.color, width: `${percent * 100}%` }
                          ]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Drawer for Advanced Server Connection IP Settings */}
            <TouchableOpacity 
              onPress={() => setShowAdvanced(!showAdvanced)} 
              style={styles.advancedToggle}
              activeOpacity={0.7}
            >
              <Text style={styles.advancedToggleText}>
                {showAdvanced ? 'Hide Connection Details' : 'Advanced Connection Settings'}
              </Text>
            </TouchableOpacity>

            {showAdvanced && (
              <View style={styles.advancedForm}>
                <Text style={styles.advancedFormLabel}>Backend API Host URL</Text>
                <Text style={styles.advancedFormSubLabel}>
                  Change this if you run your development server locally on your laptop network.
                </Text>
                <TextInput
                  value={hostInput}
                  onChangeText={setHostInput}
                  placeholder={API_HOST}
                  placeholderTextColor="#8C8276"
                  autoCapitalize="none"
                  style={styles.topicInput}
                />
                <View style={styles.advancedBtnRow}>
                  <TouchableOpacity onPress={() => {
                    setHostInput('');
                    setCustomApiHost('');
                    AsyncStorage.removeItem('pocket_motivation_api_host');
                    triggerToast('Reset to Default cloud backend.');
                    setShowAdvanced(false);
                  }} style={styles.advancedBtnSub}>
                    <Text style={styles.advancedBtnSubText}>Reset to Default</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={updateCustomHost} style={styles.advancedBtnPrimary}>
                    <Text style={styles.advancedBtnPrimaryText}>Save Server IP</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </ScrollView>
        )}
      </View>

      {/* Floating native custom animated Toast alert popup */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <View style={styles.toastPulse} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Footer Navigation Bar */}
      <View style={styles.footerNav}>
        <TouchableOpacity 
          onPress={() => setActiveTab('home')} 
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <Compass color={activeTab === 'home' ? '#8F2A19' : '#8C8276'} size={20} />
          <Text style={[styles.navItemText, activeTab === 'home' && styles.navItemTextActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab('library')} 
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <Heart color={activeTab === 'library' ? '#8F2A19' : '#8C8276'} size={20} />
          <Text style={[styles.navItemText, activeTab === 'library' && styles.navItemTextActive]}>
            Library
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab('create')} 
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <Plus color={activeTab === 'create' ? '#8F2A19' : '#8C8276'} size={20} />
          <Text style={[styles.navItemText, activeTab === 'create' && styles.navItemTextActive]}>
            Write
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab('stats')} 
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <TrendingUp color={activeTab === 'stats' ? '#8F2A19' : '#8C8276'} size={20} />
          <Text style={[styles.navItemText, activeTab === 'stats' && styles.navItemTextActive]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Layout Dimensions
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F4EFE6', // Classic parchment paper background
  },
  header: {
    height: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F8F5EE',
    borderBottomWidth: 1,
    borderBottomColor: '#E6DEC9',
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  logoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D2824',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Cinzel' : 'serif',
  },
  logoSubtitle: {
    fontSize: 8,
    fontWeight: '600',
    color: '#8C8276',
    letterSpacing: 1.5,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EFE3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#D6CDB5',
  },
  streakIcon: {
    marginRight: 4,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D2824',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Quote Card
  quoteCardDoubleBorder: {
    backgroundColor: '#FCFAF3',
    borderColor: '#C4B295',
    borderWidth: 1,
    borderRadius: 24,
    padding: 3,
    shadowColor: '#2D2824',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  quoteCardInner: {
    borderColor: '#C4B295',
    borderWidth: 3,
    borderStyle: 'double',
    borderRadius: 20,
    padding: 16,
    minHeight: 250,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  quoteMark: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'rgba(143, 42, 25, 0.25)',
    marginTop: -10,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: '#F5F2EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#E6DEC9',
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#615A52',
    letterSpacing: 0.5,
  },
  moodBadge: {
    backgroundColor: 'rgba(143, 42, 25, 0.08)',
    borderColor: 'rgba(143, 42, 25, 0.2)',
  },
  moodBadgeText: {
    color: '#8F2A19',
  },
  quoteBody: {
    marginVertical: 12,
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 12,
    color: '#8F2A19',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  quoteText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#2D2824',
    lineHeight: 26,
    fontStyle: 'italic',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  quoteAuthor: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8F2A19',
    letterSpacing: 1.5,
    textAlign: 'right',
    marginTop: 12,
  },
  emptyQuotePrompt: {
    fontSize: 13,
    color: '#615A52',
    textAlign: 'center',
    lineHeight: 20,
    paddingVertical: 20,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E6DEC9',
    paddingTop: 12,
    marginTop: 10,
  },
  coachingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F2EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6DEC9',
  },
  coachingBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2D2824',
    marginLeft: 5,
  },
  customLabel: {
    backgroundColor: 'rgba(58, 95, 67, 0.1)',
    borderColor: 'rgba(58, 95, 67, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  customLabelText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#3A5F43',
  },

  // Explanation Container
  explanationBox: {
    backgroundColor: '#F3EFE3',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D6CDB5',
    marginTop: 12,
  },
  explanationTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#8F2A19',
    letterSpacing: 1,
    marginBottom: 4,
  },
  explanationBody: {
    fontSize: 11,
    color: '#2D2824',
    lineHeight: 16,
  },

  // Configurations
  configContainer: {
    backgroundColor: '#F8F5EE',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6DEC9',
    marginTop: 16,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E6DEC9',
    paddingBottom: 8,
    marginBottom: 12,
  },
  configTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D2824',
    letterSpacing: 1,
    marginLeft: 6,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#615A52',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodBtn: {
    width: (width - 76) / 3,
    backgroundColor: '#FCFAF3',
    borderColor: '#E6DEC9',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 6,
  },
  moodBtnSelected: {
    backgroundColor: '#8F2A19',
    borderColor: '#8F2A19',
  },
  moodEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  moodLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#615A52',
  },
  moodLabelSelected: {
    color: '#FCFAF3',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryBtn: {
    width: (width - 80) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCFAF3',
    borderColor: '#E6DEC9',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 6,
  },
  categoryBtnSelected: {
    backgroundColor: '#8F2A19',
    borderColor: '#8F2A19',
  },
  categoryIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  categoryIconCircleNormal: {
    backgroundColor: '#F5F2EB',
  },
  categoryIconCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#615A52',
    flex: 1,
  },
  categoryLabelSelected: {
    color: '#FCFAF3',
    fontWeight: 'bold',
  },
  customTopicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearTopicBtnText: {
    fontSize: 9,
    color: '#8F2A19',
    textDecorationLine: 'underline',
  },
  topicInput: {
    height: 40,
    backgroundColor: '#FCFAF3',
    borderColor: '#E6DEC9',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 11,
    color: '#2D2824',
  },

  // Form styles
  createForm: {
    backgroundColor: '#F8F5EE',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6DEC9',
    marginTop: 12,
  },
  formSection: {
    marginBottom: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  pickerAlternativeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickerAlternativeCell: {
    backgroundColor: '#FCFAF3',
    borderColor: '#E6DEC9',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  pickerAlternativeCellSelected: {
    backgroundColor: '#8F2A19',
    borderColor: '#8F2A19',
  },
  pickerAlternativeCellText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#615A52',
  },
  pickerAlternativeCellTextSelected: {
    color: '#FCFAF3',
    fontWeight: 'bold',
  },

  // Action Buttons
  primaryActionButton: {
    height: 48,
    backgroundColor: '#8F2A19',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 16,
    shadowColor: '#8F2A19',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  primaryActionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FCFAF3',
    letterSpacing: 1.5,
  },
  btnIconSpacing: {
    marginRight: 6,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  secActionButton: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCFAF3',
    borderColor: '#E6DEC9',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  secActionButtonSelected: {
    backgroundColor: 'rgba(143, 42, 25, 0.08)',
    borderColor: 'rgba(143, 42, 25, 0.3)',
  },
  secActionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#615A52',
    letterSpacing: 1,
    marginLeft: 4,
  },
  secActionTextSelected: {
    color: '#8F2A19',
  },

  // Library List
  libraryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  libraryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D2824',
    letterSpacing: 1,
  },
  clearLibraryBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A04838',
    textDecorationLine: 'underline',
  },
  libraryGrid: {
    marginTop: 4,
  },
  libraryCard: {
    backgroundColor: '#FCFAF3',
    borderColor: '#E6DEC9',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#2D2824',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  libraryQuoteText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    color: '#2D2824',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  libraryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F2EB',
    paddingTop: 10,
  },
  libraryAuthorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8F2A19',
    letterSpacing: 1,
  },
  libraryBtnGroup: {
    flexDirection: 'row',
  },
  libraryUtilBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F5F2EB',
    borderColor: '#E6DEC9',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  deleteBtn: {
    backgroundColor: '#FFF2F0',
    borderColor: '#FAD4D0',
  },
  libraryCollapsibleBox: {
    marginTop: 10,
    backgroundColor: '#F3EFE3',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D6CDB5',
  },
  libraryCollapsibleTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#8F2A19',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  libraryCollapsibleBody: {
    fontSize: 10,
    color: '#2D2824',
    lineHeight: 14,
  },

  // Empty view
  emptyContainer: {
    backgroundColor: '#F8F5EE',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6DEC9',
    marginTop: 20,
  },
  emptyCircleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F2EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D2824',
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 11,
    color: '#615A52',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  emptyLinkBtn: {
    marginTop: 4,
  },
  emptyLinkBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8F2A19',
    textDecorationLine: 'underline',
  },

  // Statistics
  statsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  resetBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8F2A19',
    marginLeft: 3,
  },
  statsEngineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(143, 42, 25, 0.08)',
    borderColor: 'rgba(143, 42, 25, 0.2)',
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statsEngineBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#8F2A19',
    marginLeft: 3,
  },
  statsHighlightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statsHighlightCard: {
    flex: 1,
    backgroundColor: '#F8F5EE',
    borderColor: '#E6DEC9',
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  highlightSubText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#615A52',
    textTransform: 'uppercase',
  },
  highlightValText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8F2A19',
    marginVertical: 4,
  },
  highlightPeriodText: {
    fontSize: 7,
    color: '#8C8276',
  },

  // Native Charts
  statsChartContainer: {
    backgroundColor: '#F8F5EE',
    borderColor: '#E6DEC9',
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    marginBottom: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E6DEC9',
    paddingBottom: 6,
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2D2824',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  chartEmptyMsg: {
    fontSize: 11,
    color: '#8C8276',
    textAlign: 'center',
    paddingVertical: 20,
  },
  nativeChartWrapper: {
    marginTop: 4,
  },
  nativeChartRow: {
    marginBottom: 10,
  },
  chartRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  chartEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  chartLabelName: {
    fontSize: 9,
    fontWeight: '600',
    color: '#2D2824',
    flex: 1,
  },
  chartRowVal: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#8C8276',
  },
  chartProgressBackground: {
    height: 4,
    backgroundColor: '#E6DEC9',
    borderRadius: 99,
    overflow: 'hidden',
  },
  chartProgressBar: {
    height: '100%',
    borderRadius: 99,
  },

  // Advanced configurations
  advancedToggle: {
    alignSelf: 'center',
    marginVertical: 10,
  },
  advancedToggleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8C8276',
    textDecorationLine: 'underline',
  },
  advancedForm: {
    backgroundColor: '#F8F5EE',
    borderColor: '#E6DEC9',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
  },
  advancedFormLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2D2824',
    marginBottom: 2,
  },
  advancedFormSubLabel: {
    fontSize: 8,
    color: '#615A52',
    lineHeight: 12,
    marginBottom: 10,
  },
  advancedBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  advancedBtnSub: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginRight: 8,
  },
  advancedBtnSubText: {
    fontSize: 10,
    color: '#8F2A19',
    fontWeight: 'bold',
  },
  advancedBtnPrimary: {
    backgroundColor: '#8F2A19',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  advancedBtnPrimaryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FCFAF3',
  },

  // Tip box
  tipBox: {
    backgroundColor: '#F3EFE3',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D6CDB5',
    marginTop: 14,
  },
  tipTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8F2A19',
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 11,
    color: '#615A52',
    lineHeight: 16,
  },

  // Float Toast Alert Overlay
  toastContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8F2A19',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#2D2824',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 999,
  },
  toastPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C59B27',
    marginRight: 8,
  },
  toastText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FCFAF3',
    letterSpacing: 0.5,
  },

  // Footer navigation
  footerNav: {
    height: 60,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E6DEC9',
    backgroundColor: '#F8F5EE',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#8C8276',
    marginTop: 3,
  },
  navItemTextActive: {
    color: '#8F2A19',
    fontWeight: 'bold',
  },
});
