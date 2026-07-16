import { View, ScrollView, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { Card } from 'react-native-paper';
import { getDB } from '@/src/db/database';

interface DashboardStats {
  total_loaned: number;
  active_loans: number;
  outstanding_cow: number;
  outstanding_calf: number;
  total_outstanding: number;
  collected_today: number;
  due_today: number;
  overdue_loans: number;
}

const StatCard = ({ title, value, prefix = 'R' }: any) => (
  <Card className="flex-1 m-1" mode="contained">
    <Card.Content className="py-3">
      <Text className="text-slate-400 text-xs">{title}</Text>
      <Text className="text-white text-lg font-bold mt-1">{prefix}{value.toFixed(2)}</Text>
    </Card.Content>
  </Card>
);

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const loadStats = async () => {
    const db = await getDB();
    const data = await db.getFirstAsync<any>(`
      SELECT 
        (SELECT COALESCE(SUM(original_cow),0) FROM loans) as total_loaned,
        (SELECT COUNT(*) FROM loans WHERE status IN ('Active','Overdue','Capped')) as active_loans,
        (SELECT COALESCE(SUM(current_cow),0) FROM loans WHERE status IN ('Active','Overdue','Capped')) as outstanding_cow,
        (SELECT COALESCE(SUM(current_calf),0) FROM loans WHERE status IN ('Active','Overdue','Capped')) as outstanding_calf,
        (SELECT COALESCE(SUM(total_due),0) FROM loans WHERE status IN ('Active','Overdue','Capped')) as total_outstanding,
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE date(payment_date) = date('now')) as collected_today,
        (SELECT COUNT(*) FROM loans WHERE status IN ('Active','Overdue','Capped') AND date(due_date) = date('now')) as due_today,
        (SELECT COUNT(*) FROM loans WHERE status = 'Overdue') as overdue_loans
    `);
    setStats(data);
  };

  useEffect(() => { loadStats(); }, []);

  if (!stats) return <View className="flex-1 bg-slate-900" />;

  return (
    <ScrollView className="flex-1 bg-slate-900 p-4">
      <Text className="text-white text-2xl font-bold mb-4">LMCC Dashboard</Text>
      <View className="flex-row flex-wrap">
        <StatCard title="Total Loaned" value={stats.total_loaned} />
        <StatCard title="Outstanding" value={stats.total_outstanding} />
        <StatCard title="Cow Owed" value={stats.outstanding_cow} />
        <StatCard title="Calf Owed" value={stats.outstanding_calf} />
        <StatCard title="Collected Today" value={stats.collected_today} />
        <StatCard title="Active Loans" value={stats.active_loans} prefix="" />
        <StatCard title="Due Today" value={stats.due_today} prefix="" />
        <StatCard title="Overdue" value={stats.overdue_loans} prefix="" />
      </View>
    </ScrollView>
  );
}
