import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface JoinGroupModalProps {
  onClose: () => void;
}

export function JoinGroupModal({ onClose }: JoinGroupModalProps) {
  const [inviteCode, setInviteCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock - would join group via API
    console.log('Joining group with code:', inviteCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl">Gruba Katıl</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Davet Kodu"
            placeholder="ABC123"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
          />

          <div className="p-4 bg-accent/50 rounded-xl border border-border">
            <p className="text-sm text-muted-foreground">
              Grup sahibinden aldığınız davet kodunu girin. Kod genellikle 6 haneli bir kombinasyondur.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              İptal
            </Button>
            <Button type="submit" className="flex-1">
              Katıl
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
