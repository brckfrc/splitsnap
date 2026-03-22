import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { mockGroups, getGroupExpenses, getExpenseShares, getGroupMembers, currentUser } from '../../lib/mockData';
import { Settlement, User } from '../../types';

export function SettlementPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const group = mockGroups.find((g) => g.id === groupId);
  const expenses = getGroupExpenses(groupId!);
  const members = getGroupMembers(groupId!);

  if (!group) {
    return <div>Grup bulunamadı</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate balances for each user
  const calculateBalances = () => {
    const balances: Record<string, number> = {};

    members.forEach((member) => {
      balances[member.userId] = 0;
    });

    expenses.forEach((expense) => {
      // Add to payer
      if (balances[expense.paidBy] !== undefined) {
        balances[expense.paidBy] += expense.amount;
      }

      // Subtract shares
      const shares = getExpenseShares(expense.id);
      shares.forEach((share) => {
        if (balances[share.userId] !== undefined) {
          balances[share.userId] -= share.amount;
        }
      });
    });

    return balances;
  };

  // Simplify settlements using greedy algorithm
  const calculateSettlements = (): Settlement[] => {
    const balances = calculateBalances();
    const settlements: Settlement[] = [];

    const creditors = members
      .filter((m) => balances[m.userId] > 0)
      .map((m) => ({ user: m.user, amount: balances[m.userId] }))
      .sort((a, b) => b.amount - a.amount);

    const debtors = members
      .filter((m) => balances[m.userId] < 0)
      .map((m) => ({ user: m.user, amount: -balances[m.userId] }))
      .sort((a, b) => b.amount - a.amount);

    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];

      const settleAmount = Math.min(creditor.amount, debtor.amount);

      if (settleAmount > 0.01) {
        settlements.push({
          from: debtor.user,
          to: creditor.user,
          amount: settleAmount,
        });
      }

      creditor.amount -= settleAmount;
      debtor.amount -= settleAmount;

      if (creditor.amount < 0.01) i++;
      if (debtor.amount < 0.01) j++;
    }

    return settlements;
  };

  const balances = calculateBalances();
  const settlements = calculateSettlements();
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // User-specific settlements
  const userSettlements = settlements.filter(
    (s) => s.from.id === currentUser.id || s.to.id === currentUser.id
  );

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
            <div>
              <h1 className="text-xl">Hesaplaşma</h1>
              <p className="text-sm text-muted-foreground">{group.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Total Summary */}
        <Card className="bg-primary/5 border-primary/20">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Toplam Harcama</div>
            <div className="text-3xl text-primary mb-4">{formatCurrency(totalExpenses)}</div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-primary/20">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Harcama</div>
                <div className="text-sm">{expenses.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Üye</div>
                <div className="text-sm">{members.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Ödeme</div>
                <div className="text-sm">{settlements.length}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Your Settlements */}
        {userSettlements.length > 0 && (
          <div>
            <h3 className="text-sm text-muted-foreground mb-3">Senin Ödemenlerin</h3>
            <div className="space-y-3">
              {userSettlements.map((settlement, index) => {
                const isDebtor = settlement.from.id === currentUser.id;
                return (
                  <Card
                    key={index}
                    className={isDebtor ? 'bg-destructive/5 border-destructive/20' : 'bg-green-500/5 border-green-500/20'}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                        {settlement.from.avatar || '👤'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{settlement.from.name}</span>
                          <ArrowRight className="size-4 text-muted-foreground" />
                          <span className="text-sm">{settlement.to.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isDebtor
                            ? `${settlement.to.name.split(' ')[0]}'a ödeyeceksin`
                            : `${settlement.from.name.split(' ')[0]} sana ödeyecek`}
                        </div>
                      </div>
                      <div className={`text-lg ${isDebtor ? 'text-destructive' : 'text-green-600'}`}>
                        {formatCurrency(settlement.amount)}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* All Settlements */}
        <div>
          <h3 className="text-sm text-muted-foreground mb-3">
            Tüm Ödemeler ({settlements.length})
          </h3>
          {settlements.length === 0 ? (
            <Card>
              <div className="text-center py-8 space-y-2">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-foreground">Herkes başabaş!</p>
                <p className="text-sm text-muted-foreground">
                  Şu anda kimsenin kimseye borcu yok
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {settlements.map((settlement, index) => (
                <Card key={index}>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                      {settlement.from.avatar || '👤'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{settlement.from.name}</span>
                        <ArrowRight className="size-4 text-muted-foreground" />
                        <span className="text-sm">{settlement.to.name}</span>
                      </div>
                    </div>
                    <div className="text-lg text-primary">
                      {formatCurrency(settlement.amount)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Individual Balances */}
        <div>
          <h3 className="text-sm text-muted-foreground mb-3">Kişi Bazında Durum</h3>
          <Card>
            <div className="space-y-3">
              {members.map((member, index) => {
                const balance = balances[member.userId];
                const paid = expenses
                  .filter((e) => e.paidBy === member.userId)
                  .reduce((sum, e) => sum + e.amount, 0);
                const share = expenses.reduce((sum, expense) => {
                  const shares = getExpenseShares(expense.id);
                  const userShare = shares.find((s) => s.userId === member.userId);
                  return sum + (userShare?.amount || 0);
                }, 0);

                return (
                  <div key={member.userId}>
                    {index > 0 && <div className="border-t border-border -mx-4 px-4 mb-3" />}
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                        {member.user.avatar || '👤'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{member.user.name}</span>
                          {member.userId === currentUser.id && (
                            <span className="text-xs text-muted-foreground">(Sen)</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div>Ödedi: {formatCurrency(paid)}</div>
                          <div>Payı: {formatCurrency(share)}</div>
                        </div>
                      </div>
                      <div
                        className={`text-lg ${
                          balance > 0
                            ? 'text-green-600'
                            : balance < 0
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {balance > 0 && '+'}
                        {formatCurrency(balance)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Info */}
        <div className="p-4 bg-accent/50 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground">
            💡 Pozitif bakiye alacaklı, negatif bakiye borçlu olduğunuzu gösterir. 
            Yukarıdaki önerilen ödemeler ile en az işlemle hesaplaşabilirsiniz.
          </p>
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => navigate(`/groups/${groupId}`)}
        >
          Grup Detayına Dön
        </Button>
      </div>
    </div>
  );
}
