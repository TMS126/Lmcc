import { View, ScrollView, RefreshControl } from 'react-native'
import { Text, Card, Button } from 'react-native-paper'
import { useState, useCallback } from 'react'
import { useFocusEffect, router } from 'expo-router'
import { getDB, refreshLoanStatuses } from '@/src/db/database'
import { formatZAR } from '@/src/utils/formatters'

export default function DashboardScreen() {
  const [stats, setStats] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    await refreshLoanStatuses()
    const db = await getDB()
    const [loanStats] = await db.getAllAsync<any>(`
      SELECT
        COUNT(CASE WHEN status IN ('Active','Overdue','Capped') THEN 1 END) as activeLoans,
        COUNT(CASE WHEN status = 'Overdue' THEN 1 END) as overdueLoans,
        COALESCE(SUM(CASE WHEN status IN ('Active','Overdue','Capped') THEN total_due END), 0) as totalOutstanding
      FROM loans
    `)
    const [{ totalCustomers }] = await db.getAllAsync<any>(`SELECT COUNT(*) as totalCustomers FROM customers`)
    const [{ collectedThisMonth }] = await db.getAllAsync<any>(`
      SELECT COALESCE(SUM(amount), 0) as collectedThisMonth FROM payments
      WHERE strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')
    `)
    setStats({ ...loanStats, totalCustomers, collectedThisMonth })
  }

  useFocusEffect(useCallback(() => { load() }, []))
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  if (!stats) return <View className="flex-1 bg-background" />

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text variant="headlineMedium" className="font-bold mb-1">Dashboard</Text>
      <Text variant="bodySmall" className="opacity-50 mb-6">Overview of your loan book</Text>

      <Card className="mb-3 rounded-2xl" style={{ backgroundColor: '#0D1B2A' }}>
        <Card.Content>
          <Text variant="labelMedium" style={{ color: '#fff', opacity: 0.7 }}>Total Outstanding</Text>
          <Text variant="headlineLarge" style={{ color: '#fff' }} className="font-bold">{formatZAR(stats.totalOutstanding)}</Text>
        </Card.Content>
      </Card>

      <View className="flex-row gap-3 mb-3">
        <Card className="flex-1 rounded-2xl"><Card.Content>
          <Text variant="labelSmall" className="opacity-50">Active Loans</Text>
          <Text variant="headlineSmall" className="font-bold">{stats.activeLoans}</Text>
        </Card.Content></Card>
        <Card className="flex-1 rounded-2xl"><Card.Content>
          <Text variant="labelSmall" style={{ color: '#EF4444' }}>Overdue</Text>
          <Text variant="headlineSmall" className="font-bold" style={{ color: '#EF4444' }}>{stats.overdueLoans}</Text>
        </Card.Content></Card>
      </View>

      <View className="flex-row gap-3 mb-6">
        <Card className="flex-1 rounded-2xl"><Card.Content>
          <Text variant="labelSmall" className="opacity-50">Customers</Text>
          <Text variant="titleLarge" className="font-bold">{stats.totalCustomers}</Text>
        </Card.Content></Card>
        <Card className="flex-1 rounded-2xl"><Card.Content>
          <Text variant="labelSmall" style={{ color: '#10B981' }}>Collected (Month)</Text>
          <Text variant="titleLarge" className="font-bold" style={{ color: '#10B981' }}>{formatZAR(stats.collectedThisMonth)}</Text>
        </Card.Content></Card>
      </View>

      <Button mode="contained" onPress={() => router.push('/(tabs)/customers/add')} className="rounded-xl mb-2" contentStyle={{ paddingVertical: 6 }}>
        Add Customer
      </Button>
      <Button mode="outlined" onPress={() => router.push('/(tabs)/loan/new')} className="rounded-xl">
        New Loan
      </Button>
    </ScrollView>
  )
}
