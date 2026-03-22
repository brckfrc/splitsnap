import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Upload, Camera } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { mockGroups, getGroupMembers } from '../../lib/mockData';

export function AddExpensePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'manual'>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const group = mockGroups.find((g) => g.id === groupId);
  const members = getGroupMembers(groupId!);

  if (!group) {
    return <div>Grup bulunamadı</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock - would save expense via API
    console.log('Creating expense:', {
      title,
      description,
      amount,
      date,
      paidBy,
      splitType,
      participants: Array.from(selectedParticipants),
    });
    navigate(`/groups/${groupId}`);
  };

  const toggleParticipant = (userId: string) => {
    const newSet = new Set(selectedParticipants);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedParticipants(newSet);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
        // Mock OCR suggestions
        setTitle(title || 'Deniz Restaurant');
        setAmount(amount || '2400');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/groups/${groupId}`)}
              className="p-2 hover:bg-accent rounded-full transition-colors -ml-2"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-xl">Yeni Harcama</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Receipt Upload */}
        <Card>
          <h3 className="mb-3">Fiş Fotoğrafı (İsteğe bağlı)</h3>
          {receiptImage ? (
            <div className="space-y-3">
              <img
                src={receiptImage}
                alt="Receipt"
                className="w-full rounded-lg object-cover max-h-64"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setReceiptImage(null)}
              >
                Fotoğrafı Kaldır
              </Button>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  ✨ Fiş bilgileri otomatik olarak algılandı
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-accent/50 transition-colors">
                <Camera className="size-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm">Fotoğraf Çek veya Yükle</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fiş bilgileri otomatik algılanacak
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          )}
        </Card>

        {/* Basic Info */}
        <Card>
          <h3 className="mb-4">Harcama Bilgileri</h3>
          <div className="space-y-4">
            <Input
              label="Başlık"
              placeholder="örn. Akşam Yemeği"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground">Açıklama (İsteğe bağlı)</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl bg-input-background border border-transparent focus:border-primary focus:outline-none transition-colors resize-none"
                placeholder="Detaylar..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tutar (₺)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />

              <Input
                label="Tarih"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
        </Card>

        {/* Payer */}
        <Card>
          <h3 className="mb-3">Kim Ödedi?</h3>
          <div className="space-y-2">
            {members.map((member) => (
              <label
                key={member.userId}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  paidBy === member.userId
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-input-background'
                }`}
              >
                <input
                  type="radio"
                  name="paidBy"
                  value={member.userId}
                  checked={paidBy === member.userId}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="sr-only"
                  required
                />
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                  {member.user.avatar || '👤'}
                </div>
                <span>{member.user.name}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Split Type */}
        <Card>
          <h3 className="mb-3">Nasıl Bölünecek?</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setSplitType('equal')}
              className={`p-4 rounded-xl border-2 transition-all ${
                splitType === 'equal'
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-input-background'
              }`}
            >
              <div className="text-2xl mb-2">⚖️</div>
              <div className="text-sm">Eşit Bölüşüm</div>
            </button>

            <button
              type="button"
              onClick={() => setSplitType('manual')}
              className={`p-4 rounded-xl border-2 transition-all ${
                splitType === 'manual'
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-input-background'
              }`}
            >
              <div className="text-2xl mb-2">✏️</div>
              <div className="text-sm">Manuel Dağıtım</div>
            </button>
          </div>

          {/* Participants */}
          <div>
            <h4 className="text-sm text-muted-foreground mb-3">Katılımcılar</h4>
            <div className="space-y-2">
              {members.map((member) => (
                <label
                  key={member.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedParticipants.has(member.userId)
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-input-background'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipants.has(member.userId)}
                    onChange={() => toggleParticipant(member.userId)}
                    className="sr-only"
                  />
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                    {member.user.avatar || '👤'}
                  </div>
                  <span className="flex-1">{member.user.name}</span>
                  {selectedParticipants.has(member.userId) && splitType === 'equal' && amount && (
                    <span className="text-sm text-primary">
                      ₺{(parseFloat(amount) / selectedParticipants.size).toFixed(2)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => navigate(`/groups/${groupId}`)}
          >
            İptal
          </Button>
          <Button type="submit" className="flex-1">
            Kaydet
          </Button>
        </div>
      </form>
    </div>
  );
}
