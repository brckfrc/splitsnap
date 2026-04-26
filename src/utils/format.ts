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

export function guessCategoryEmoji(title: string): string {
  if (!title) return '📝';
  const lowerTitle = title.toLowerCase();
  
  for (const [emoji, keywords] of Object.entries(EMOJI_MAP)) {
    if (keywords.some(k => lowerTitle.includes(k))) {
      return emoji;
    }
  }
  return '📝'; // Default receipt emoji
}
