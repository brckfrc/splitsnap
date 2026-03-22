import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { mockExpenses, getExpenseShares, getGroupMembers } from '../../lib/mockData';

export function EditExpensePage() {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();

  const expense = mockExpenses.find((e) => e.id === expenseId);
  const shares = getExpenseShares(expenseId!);
  const members = getGroupMembers(groupId!);

  const [title, setTitle] = useState(expense?.title || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [date, setDate] = useState(
    expense?.date ? new Date(expense.date).toISOString().split('T')[0] : ''
  );

  if (!expense) {
    return <div>Harcama bulunamadı</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Updating expense:', { title, description, amount, date });
    navigate(`/groups/${groupId}`);
  };

  const handleDelete = () => {
    if (confirm('Bu harcamayı silmek istediğinizden emin misiniz?')) {
      console.log('Deleting expense:', expenseId);
      navigate(`/groups/${groupId}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
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
            <h1 className="text-xl flex-1">Harcama Detayı</h1>
            <button
              onClick={handleDelete}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
            >
              <Trash2 className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Receipt Image */}
        {expense.receiptImageUrl && (
          <Card>
            <h3 className="mb-3">Fiş Fotoğrafı</h3>
            <img
              src={expense.receiptImageUrl}
              alt="Receipt"
              className="w-full rounded-lg object-cover max-h-64"
            />
          </Card>
        )}

        {/* Basic Info */}
        <Card>
          <h3 className="mb-4">Harcama Bilgileri</h3>
          <div className="space-y-4">
            <Input
              label="Başlık"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground">Açıklama</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl bg-input-background border border-transparent focus:border-primary focus:outline-none transition-colors resize-none"
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

        {/* Payer Info */}
        <Card>
          <h3 className="mb-3">Ödeyen</h3>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-input-background">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
              {expense.paidByUser?.avatar || '👤'}
            </div>
            <div>
              <div>{expense.paidByUser?.name}</div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(expense.amount)} ödedi
              </div>
            </div>
          </div>
        </Card>

        {/* Shares */}
        <Card>
          <h3 className="mb-3">Paylaşım ({expense.splitType === 'equal' ? 'Eşit' : 'Manuel'})</h3>
          <div className="space-y-3">
            {shares.map((share, index) => (
              <div key={share.userId}>
                {index > 0 && <div className="border-t border-border -mx-4 px-4 mb-3" />}
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                    {share.user?.avatar || '👤'}
                  </div>
                  <span className="flex-1">{share.user?.name}</span>
                  <span className="text-primary">{formatCurrency(share.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
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
            Güncelle
          </Button>
        </div>
      </form>
    </div>
  );
}
