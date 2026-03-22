import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { mockGroups, getGroupMembers, getGroupExpenses, currentUser } from '../../lib/mockData';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { JoinGroupModal } from '../modals/JoinGroupModal';

export function GroupListPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const calculateGroupTotal = (groupId: string) => {
    const expenses = getGroupExpenses(groupId);
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl">Gruplarım</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Merhaba, {currentUser.name.split(' ')[0]} 👋
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowJoinModal(true)}
              >
                Katıl
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="size-4 mr-1" />
                Oluştur
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Groups List */}
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        {mockGroups.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl mb-4">🏖️</div>
            <h3 className="text-xl">Henüz grup yok</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Arkadaşlarınızla ortak harcamaları takip etmek için bir grup oluşturun veya mevcut bir gruba katılın
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={() => setShowCreateModal(true)}>
                Grup Oluştur
              </Button>
              <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
                Gruba Katıl
              </Button>
            </div>
          </div>
        ) : (
          mockGroups.map((group) => {
            const members = getGroupMembers(group.id);
            const total = calculateGroupTotal(group.id);

            return (
              <Card
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg">{group.name}</h3>
                      {group.ownerId === currentUser.id && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                          Sahip
                        </span>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="size-4" />
                        <span>{members.length} kişi</span>
                      </div>
                      <div className="text-primary">
                        {formatCurrency(total)}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateGroupModal onClose={() => setShowCreateModal(false)} />
      )}
      {showJoinModal && (
        <JoinGroupModal onClose={() => setShowJoinModal(false)} />
      )}
    </div>
  );
}
