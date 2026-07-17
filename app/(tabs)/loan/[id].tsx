import { View, ScrollView, RefreshControl } from 'react-native'
import { Text, Card, Chip, Button, Portal, Modal, TextInput } from 'react-native-paper'
import { useState, useCallback } from 'react'
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { getDB, refreshLoanStatuses } from '@/src/db/database'
import { formatZAR, formatDate, getStatusColor } from '@/src/utils/formatters'

export default function CustomerLoansScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [customer, setCustomer] = useState<any>(null)
  const [loans, setLoans] = useState<any[]>([])
  const [payments, setPayments] = useState<Record<string, any[]>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [payModal, setPayModal] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    await refreshLoanStatuses()
    const db = await getDB()
    setCustomer(await db.getFirstAsync<any>(`SELECT * FROM customers WHERE id=?`, [id]))
    const loanRows = await db.getAllAsync<any>(`SELECT * FROM loans WHERE customer_id=? ORDER BY created_at DESC`, [id])
    setLoans(loanRows)
    const paymentMap: Record<string, any[]> = {}
    for (const loan of loanRows) {
      paymentMap[loan.id] = await db.getAllAsync<any>(`SELECT * FROM payments WHERE loan_id=? ORDER BY paid_at DESC`, [loan.id])
    }
    setPayments(paymentMap)
  }

  useFocusEffect(useCallback(() => { load() }, [id]))
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const recordPayment = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0 || !payModal) return
    setSaving(true)
    try {
      const db = await getDB()
      const loan = loans.find(l => l.id === payModal)
      const paymentId = uuidv4()
      await db.runAsync(`INSERT INTO payments (id, loan_id, amount) VALUES (?, ?, ?)`, [paymentId, payModal, amt])
      const newTotal = Math.max(0, loan.total_due - amt)
      const newStatus = newTotal <= 0 ? 'Cleared' : loan.status
      await db.runAsync(`UPDATE loans SET total_due=?, status=? WHERE id=?`, [newTotal, newStatus, payModal])
      await db.runAsync(`INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES ('CREATE', 'payment', ?, ?)`,
        [paymentId, `Payment of ${formatZAR(amt)} recorded`])
      setPayModal(null); setAmount('')
      await load()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  if (!customer) return <View className="flex-1 bg-background" />

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text variant="headlineSmall" className="font-bold">{customer.full_name}</Text>
        <Text variant="bodySmall" className="opacity-50 mb-4">{customer.phone_number}</Text>

        {loans.length === 0 && <Text variant="bodyMedium" className="opacity-40 mt-8 text-center">No loans yet</Text>}

        {loans.map(loan => (
          <Card key={loan.id} className="mb-3 rounded-2xl">
            <Card.Content>
              <View className="flex-row justify-between items-center mb-2">
                <Text variant="titleMedium" className="font-bold">{formatZAR(loan.principal)} loan</Text>
                <Chip compact textStyle={{ color: '#fff' }} style={{ backgroundColor: getStatusColor(loan.status) }}>{loan.status}</Chip>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text variant="bodySmall" className="opacity-60">Due {formatDate(loan.due_date)}</Text>
                <Text variant="bodySmall" className="opacity-60">{loan.monthly_rate}%/mo</Text>
              </View>
              <View className="flex-row justify-between mb-3">
                <Text variant="bodyMedium" className="opacity-70">Outstanding</Text>
                <Text variant="titleMedium" className="font-bold">{formatZAR(loan.total_due)}</Text>
              </View>

              {payments[loan.id]?.length > 0 && (
                <View className="mb-3 border-t border-gray-200 pt-2">
                  {payments[loan.id].map(p => (
                    <View key={p.id} className="flex-row justify-between">
                      <Text variant="labelSmall" className="opacity-50">{formatDate(p.paid_at)}</Text>
                      <Text variant="labelSmall" className="opacity-70">{formatZAR(p.amount)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {loan.status !== 'Cleared' && (
                <Button mode="contained-tonal" onPress={() => setPayModal(loan.id)} className="rounded-xl">Record Payment</Button>
              )}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <Button mode="contained" onPress={() => router.push(`/(tabs)/loan/new?customerId=${id}`)}
        style={{ position: 'absolute', left: 16, right: 16, bottom: 24 }} contentStyle={{ paddingVertical: 6 }} className="rounded-xl">
        New Loan
      </Button>

      <Portal>
        <Modal visible={!!payModal} onDismiss={() => setPayModal(null)} contentContainerStyle={{ backgroundColor: 'white', margin: 24, padding: 20, borderRadius: 16 }}>
          <Text variant="titleMedium" className="font-bold mb-3">Record Payment</Text>
          <TextInput label="Amount (R)" value={amount} onChangeText={setAmount} mode="outlined" keyboardType="decimal-pad" className="mb-3" />
          <Button mode="contained" onPress={recordPayment} loading={saving} disabled={saving} className="rounded-xl">Save Payment</Button>
        </Modal>
      </Portal>
    </View>
  )
    }
