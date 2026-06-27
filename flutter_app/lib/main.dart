import 'dart:convert';
import 'dart:math';
import 'package:flutter/material';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:share_plus/share_plus.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Set system UI style to match the dark cosmic theme
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF060814),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  runApp(const PocketMotivationApp());
}

class PocketMotivationApp extends StatelessWidget {
  const PocketMotivationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pocket Motivation',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF060814),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1),
          brightness: Brightness.dark,
          primary: const Color(0xFF6366F1),
          secondary: const Color(0xFFEC4899),
          surface: const Color(0xFF0E1126),
        ),
        textTheme: GoogleFonts.interTextTheme(
          ThemeData.dark().textTheme,
        ),
      ),
      home: const MainNavigationScreen(),
    );
  }
}

// Model representing a single Motivation Quote
class Quote {
  final String id;
  final String text;
  final String author;
  final String category;
  final String mood;
  final String explanation;
  final bool isCustom;
  final bool isFavorite;
  final int timestamp;

  Quote({
    required this.id,
    required this.text,
    required this.author,
    required this.category,
    required this.mood,
    required this.explanation,
    this.isCustom = false,
    this.isFavorite = true,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'author': author,
      'category': category,
      'mood': mood,
      'explanation': explanation,
      'is_custom': isCustom,
      'is_favorite': isFavorite,
      'timestamp': timestamp,
    };
  }

  factory Quote.fromJson(Map<String, dynamic> json) {
    return Quote(
      id: json['id']?.toString() ?? '',
      text: json['text']?.toString() ?? '',
      author: json['author']?.toString() ?? 'Unknown',
      category: json['category']?.toString() ?? 'general',
      mood: json['mood']?.toString() ?? 'general',
      explanation: json['explanation']?.toString() ?? '',
      isCustom: json['is_custom'] == true || (json['isCustom'] == true),
      isFavorite: json['is_favorite'] != false && (json['isFavorite'] != false),
      timestamp: int.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now().millisecondsSinceEpoch,
    );
  }
}

// Static configuration & assets matching the Web codebase
class AppConfig {
  static final List<Map<String, dynamic>> moods = [
    { 'id': 'tired', 'label': 'Tired', 'emoji': '🥱', 'color': Color(0xFF8B5CF6) },
    { 'id': 'anxious', 'label': 'Anxious', 'emoji': '🥺', 'color': Color(0xFFEF4444) },
    { 'id': 'unfocused', 'label': 'Unfocused', 'emoji': '🌀', 'color': Color(0xFFF59E0B) },
    { 'id': 'low-energy', 'label': 'Low Energy', 'emoji': '🔋', 'color': Color(0xFF3B82F6) },
    { 'id': 'excited', 'label': 'Excited', 'emoji': '⚡', 'color': Color(0xFF10B981) },
    { 'id': 'general', 'label': 'Just Fine', 'emoji': '😊', 'color': Color(0xFFEC4899) },
  ];

  static final List<Map<String, dynamic>> categories = [
    { 'id': 'general', 'label': 'General Motivation', 'icon': Icons.explore, 'color': Color(0xFF6366F1), 'desc': 'Daily wisdom for balanced living' },
    { 'id': 'mindset', 'label': 'Mindset & Growth', 'icon': Icons.psychology, 'color': Color(0xFF8B5CF6), 'desc': 'Overcome self-doubt and build resilience' },
    { 'id': 'career', 'label': 'Career & Ambition', 'icon': Icons.work, 'color': Color(0xFFF59E0B), 'desc': 'Achieve goals and stay productive' },
    { 'id': 'creative', 'label': 'Creativity & Focus', 'icon': Icons.auto_awesome, 'color': Color(0xFFEC4899), 'desc': 'Unlock blockages and express yourself' },
    { 'id': 'health', 'label': 'Health & Vitality', 'icon': Icons.favorite, 'color': Color(0xFFEF4444), 'desc': 'Honor your body and mental peace' },
    { 'id': 'relationships', 'label': 'Relationships & Love', 'icon': Icons.people, 'color': Color(0xFF10B981), 'desc': 'Connect deeply and communicate' },
  ];

