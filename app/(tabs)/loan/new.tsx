import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { Text, TextInput, Button, HelperText, Searchbar, List } from 'react-native-paper'
import { useState, useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from '@/src/db/database'
import { formatZAR, calculateLoan, DEFAULT_MONTHLY_RATE } from '@/src/utils/formatters'

export default function NewLoanScreen() {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>()
  const [customer, setCustomer] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState(String(DEFAULT_MONTHLY_RATE))
  const [termWeeks, setTermWeeks] = useState('4')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (customerId) {
      getDB().then(async db => setCustomer(await db.getFirstAsync<any>(`SELECT * FROM customers WHERE id=?`, [customerId])))
    }
  }, [customerId])

  const searchCustomers = async (q: string) => {
    setSearch(q)
    if (!q.trim()) { setResults([]); return }
    const db = await getDB()
    setResults(await db.getAllAsync<any>(`SELECT * FROM customers WHERE full_name LIKE ? OR phone_number LIKE ? LIMIT 10`, [`%${q}%`, `%${q}%`]))
  }

  const principalNum = parseFloat(principal) || 0
  const rateNum = parseFloat(rate) || 0
  const weeksNum = parseInt(termWeeks) || 1
  const preview = principalNum > 0 ? calculateLoan({ principal: principalNum, monthlyRate: rateNum, termWeeks: weeksNum, startDate: new Date() }) : null

  const onSubmit = async () => {
    if (!customer) { setError('Select a customer first'); return }
    if (principalNum <= 0) { setError('Enter a valid loan amount'); return }
    setError(''); setSaving(true)
    try {
      const db = await getDB()
      const id = uuidv4()
      const now = new Date()
      const calc = calculateLoan({ principal: principalNum, monthlyRate: rateNum, termWeeks: weeksNum, startDate: now })
      await db.runAsync(
        `INSERT INTO loans (id, customer_id, principal, monthly_rate, term_weeks, start_date, due_date, total_due, accrued_interest, last_accrual_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
        [id, customer.id, principalNum, rateNum, weeksNum, now.toISOString(), calc.dueDate, calc.totalDue, calc.interest, now.toISOString()]
      )
      await db.runAsync(`INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES ('CREATE', 'loan', ?, ?)`,
        [id, `Loan of ${formatZAR(principalNum)} issued to ${customer.full_name}`])
      router.replace(`/(tabs)/loan/${customer.id}`)
    } catch (e) {
      console.error(e); setError('Something went wrong saving the loan')
    } finally { setSaving(false) }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text variant="headlineSmall" className="font-bold mb-1">New Loan</Text>
        <Text variant="bodySmall" className="opacity-50 mb-6">Interest is calculated automatically, capped under the in duplum rule.</Text>

        {customer ? (
          <View className="bg-surface rounded-2xl p-4 mb-4 flex-row items-center justify-between">
            <View>
              <Text variant="titleMedium" className="font-bold">{customer.full_name}</Text>
              <Text variant="bodySmall" className="opacity-60">{customer.phone_number}</Text>
            </View>
            <Button mode="text" onPress={() => setCustomer(null)}>Change</Button>
          </View>
        ) : (
          <View className="mb-4">
            <Searchbar placeholder="Search customer by name or phone" value={search} onChangeText={searchCustomers} className="rounded-2xl mb-2" />
            {results.map(c => (
              <TouchableOpacity key={c.id} onPress={() => { setCustomer(c); setResults([]); setSearch('') }}>
                <List.Item title={c.full_name} description={c.phone_number} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextInput label="Loan Amount (R)" value={principal} onChangeText={setPrincipal} mode="outlined" keyboardType="decimal-pad" className="mb-3" />
        <TextInput label="Monthly Interest Rate (%)" value={rate} onChangeText={setRate} mode="outlined" keyboardType="decimal-pad" className="mb-3" />
        <TextInput label="Term (weeks)" value={termWeeks} onChangeText={setTermWeeks} mode="outlined" keyboardType="number-pad" className="mb-3" />

        {preview && (
          <View className="bg-surface rounded-2xl p-4 mb-4">
            <View className="flex-row justify-between mb-1">
              <Text variant="bodyMedium" className="opacity-60">Interest</Text>
              <Text variant="bodyMedium" className="font-medium">{formatZAR(preview.interest)}</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text variant="bodyMedium" className="opacity-60">Total Repayable</Text>
              <Text variant="titleMedium" className="font-bold">{formatZAR(preview.totalDue)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text variant="bodyMedium" className="opacity-60">Weekly Installment</Text>
              <Text variant="bodyMedium" className="font-medium">{formatZAR(preview.weeklyInstallment)}</Text>
            </View>
          </View>
        )}

        <HelperText type="error" visible={!!error}>{error}</HelperText>

        <Button mode="contained" onPress={onSubmit} loading={saving} disabled={saving} contentStyle={{ paddingVertical: 6 }} className="rounded-xl">
          Issue Loan
        </Button>
        <Button mode="text" onPress={() => router.back()} className="mt-2">Cancel</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
