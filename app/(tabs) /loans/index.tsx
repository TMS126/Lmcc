import { View, Text, FlatList, Button } from 'react-native';
import { useEffect, useState } from 'react';
import { Card } from 'react-native-paper';
import { getDB } from '@/src/db/database';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

const StatusBadge = ({ status }: { status: string }) => {
  const colors: any = {
    Active: '#3B82F6',
    Paid: '#10B981',
    Overdue: '#EF4444',
    Capped: '#F59E0B'
  };
  return (
    <View style={{ backgroundColor: colors[status], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
      <Text className="text-white text-xs font-bold">{status}</Text>
    </View>
  );
};

export default function LoansScreen() {
  const [loans, setLoans] = useState<any[]>([]);

  const loadLoans = async () => {
    const db = await getDB();
    const data = await db.getAllAsync(`
      SELECT l.*, c.full_name 
      FROM loans l 
      JOIN customers c ON l.customer_id = c.id 
      ORDER BY l.loan_date DESC
    `);
    setLoans(data);
  };

  useFocusEffect(useCallback(() => { loadLoans(); }, []));

  return (
    <View className="flex-1 bg-slate-900 p-4">
      <Text className="text-white text-2xl font-bold mb-4">All Loans</Text>
      <FlatList
        data={loans}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Card className="mb-3" mode="contained">
            <Card.Content>
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-white font-bold">{item.full_name}</Text>
                  <Text className="text-slate-400 text-xs">{item.id}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <Text className="text-slate-300 text-sm">Cow: R{item.current_cow.toFixed(2)} | Calf: R{item.current_calf.toFixed(2)}</Text>
              <Text className="text-white font-bold">Due: R{item.total_due.toFixed(2)}</Text>
              <Text className="text-slate-500 text-xs">Due Date: {item.due_date}</Text>
              {item.status!== 'Paid' && (
                <Button title="Take Payment" onPress={() => router.push(`/loans/${item.id}/pay`)} />
              )}
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}