  static final List<Map<String, dynamic>> fallbackQuotes = [
    {
      'id': 'fb-1',
      'text': 'The only way to do great work is to love what you do.',
      'author': 'Steve Jobs',
      'category': 'career',
      'mood': 'tired',
      'explanation': 'When fatigue sets in, reconnecting with your passion can reignite that spark. Take a brief pause, remember your "why", and move forward with purpose.',
    },
    {
      'id': 'fb-2',
      'text': 'It always seems impossible until it\'s done.',
      'author': 'Nelson Mandela',
      'category': 'mindset',
      'mood': 'anxious',
      'explanation': 'Anxiety often stems from looking at the mountain all at once. Break it down. What seems overwhelming today will be a completed chapter tomorrow.',
    },
    {
      'id': 'fb-3',
      'text': 'Creativity is intelligence having fun.',
      'author': 'Albert Einstein',
      'category': 'creative',
      'mood': 'unfocused',
      'explanation': 'An unfocused mind isn\'t a broken one—it\'s an open one. Allow yourself to play, explore random associations, and let your subconscious connect the dots.',
    },
    {
      'id': 'fb-4',
      'text': 'Believe you can and you\'re halfway there.',
      'author': 'Theodore Roosevelt',
      'category': 'mindset',
      'mood': 'low-energy',
      'explanation': 'When your energy is low, do not force physical sprint. Instead, steady your belief. Gentle, persistent steps backed by faith will carry you through.',
    },
    {
      'id': 'fb-5',
      'text': 'The power of imagination makes us infinite.',
      'author': 'John Muir',
      'category': 'creative',
      'mood': 'excited',
      'explanation': 'Your current burst of excitement is raw creative fuel! Capture your ideas now, let your imagination run completely wild, and build something beautiful.',
    },
    {
      'id': 'fb-6',
      'text': 'Do what you can, with what you have, where you are.',
      'author': 'Theodore Roosevelt',
      'category': 'career',
      'mood': 'low-energy',
      'explanation': 'Release the pressure to perform at peak capacity. Doing a tiny bit with your current resources is infinitely better than doing nothing at all.',
    },
    {
      'id': 'fb-7',
      'text': 'Act as if what you do makes a difference. It does.',
      'author': 'William James',
      'category': 'mindset',
      'mood': 'tired',
      'explanation': 'Even when you feel exhausted and doubt your impact, your small efforts send ripples out into the world. You are making a difference, even in your quietest hours.',
    },
    {
      'id': 'fb-8',
      'text': 'Do not watch the clock; do what it does. Keep going.',
      'author': 'Sam Levenson',
      'category': 'career',
      'mood': 'unfocused',
      'explanation': 'When concentration is slippery, don\'t count the minutes. Just focus on a single tiny action. Let time take care of itself while you remain in motion.',
    },
    {
      'id': 'fb-9',
      'text': 'No legacy is so rich as honesty.',
      'author': 'William Shakespeare',
      'category': 'relationships',
      'mood': 'anxious',
      'explanation': 'Anxiety in relationships is often quieted by simple, warm transparency. Being honest with yourself and others creates an unbreakable foundation.',
    },
    {
      'id': 'fb-10',
      'text': 'The best way to predict the future is to create it.',
      'author': 'Peter Drucker',
      'category': 'career',
      'mood': 'excited',
      'explanation': 'You feel the excitement because you sense opportunity. Take that momentum and draft a concrete, actionable plan to bring your vision to life.',
    },
    {
      'id': 'fb-11',
      'text': 'Amor Fati — Love your fate, which is in fact your life.',
      'author': 'Friedrich Nietzsche',
      'category': 'mindset',
      'mood': 'tired',
      'explanation': 'Accepting the fatigue of a long day can bring deep peace. Embrace this moment of rest as a natural, necessary phase of your journey.',
    },
    {
      'id': 'fb-12',
      'text': 'He who has a why to live can bear almost any how.',
      'author': 'Viktor Frankl',
      'category': 'mindset',
      'mood': 'low-energy',
      'explanation': 'When energy runs dry, reconnect with your core meaning. Purpose gives us strength when circumstances try to drain us.',
    },
    {
      'id': 'fb-13',
      'text': 'Art is the elimination of the unnecessary.',
      'author': 'Pablo Picasso',
      'category': 'creative',
      'mood': 'unfocused',
      'explanation': 'If your mind is cluttered, try subtracting rather than adding. Strip away the noise, clear your canvas, and focus on one single element.',
    },
    {
      'id': 'fb-14',
      'text': 'Happiness is when what you think, what you say, and what you do are in harmony.',
      'author': 'Mahatma Gandhi',
      'category': 'relationships',
      'mood': 'general',
      'explanation': 'Authenticity is the ultimate source of internal alignment. Align your actions with your values to experience true satisfaction and deep harmony.',
    },
    {
      'id': 'fb-15',
      'text': 'PADAYUN! SHOOO!',
      'author': 'Visayan Proverb',
      'category': 'mindset',
      'mood': 'low-energy',
      'explanation': 'A powerful Visayan expression of resilient continuity. No matter how heavy the road, keep moving forward with confidence and fire.',
    },
    {
      'id': 'fb-16',
      'text': 'MADAPA MAN KAHAPON BUKAS BABANGON',
      'author': 'Tagalog Wisdom',
      'category': 'mindset',
      'mood': 'tired',
      'explanation': 'Falling down is just a temporary state of being on the ground. Tomorrow brings a fresh opportunity to stand up, brush off the dust, and conquer your goals.',
    },
    {
      'id': 'fb-17',
      'text': 'KAYA RANA NGART!',
      'author': 'Local Encouragement',
      'category': 'general',
      'mood': 'anxious',
      'explanation': 'A heartfelt reassurance between buddies. Release your worries and anxiety—you are fully capable of getting through this, one step at a time.',
    }
  ];
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentTabIndex = 0;
  
  // Storage & state keys
  SharedPreferences? _prefs;
  List<Quote> _savedQuotes = [];
  List<Quote> _dbQuotes = [];
  Quote? _currentQuote;
  
