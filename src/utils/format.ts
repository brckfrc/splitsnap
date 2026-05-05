import { getEmojiMap } from '@/services/emoji-map-service';

export function formatCurrencyTry(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const EMOJI_MAP: Record<string, string[]> = {
  '🍔': ['yemek', 'kahvaltı', 'akşam', 'öğle', 'burger', 'pizza', 'kebap', 'döner', 'restoran', 'lokanta', 'cafe', 'kafe', 'tatlı', 'dondurma', 'kahve', 'çay'],
  '🛒': ['market', 'bakkal', 'manav', 'kasap', 'fırın', 'süpermarket', 'migros', 'carrefour', 'şok', 'bim', 'a101', 'alışveriş', 'avm'],
  '🚕': ['taksi', 'uber', 'bitaksi', 'martı', 'ulaşım', 'yol', 'otobüs', 'metro', 'vapur', 'bilet', 'uçak', 'tren', 'yakıt', 'benzin', 'mazot', 'otopark'],
  '🏠': ['kira', 'aidat', 'ev', 'elektrik', 'su', 'doğalgaz', 'internet', 'fatura', 'temizlik', 'mobilya', 'eşya'],
  '🎮': ['oyun', 'eğlence', 'sinema', 'tiyatro', 'konser', 'bilet', 'netflix', 'spotify', 'abonelik', 'hobi'],
  '🏥': ['sağlık', 'hastane', 'doktor', 'ilaç', 'eczane', 'muayene', 'tahlil', 'diş'],
  '👕': ['giyim', 'kıyafet', 'ayakkabı', 'elbise', 'pantolon', 'tişört', 'kaban', 'mont', 'çanta', 'aksesuar', 'kozmetik', 'kuaför', 'berber'],
  '🐾': ['kedi', 'köpek', 'mama', 'veteriner', 'pet', 'evcil'],
};

/**
 * Guess an emoji for an expense title.
 *
 * Priority:
 * 1. Dynamic emoji map (platform-wide usage stats from Supabase, cached in MMKV)
 * 2. Static keyword dictionary (hardcoded fallback)
 * 3. Default 📝
 */
export function guessCategoryEmoji(title: string): string {
  if (!title) return '📝';
  const lowerTitle = title.toLowerCase();
  const words = lowerTitle.split(/\s+/).filter(Boolean);

  // 1. Check dynamic map (user behavior data)
  const dynamicMap = getEmojiMap();
  for (const word of words) {
    if (dynamicMap[word]) {
      return dynamicMap[word];
    }
  }

  // 2. Fallback to static keyword dictionary
  for (const [emoji, keywords] of Object.entries(EMOJI_MAP)) {
    if (keywords.some(k => lowerTitle.includes(k))) {
      return emoji;
    }
  }
  return '📝'; // Default receipt emoji
}

