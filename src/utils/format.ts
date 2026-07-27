import { getEmojiMap } from '@/services/emoji-map-service';

export function formatCurrency(amount: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyTry(amount: number) {
  return formatCurrency(amount, 'TRY');
}

/** Time-of-day greeting based on the device's local clock. */
export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi günler';
  if (hour >= 18 && hour < 22) return 'İyi akşamlar';
  return 'İyi geceler';
}

/**
 * Day-granularity relative label for activity feeds ("Bugün", "Dün",
 * "3 gün önce"), falling back to an absolute date past a week where
 * "23 gün önce" stops being easier to read than the date itself.
 */
export function formatRelativeDay(iso: string, now = new Date()) {
  const then = new Date(iso);
  if (isNaN(then.getTime())) return iso;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);

  if (days <= 0) return 'Bugün';
  if (days === 1) return 'Dün';
  if (days < 7) return `${days} gün önce`;
  return formatShortDate(iso);
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

/** Spelled-out month with weekday, for detail views where space isn't tight. */
export function formatLongDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

export function formatShortName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  
  const firstName = parts[0];
  const lastPart = parts[parts.length - 1];
  const middleParts = parts.slice(1, -1);
  
  if (middleParts.length === 0) {
    return `${firstName} ${lastPart.charAt(0).toUpperCase()}.`;
  }
  
  const middleInitials = middleParts
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(' ');
    
  return `${firstName} ${middleInitials} ${lastPart.charAt(0).toUpperCase()}.`;
}