  // Custom inputs
  String _selectedCategory = 'general';
  String _selectedMood = 'general';
  String _customTopic = '';
  
  // Status states
  bool _isLoading = false;
  bool _showExplanation = false;
  int _streakCount = 1;
  bool _hasGeneratedToday = false;
  
  // Supabase configurations
  String _supabaseUrl = '';
  String _supabaseAnonKey = '';
  bool _isSupabaseConfigured = false;
  SupabaseClient? _supabaseClient;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    _prefs = await SharedPreferences.getInstance();
    
    // Load local saved quotes (favorites)
    final savedQuotesString = _prefs?.getString('pocket_motivation_favorites');
    if (savedQuotesString != null) {
      try {
        final List<dynamic> jsonList = jsonDecode(savedQuotesString);
        setState(() {
          _savedQuotes = jsonList.map((item) => Quote.fromJson(item)).toList();
        });
      } catch (e) {
        debugPrint('Error parsing stored favorites: $e');
      }
    }

    // Load streak tracking
    final savedStreak = _prefs?.getInt('pocket_motivation_streak') ?? 1;
    final lastGenTime = _prefs?.getInt('pocket_motivation_last_gen') ?? 0;
    
    setState(() {
      _streakCount = savedStreak;
      if (lastGenTime > 0) {
        final lastGenDate = DateTime.fromMillisecondsSinceEpoch(lastGenTime);
        final todayDate = DateTime.now();
        if (lastGenDate.year == todayDate.year && 
            lastGenDate.month == todayDate.month && 
            lastGenDate.day == todayDate.day) {
          _hasGeneratedToday = true;
        } else {
          final diffDays = todayDate.difference(lastGenDate).inDays;
          if (diffDays > 1) {
            _streakCount = 1;
            _prefs?.setInt('pocket_motivation_streak', 1);
          }
        }
      }
    });

    // Set initial random quote from curated fallback list
    _setRandomFallbackQuote();

