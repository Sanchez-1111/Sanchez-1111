export interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
  mood?: string;
  explanation?: string;
  isCustom?: boolean;
  isFavorite?: boolean;
  timestamp: number;
}

export type MoodType = 'tired' | 'anxious' | 'unfocused' | 'low-energy' | 'excited' | 'general';

export interface MoodConfig {
  id: MoodType;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
}

export type CategoryType = 'general' | 'career' | 'mindset' | 'health' | 'creative' | 'relationships';

export interface CategoryConfig {
  id: CategoryType;
  label: string;
  iconName: string; // Lucide icon identifier
  color: string;
  description: string;
}
