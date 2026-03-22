import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Plus, Users, Receipt, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { mockGroups, getGroupMembers, getGroupExpenses, getExpenseShares, currentUser } from '../../lib/mockData';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const group = mockGroups.find((g) => g.id === groupId);
  const members = getGroupMembers(groupId!);
  const expenses = getGroupExpenses(groupId!);

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

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate user's balance
  const calculateUserBalance = () => {
    let paid = 0;
    let owes = 0;

    expenses.forEach((expense) => {
      if (expense.paidBy === currentUser.id) {
        paid += expense.amount;
      }
      const shares = getExpenseShares(expense.id);
      const userShare = shares.find((s) => s.userId === currentUser.id);
      if (userShare) {
        owes += userShare.amount;
      }
    });

    return paid - owes;
  };

  const userBalance = calculateUserBalance();

  return (
    <div className="min-h-full bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/groups')}
              className="p-2 hover:bg-accent rounded-full transition-colors -ml-2"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl">{group.name}</h1>
              {group.description && (
                <p className="text-sm text-muted-foreground">{group.description}</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Receipt className="size-4" />
                Toplam Harcama
              </div>
              <div className="text-xl text-primary">{formatCurrency(totalExpenses)}</div>
            </Card>

            <Card className={`${
              userBalance > 0 
                ? 'bg-green-500/5 border-green-500/20' 
                : userBalance < 0 
                ? 'bg-destructive/5 border-destructive/20'
                : 'bg-muted/20'
            }`}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="size-4" />
                Durumunuz
              </div>
              <div className={`text-xl ${
                userBalance > 0 
                  ? 'text-green-600' 
                  : userBalance < 0 
                  ? 'text-destructive'
                  : 'text-foreground'
              }`}>
                {userBalance > 0 && '+'}
                {formatCurrency(userBalance)}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => navigate(`/groups/${groupId}/add-expense`)}
            className="w-full"
          >
            <Plus className="size-4 mr-2" />
            Harcama Ekle
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/groups/${groupId}/settlement`)}
            className="w-full"
          >
            <Users className="size-4 mr-2" />
            Hesaplaşma
          </Button>
        </div>

        {/* Members */}
        <div>
          <h3 className="text-sm text-muted-foreground mb-3">
            Üyeler ({members.length})
          </h3>
          <Card>
            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={member.userId}>
                  {index > 0 && <div className="border-t border-border -mx-4 px-4" />}
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                      {member.user.avatar || '👤'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{member.user.name}</span>
                        {member.userId === currentUser.id && (
                          <span className="text-xs text-muted-foreground">(Sen)</span>
                        )}
                        {member.userId === group.ownerId && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                            Sahip
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{member.user.email}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Expenses */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-muted-foreground">
              Harcamalar ({expenses.length})
            </h3>
          </div>
          
          {expenses.length === 0 ? (
            <Card>
              <div className="text-center py-8 space-y-2">
                <div className="text-4xl mb-2">🧾</div>
                <p className="text-muted-foreground">Henüz harcama yok</p>
                <p className="text-sm text-muted-foreground">
                  İlk harcamayı eklemek için yukarıdaki butona tıklayın
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => {
                const shares = getExpenseShares(expense.id);
                const participantCount = shares.length;

                return (
                  <Card
                    key={expense.id}
                    onClick={() => navigate(`/groups/${groupId}/expenses/${expense.id}/edit`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="truncate mb-1">{expense.title}</h4>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground mb-2 truncate">
                            {expense.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>
                            {format(new Date(expense.date), 'd MMM', { locale: tr })}
                          </span>
                          <span>•</span>
                          <span>{expense.paidByUser?.name.split(' ')[0]} ödedi</span>
                          <span>•</span>
                          <span>{participantCount} kişi</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg">{formatCurrency(expense.amount)}</div>
                        {expense.receiptImageUrl && (
                          <div className="text-xs text-muted-foreground mt-1">
                            📎 Fiş var
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