    // Check if Supabase keys exist in secure prefs
    final savedUrl = _prefs?.getString('pocket_supabase_url') ?? '';
    final savedKey = _prefs?.getString('pocket_supabase_key') ?? '';
    if (savedUrl.isNotEmpty && savedKey.isNotEmpty) {
      setState(() {
        _supabaseUrl = savedUrl;
        _supabaseAnonKey = savedKey;
      });
      _connectToSupabase(savedUrl, savedKey, showFeedback: false);
    }
  }

  void _setRandomFallbackQuote() {
    final random = Random();
    final items = AppConfig.fallbackQuotes;
    final randomItem = items[random.nextInt(items.length)];
    setState(() {
      _currentQuote = Quote(
        id: 'fb-init-${DateTime.now().millisecondsSinceEpoch}',
        text: randomItem['text'],
        author: randomItem['author'],
        category: randomItem['category'],
        mood: randomItem['mood'],
        explanation: randomItem['explanation'],
        timestamp: DateTime.now().millisecondsSinceEpoch,
      );
    });
  }

  Future<void> _connectToSupabase(String url, String key, {bool showFeedback = true}) async {
    if (url.isEmpty || key.isEmpty) {
      if (showFeedback) _showToast('Please specify valid Supabase credentials.');
      return;
    }
    
    setState(() => _isLoading = true);
    
    try {
      // Initialize Supabase SDK
      await Supabase.initialize(
        url: url,
        anonKey: key,
        debug: false,
      );
      
      final client = Supabase.instance.client;
      
      // Attempt connection fetch from 'pocket_quotes'
      final response = await client
          .from('pocket_quotes')
          .select()
          .order('timestamp', descending: true);
          
      final List<dynamic> data = response as List<dynamic>;
      final fetchedQuotes = data.map((row) => Quote.fromJson(row)).toList();
      
      setState(() {
        _supabaseClient = client;
        _isSupabaseConfigured = true;
        _dbQuotes = fetchedQuotes;
        _supabaseUrl = url;
        _supabaseAnonKey = key;
        
        // Sync favorite statuses
        final favoritesOnly = fetchedQuotes.where((q) => q.isFavorite == true || q.isCustom == true).toList();
        if (favoritesOnly.isNotEmpty) {
          _savedQuotes = favoritesOnly;
          _prefs?.setString('pocket_motivation_favorites', jsonEncode(_savedQuotes.map((q) => q.toJson()).toList()));
        }
      });
      
      // Save credentials persistently
      await _prefs?.setString('pocket_supabase_url', url);
      await _prefs?.setString('pocket_supabase_key', key);
      
      if (showFeedback) _showToast('⚡ Connected and synchronized successfully with Supabase!');
    } catch (e) {
      debugPrint('Supabase connection failure: $e');
      if (showFeedback) {
        _showToast('Connection failed: Ensure table "pocket_quotes" exists and has public RLS policies.');
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _disconnectSupabase() async {
    await _prefs?.remove('pocket_supabase_url');
    await _prefs?.remove('pocket_supabase_key');
    setState(() {
      _supabaseClient = null;
      _isSupabaseConfigured = false;
      _dbQuotes = [];
      _supabaseUrl = '';
      _supabaseAnonKey = '';
    });
    _showToast('Disconnected. Reverting to Offline/Local Mode.');
  }

  Future<void> _updateSavedQuotes(List<Quote> newList, {Quote? toInsert, String? toDeleteId}) async {
    setState(() {
      _savedQuotes = newList;
    });
    
    // Save to local shared preferences
    await _prefs?.setString('pocket_motivation_favorites', jsonEncode(newList.map((q) => q.toJson()).toList()));
    
    // Sync with Supabase in background if connected
    if (_isSupabaseConfigured && _supabaseClient != null) {
      try {
        if (toInsert != null) {
          await _supabaseClient!.from('pocket_quotes').upsert([
            {
              'id': toInsert.id,
              'text': toInsert.text,
              'author': toInsert.author,
              'category': toInsert.category,
              'mood': toInsert.mood,
              'explanation': toInsert.explanation,
              'is_custom': toInsert.isCustom,
              'is_favorite': toInsert.isFavorite,
              'timestamp': toInsert.timestamp,
            }
          ]);
        } else if (toDeleteId != null) {
          if (toDeleteId.startsWith('fb-')) {
            // Simply mark as unfavorited in DB instead of deleting completely
            await _supabaseClient!
                .from('pocket_quotes')
                .update({'is_favorite': false})
                .eq('id', toDeleteId);
          } else {
            // Delete custom quote entirely
            await _supabaseClient!
                .from('pocket_quotes')
                .delete()
                .eq('id', toDeleteId);
          }
        }
        
        // Refresh database quote pool
        final response = await _supabaseClient!.from('pocket_quotes').select();
        final List<dynamic> data = response as List<dynamic>;
        setState(() {
          _dbQuotes = data.map((row) => Quote.fromJson(row)).toList();
        });
      } catch (e) {
        debugPrint('Supabase sync background issue: $e');
      }
    }
  }

  // Generates or matches a custom quote
  Future<void> _generateQuote() async {
    setState(() {
      _isLoading = true;
      _showExplanation = false;
    });

    // Simulate network delay for elegant experience
    await Future.delayed(const Duration(milliseconds: 700));

    try {
      // In mobile offline version, we generate by intelligently filtering local database quotes or curated archives.
      // If Supabase is connected and has custom quotes, we pool them too!
      final sourcePool = _dbQuotes.isNotEmpty ? _dbQuotes : AppConfig.fallbackQuotes.map((q) => Quote.fromJson(q)).toList();
      
      final matched = sourcePool.where((q) {
        return q.category == _selectedCategory || q.mood == _selectedMood;
      }).toList();
      
      final pool = matched.isNotEmpty ? matched : sourcePool;
      final random = Random();
      final selected = pool[random.nextInt(pool.length)];
      
      setState(() {
        _currentQuote = Quote(
          id: 'fb-fallback-${DateTime.now().millisecondsSinceEpoch}',
          text: selected.text,
          author: selected.author,
          category: selected.category,
          mood: selected.mood,
          explanation: selected.explanation,
          timestamp: DateTime.now().millisecondsSinceEpoch,
        );
        
        // Update daily streak
        final today = DateTime.now();
        if (!_hasGeneratedToday) {
          final lastGenTime = _prefs?.getInt('pocket_motivation_last_gen') ?? 0;
          if (lastGenTime > 0) {
            final lastGenDate = DateTime.fromMillisecondsSinceEpoch(lastGenTime);
            final yesterday = today.subtract(const Duration(days: 1));
            
            if (lastGenDate.year == yesterday.year && 
                lastGenDate.month == yesterday.month && 
                lastGenDate.day == yesterday.day) {
              _streakCount += 1;
            } else {
              _streakCount = 1;
            }
          } else {
            _streakCount = 1;
          }
          
          _prefs?.setInt('pocket_motivation_streak', _streakCount);
          _prefs?.setInt('pocket_motivation_last_gen', today.millisecondsSinceEpoch);
          _hasGeneratedToday = true;
        }
      });
      _showToast('✨ Dynamic reminder loaded!');
    } catch (e) {
      _showToast('Error tailoring dynamic quote. Reverting to curated archive.');
      _setRandomFallbackQuote();
    } finally {
      setState(() => _isLoading = false);
    }
  }

  bool get _isCurrentFavorited {
    if (_currentQuote == null) return false;
    return _savedQuotes.any((q) => q.text.trim().toLowerCase() == _currentQuote!.text.trim().toLowerCase());
  }

  void _toggleFavoriteCurrent() {
    if (_currentQuote == null) return;
    
    if (_isCurrentFavorited) {
      final target = _savedQuotes.firstWhere((q) => q.text.trim().toLowerCase() == _currentQuote!.text.trim().toLowerCase());
      final filtered = _savedQuotes.where((q) => q.text.trim().toLowerCase() != _currentQuote!.text.trim().toLowerCase()).toList();
      _updateSavedQuotes(filtered, toDeleteId: target.id);
      _showToast('Removed from your library');
    } else {
      final Quote newFavorite = Quote(
        id: 'fb-fav-${DateTime.now().millisecondsSinceEpoch}',
        text: _currentQuote!.text,
        author: _currentQuote!.author,
        category: _currentQuote!.category,
        mood: _currentQuote!.mood,
        explanation: _currentQuote!.explanation,
        timestamp: DateTime.now().millisecondsSinceEpoch,
        isFavorite: true,
      );
      final updated = [newFavorite, ..._savedQuotes];
      _updateSavedQuotes(updated, toInsert: newFavorite);
      _showToast('Saved to your Library ❤️');
    }
  }

  void _addNewCustomQuote(String text, String author, String category) {
    if (text.isEmpty) return;
    
    final Quote customQuote = Quote(
      id: 'custom-${DateTime.now().millisecondsSinceEpoch}',
      text: text,
      author: author.isEmpty ? 'Anonymous Self' : author,
      category: category,
      mood: 'general',
      explanation: 'You wrote this beautiful reminder yourself to light up your journey.',
      isCustom: true,
      isFavorite: true,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    );

    final updated = [customQuote, ..._savedQuotes];
    _updateSavedQuotes(updated, toInsert: customQuote);
    _showToast('Custom wisdom saved to library!');
    setState(() {
      _currentTabIndex = 1; // Direct redirect to Library Tab
    });
  }

  void _deleteFromLibrary(String id) {
    final filtered = _savedQuotes.where((q) => q.id != id).toList();
    _updateSavedQuotes(filtered, toDeleteId: id);
    _showToast('Quote removed');
  }

  void _shareQuote(Quote quote) {
    final String shareText = '"${quote.text}" — ${quote.author} (via Pocket Motivation)';
    Share.share(shareText, subject: 'Pocket Motivation Inspiration');
  }

  void _copyToClipboard(Quote quote) {
    final String shareText = '"${quote.text}" — ${quote.author}';
    Clipboard.setData(ClipboardData(text: shareText));
    _showToast('📋 Copied inspiration to clipboard!');
  }

  void _showToast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 13, color: Colors.white),
        ),
        backgroundColor: const Color(0xFF0E1126),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        duration: const Duration(seconds: 3),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0xFF2E335A), width: 1),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> tabs = [
      _buildHomeTab(),
      _buildLibraryTab(),
      _buildCreateTab(),
      _buildDatabaseTab(),
    ];

    return Scaffold(
      body: Stack(
        children: [
          // Background Mesh Orbs
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withOpacity(0.12),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            bottom: -150,
            right: -100,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                color: const Color(0xFFEC4899).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
            ),
          ),
          
          SafeArea(
            child: IndexedStack(
              index: _currentTabIndex,
              children: tabs,
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentTabIndex,
        onTap: (index) => setState(() => _currentTabIndex = index),
        type: BottomNavigationBarType.fixed,
        backgroundColor: const Color(0xFF080B1E),
        selectedItemColor: const Color(0xFFEC4899),
        unselectedItemColor: const Color(0xFF6B7280),
        selectedFontSize: 11,
        unselectedFontSize: 11,
        selectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600),
        unselectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w500),
        elevation: 8,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.explore_outlined),
            activeIcon: Icon(Icons.explore),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.bookmark_outline),
            activeIcon: Icon(Icons.bookmark),
            label: 'Library',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.add_circle_outline),
            activeIcon: Icon(Icons.add_circle),
            label: 'Write',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.dns_outlined),
            activeIcon: Icon(Icons.dns),
            label: 'Sync DB',
          ),
        ],
      ),
    );
  }

  // --- TAB 1: HOME SCREEN ---
  Widget _buildHomeTab() {
    final activeMoodConfig = AppConfig.moods.firstWhere((m) => m['id'] == _selectedMood);
    final activeCatConfig = AppConfig.categories.firstWhere((c) => c['id'] == _selectedCategory);

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'POCKET',
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF6366F1),
                      letterSpacing: 2,
                    ),
                  ),
                  Text(
                    'Motivation',
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              
              // Streak badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFF59E0B).withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_fire_department, size: 16, color: Colors.white),
                    const SizedBox(width: 4),
                    Text(
                      '$_streakCount Day Streak',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 25),
          
          // Current Quote Glassmorphic Card
          if (_currentQuote != null) ...[
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF0E1126).withOpacity(0.9),
                    const Color(0xFF161A36).withOpacity(0.9),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: Colors.white.withOpacity(0.08),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.4),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category & Mood pill labels
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.3)),
                        ),
                        child: Text(
                          _currentQuote!.category.toUpperCase(),
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF818CF8),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEC4899).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFEC4899).withOpacity(0.3)),
                        ),
                        child: Text(
                          '${activeMoodConfig['emoji']} ${_currentQuote!.mood.toUpperCase()}',
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFFF472B6),
                          ),
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 25),
                  
                  // Quote text
                  Text(
                    _currentQuote!.text,
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                      height: 1.4,
                      color: Colors.white,
                    ),
                  ),
                  
                  const SizedBox(height: 15),
                  
                  // Author
                  Row(
                    children: [
                      Container(
                        width: 20,
                        height: 1,
                        color: Colors.white54,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _currentQuote!.author,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 25),
                  
                  // Toggle explanation accordion
                  if (_currentQuote!.explanation.isNotEmpty) ...[
                    GestureDetector(
                      onTap: () => setState(() => _showExplanation = !_showExplanation),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.04),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.between,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.info_outline, size: 16, color: Color(0xFF6366F1)),
                                    const SizedBox(width: 6),
                                    Text(
                                      'How to apply this today...',
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: const Color(0xFF818CF8),
                                      ),
                                    ),
                                  ],
                                ),
                                Icon(
                                  _showExplanation ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  size: 16,
                                  color: Colors.white54,
                                ),
                              ],
                            ),
                            if (_showExplanation) ...[
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 8),
                                child: Divider(color: Colors.white10),
                              ),
                              Text(
                                _currentQuote!.explanation,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  height: 1.5,
                                  color: Colors.white70,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                  
                  // Action buttons bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          IconButton(
                            onPressed: _toggleFavoriteCurrent,
                            icon: Icon(
                              _isCurrentFavorited ? Icons.favorite : Icons.favorite_border,
                              color: _isCurrentFavorited ? Colors.redAccent : Colors.white70,
                            ),
                            tooltip: 'Save to library',
                          ),
                          IconButton(
                            onPressed: () => _copyToClipboard(_currentQuote!),
                            icon: const Icon(Icons.copy, size: 20, color: Colors.white70),
                            tooltip: 'Copy to clipboard',
                          ),
                          IconButton(
                            onPressed: () => _shareQuote(_currentQuote!),
                            icon: const Icon(Icons.share, size: 20, color: Colors.white70),
                            tooltip: 'Share quote',
                          ),
                        ],
                      ),
                      
                      // Database Indicator
                      if (_isSupabaseConfigured)
                        Row(
                          children: [
                            const Icon(Icons.cloud_done, size: 14, color: Color(0xFF10B981)),
                            const SizedBox(width: 4),
                            Text(
                              'Synced',
                              style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF10B981)),
                            )
                          ],
                        ),
                    ],
                  )
                ],
              ),
            ),
          ],
          
          const SizedBox(height: 30),
          
          // Section: Mood tuning selector
          Text(
            'How are you feeling right now?',
            style: GoogleFonts.spaceGrotesk(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: AppConfig.moods.length,
              itemBuilder: (context, index) {
                final item = AppConfig.moods[index];
                final isSelected = item['id'] == _selectedMood;
                final Color moodColor = item['color'];
                
                return Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: FilterChip(
                    label: Text('${item['emoji']} ${item['label']}'),
                    selected: isSelected,
                    onSelected: (val) {
                      setState(() => _selectedMood = item['id']);
                    },
                    backgroundColor: const Color(0xFF0E1126),
                    selectedColor: moodColor.withOpacity(0.2),
                    checkmarkColor: moodColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: BorderSide(
                        color: isSelected ? moodColor : Colors.white.withOpacity(0.05),
                        width: 1,
                      ),
                    ),
                    labelStyle: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                      color: isSelected ? moodColor : Colors.white70,
                    ),
                  ),
                );
              },
            ),
          ),
          
          const SizedBox(height: 25),
          
          // Section: Category Selection List
          Text(
            'Choose your focus area',
            style: GoogleFonts.spaceGrotesk(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: AppConfig.categories.length,
            itemBuilder: (context, index) {
              final item = AppConfig.categories[index];
              final isSelected = item['id'] == _selectedCategory;
              final Color catColor = item['color'];
              
              return GestureDetector(
                onTap: () => setState(() => _selectedCategory = item['id']),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected ? catColor.withOpacity(0.08) : const Color(0xFF0E1126).withOpacity(0.6),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected ? catColor.withOpacity(0.5) : Colors.white.withOpacity(0.04),
                      width: 1.2,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: isSelected ? catColor.withOpacity(0.2) : Colors.white.withOpacity(0.04),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(item['icon'], color: catColor, size: 18),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['label'],
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item['desc'],
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: Colors.white54,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (isSelected)
                        Icon(Icons.check_circle, color: catColor, size: 18),
                    ],
                  ),
                ),
              );
            },
          ),
          
          const SizedBox(height: 30),
          
          // Floating Glow Action Button for new tailored generation
          SizedBox(
            width: double.infinity,
            height: 52,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF6366F1).withOpacity(0.35),
                    blurRadius: 15,
                    offset: const Offset(0, 5),
                  )
                ],
              ),
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 0,
                ),
                onPressed: _isLoading ? null : _generateQuote,
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.bolt, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Tailor My Dynamic Quote',
                            style: GoogleFonts.spaceGrotesk(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
          const SizedBox(height: 15),
        ],
      ),
    );
  }

  // --- TAB 2: LIBRARY / SAVED ARCHIVES ---
  Widget _buildLibraryTab() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'PERSONAL ARCHIVES',
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFFEC4899),
                      letterSpacing: 1.5,
                    ),
                  ),
                  Text(
                    'Your Wisdome Library',
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                ),
                child: Text(
                  '${_savedQuotes.length} Quotes',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.white70,
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          
          Expanded(
            child: _savedQuotes.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.bookmark_border, size: 60, color: Colors.white.withOpacity(0.15)),
                        const SizedBox(height: 15),
                        Text(
                          'Your library is quiet.',
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white38,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          'Tap the heart button on quotes you love,\nor write your own wisdom to save them here.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: Colors.white30,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    physics: const BouncingScrollPhysics(),
                    itemCount: _savedQuotes.length,
                    itemBuilder: (context, index) {
                      final quote = _savedQuotes[index];
                      final cat = AppConfig.categories.firstWhere((c) => c['id'] == quote.category, orElse: () => AppConfig.categories[0]);
                      
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0E1126),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.04),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.between,
                              children: [
                                Row(
                                  children: [
                                    Icon(cat['icon'], size: 14, color: cat['color']),
                                    const SizedBox(width: 6),
                                    Text(
                                      cat['label'],
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white54,
                                      ),
                                    ),
                                  ],
                                ),
                                if (quote.isCustom)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
                                    ),
                                    child: Text(
                                      'CUSTOM',
                                      style: GoogleFonts.spaceGrotesk(
                                        fontSize: 8,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFF34D399),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            
                            const SizedBox(height: 12),
                            
                            Text(
                              quote.text,
                              style: GoogleFonts.spaceGrotesk(
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                                color: Colors.white,
                              ),
                            ),
                            
                            const SizedBox(height: 8),
                            
                            Text(
                              '— ${quote.author}',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontStyle: FontStyle.italic,
                                color: Colors.white38,
                              ),
                            ),
                            
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 8.0),
                              child: Divider(color: Colors.white10, height: 1),
                            ),
                            
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                IconButton(
                                  onPressed: () => _copyToClipboard(quote),
                                  icon: const Icon(Icons.copy, size: 16, color: Colors.white54),
                                  constraints: const BoxConstraints(),
                                  padding: const EdgeInsets.all(4),
                                ),
                                const SizedBox(width: 10),
                                IconButton(
                                  onPressed: () => _shareQuote(quote),
                                  icon: const Icon(Icons.share, size: 16, color: Colors.white54),
                                  constraints: const BoxConstraints(),
                                  padding: const EdgeInsets.all(4),
                                ),
                                const SizedBox(width: 10),
                                IconButton(
                                  onPressed: () => _deleteFromLibrary(quote.id),
                                  icon: const Icon(Icons.delete, size: 16, color: Color(0xFFEF4444)),
                                  constraints: const BoxConstraints(),
                                  padding: const EdgeInsets.all(4),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  // --- TAB 3: CREATE / WRITE DRAFT Wisdome ---
  Widget _buildCreateTab() {
    final textController = TextEditingController();
    final authorController = TextEditingController();
    String draftCategory = 'general';

    return StatefulBuilder(
      builder: (context, setDraftState) {
        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'WRITE WISDOM',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF6366F1),
                  letterSpacing: 1.5,
                ),
              ),
              Text(
                'Create Custom Wisdom',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Pen your own insights, core values, or personalized reminders to sync with your library.',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: Colors.white54,
                ),
              ),
              
              const SizedBox(height: 25),
              
              // Quote Input Field
              Text(
                'The core reminder',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.white70,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: textController,
                maxLines: 4,
                maxLength: 240,
                style: GoogleFonts.spaceGrotesk(fontSize: 15, color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'e.g. Keep going, small steady efforts compound into massive impact...',
                  hintStyle: GoogleFonts.inter(color: Colors.white24, fontSize: 13),
                  filled: true,
                  fillColor: const Color(0xFF0E1126),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFF6366F1), width: 1.5),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.04)),
                  ),
                ),
              ),
              
              const SizedBox(height: 15),
              
              // Author input
              Text(
                'Author or Source',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.white70,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: authorController,
                style: GoogleFonts.inter(fontSize: 14, color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'e.g. Self, Grandma, Steve Jobs (or leave empty for Self)',
                  hintStyle: GoogleFonts.inter(color: Colors.white24, fontSize: 13),
                  filled: true,
                  fillColor: const Color(0xFF0E1126),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Color(0xFF6366F1), width: 1.5),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.04)),
                  ),
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Custom category grid
              Text(
                'Category Alignment',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.white70,
                ),
              ),
              const SizedBox(height: 10),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: 2.8,
                ),
                itemCount: AppConfig.categories.length,
                itemBuilder: (context, index) {
                  final cat = AppConfig.categories[index];
                  final isSelected = cat['id'] == draftCategory;
                  final Color cColor = cat['color'];
                  
                  return GestureDetector(
                    onTap: () {
                      setDraftState(() => draftCategory = cat['id']);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: isSelected ? cColor.withOpacity(0.1) : const Color(0xFF0E1126),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? cColor : Colors.white.withOpacity(0.03),
                          width: 1.2,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(cat['icon'], color: cColor, size: 14),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              cat['label'],
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                color: Colors.white,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              
              const SizedBox(height: 30),
              
              // Action Save button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFEC4899).withOpacity(0.25),
                        blurRadius: 15,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEC4899),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                    onPressed: () {
                      final txt = textController.text.trim();
                      final aut = authorController.text.trim();
                      if (txt.isEmpty) {
                        _showToast('Please draft a valid wisdom reminder first!');
                        return;
                      }
                      _addNewCustomQuote(txt, aut, draftCategory);
                      textController.clear();
                      authorController.clear();
                    },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.check, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Save Custom Wisdom',
                          style: GoogleFonts.spaceGrotesk(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      }
    );
  }

  // --- TAB 4: DATABASE CONNECTION & SYNC SETTINGS ---
  Widget _buildDatabaseTab() {
    final urlController = TextEditingController(text: _supabaseUrl);
    final keyController = TextEditingController(text: _supabaseAnonKey);

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.cloud_sync, color: Color(0xFF6366F1), size: 22),
              const SizedBox(width: 8),
              Text(
                'PERSISTENT SYNC',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF6366F1),
                  letterSpacing: 1.5,
                ),
              ),
            ],
          ),
          Text(
            'Supabase Sync Settings',
            style: GoogleFonts.spaceGrotesk(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Keep your personalized wisdom safe, synchronized across devices, and secure with durable Cloud Storage.',
            style: GoogleFonts.inter(
              fontSize: 12,
              color: Colors.white54,
              height: 1.4,
            ),
          ),
          
          const SizedBox(height: 25),
          
          // Current connection status card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _isSupabaseConfigured ? const Color(0xFF10B981).withOpacity(0.08) : const Color(0xFFEF4444).withOpacity(0.05),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: _isSupabaseConfigured ? const Color(0xFF10B981).withOpacity(0.3) : const Color(0xFFEF4444).withOpacity(0.2),
                width: 1.2,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: _isSupabaseConfigured ? const Color(0xFF10B981).withOpacity(0.15) : const Color(0xFFEF4444).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _isSupabaseConfigured ? Icons.cloud_done : Icons.cloud_off,
                    color: _isSupabaseConfigured ? const Color(0xFF34D399) : const Color(0xFFF87171),
                    size: 18,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isSupabaseConfigured ? 'Connected to Cloud' : 'Offline Mode (Local Storage Only)',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _isSupabaseConfigured 
                            ? 'Your database is fully active! Quotes sync in real-time.' 
                            : 'wisdom is stored only on this device. Disappears if app cache is wiped.',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: Colors.white54,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 25),
          
          // Form fields
          Text(
            'Supabase Project URL',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: urlController,
            style: GoogleFonts.inter(fontSize: 13, color: Colors.white),
            decoration: InputDecoration(
              hintText: 'https://xxxxxxxx.supabase.co',
              hintStyle: GoogleFonts.inter(color: Colors.white24, fontSize: 13),
              filled: true,
              fillColor: const Color(0xFF0E1126),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.04)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.04)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFF6366F1)),
              ),
            ),
          ),
          
          const SizedBox(height: 15),
          
          Text(
            'Supabase Anon Key',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: keyController,
            obscureText: true,
            style: GoogleFonts.inter(fontSize: 13, color: Colors.white),
            decoration: InputDecoration(
              hintText: 'eyJhbGciOiJIUzI1NiIsIn...',
              hintStyle: GoogleFonts.inter(color: Colors.white24, fontSize: 13),
              filled: true,
              fillColor: const Color(0xFF0E1126),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.04)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.04)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFF6366F1)),
              ),
            ),
          ),
          
          const SizedBox(height: 30),
          
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () {
                      final u = urlController.text.trim();
                      final k = keyController.text.trim();
                      _connectToSupabase(u, k);
                    },
                    child: Text(
                      _isSupabaseConfigured ? 'Update Sync Connection' : 'Sync & Connect Database',
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
              if (_isSupabaseConfigured) ...[
                const SizedBox(width: 10),
                IconButton(
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444).withOpacity(0.12),
                    foregroundColor: const Color(0xFFEF4444),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.all(12),
                  ),
                  onPressed: _disconnectSupabase,
                  icon: const Icon(Icons.power_settings_new),
                  tooltip: 'Disconnect sync',
                )
              ]
            ],
          ),
          
          const SizedBox(height: 30),
          
          // Schema instructions
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.02),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.04)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.terminal, color: Colors.white70, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      'Database Schema SQL',
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Run this SQL command inside your Supabase SQL Editor to provision the table correctly:',
                  style: GoogleFonts.inter(fontSize: 11, color: Colors.white38),
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: SelectableText(
                    'CREATE TABLE pocket_quotes (\n'
                    '  id TEXT PRIMARY KEY,\n'
                    '  text TEXT NOT NULL,\n'
                    '  author TEXT NOT NULL,\n'
                    '  category TEXT NOT NULL,\n'
                    '  mood TEXT DEFAULT \'general\',\n'
                    '  explanation TEXT DEFAULT \'\',\n'
                    '  is_custom BOOLEAN DEFAULT false,\n'
                    '  is_favorite BOOLEAN DEFAULT true,\n'
                    '  timestamp BIGINT NOT NULL\n'
                    ');',
                    style: GoogleFonts.firaCode(
                      fontSize: 10,
                      color: const Color(0xFF34D399),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
