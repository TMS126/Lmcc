import { View, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Text, Searchbar, FAB, Chip, Avatar } from 'react-native-paper'
import { useState, useCallback } from 'react'
import { useFocusEffect, router } from 'expo-router'
import { getDB } from '@/src/db/database'
import { getStatusColor } from '@/src/utils/formatters'
import { formatZAR } from '@/src/utils/formatters'

interface CustomerSummary {
  id: string
  full_name: string
  phone_number: string
  active_loans: number
  total_outstanding: number
  has_overdue: boolean
}

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [filtered, setFiltered] = useState<CustomerSummary[]>([])
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue' | 'clear'>('all')

  const load = async () => {
    const db = await getDB()
    const rows = await db.getAllAsync<CustomerSummary>(`
      SELECT
        c.id, c.full_name, c.phone_number,
        COUNT(CASE WHEN l.status IN ('Active','Overdue','Capped') THEN 1 END) as active_loans,
        COALESCE(SUM(CASE WHEN l.status IN ('Active','Overdue','Capped') THEN l.total_due END), 0) as total_outstanding,
        MAX(CASE WHEN l.status = 'Overdue' THEN 1 ELSE 0 END) as has_overdue
      FROM customers c
      LEFT JOIN loans l ON l.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.full_name ASC
    `)
    setCustomers(rows)
    applyFilter(rows, search, filter)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const applyFilter = (data: CustomerSummary[], q: string, f: string) => {
    let result = data
    if (q.trim()) {
      const lower = q.toLowerCase()
      result = result.filter(c =>
        c.full_name.toLowerCase().includes(lower) ||
        c.phone_number?.includes(q)
      )
    }
    if (f === 'active') result = result.filter(c => c.active_loans > 0)
    if (f === 'overdue') result = result.filter(c => c.has_overdue)
    if (f === 'clear') result = result.filter(c => c.active_loans === 0)
    setFiltered(result)
  }

  const handleSearch = (q: string) => {
    setSearch(q)
    applyFilter(customers, q, filter)
  }

  const handleFilter = (f: typeof filter) => {
    const next = filter === f ? 'all' : f
    setFilter(next)
    applyFilter(customers, search, next)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const renderItem = ({ item }: { item: CustomerSummary }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/loan/${item.id}`)}
      className="mx-4 mb-3 bg-surface rounded-2xl p-4 flex-row items-center"
      style={{ elevation: 1 }}
    >
      <Avatar.Text
        size={48}
        label={initials(item.full_name)}
        style={{
          backgroundColor: item.has_overdue ? '#EF4444' : item.active_loans > 0 ? '#0D1B2A' : '#6B7280'
        }}
      />
      <View className="flex-1 ml-3">
        <Text variant="titleMedium" className="font-bold">{item.full_name}</Text>
        <Text variant="bodySmall" className="opacity-60">{item.phone_number || 'No phone'}</Text>
        {item.active_loans > 0 ? (
          <View className="flex-row items-center mt-1 gap-2">
            <Text
              variant="labelSmall"
              style={{ color: item.has_overdue ? '#EF4444' : '#10B981' }}
            >
              {item.has_overdue ? '⚠ Overdue' : '● Active'}
            </Text>
            <Text variant="labelSmall" className="opacity-50">·</Text>
            <Text variant="labelSmall" className="opacity-70">
              {formatZAR(item.total_outstanding)} outstanding
            </Text>
          </View>
        ) : (
          <Text variant="labelSmall" className="opacity-40 mt-1">No active loans</Text>
        )}
      </View>
      <Text className="opacity-30 text-lg">›</Text>
    </TouchableOpacity>
  )

  return (
    <View className="flex-1 bg-background">
      {/* Search */}
      <View className="px-4 pt-4 pb-2">
        <Searchbar
          placeholder="Search by name or phone"
          value={search}
          onChangeText={handleSearch}
          className="rounded-2xl"
        />
      </View>

      {/* Filter chips */}
      <View className="flex-row px-4 pb-3 gap-2">
        {([['active', 'Active Loans'], ['overdue', '⚠ Overdue'], ['clear', 'Cleared']] as const).map(([key, label]) => (
          <Chip
            key={key}
            selected={filter === key}
            onPress={() => handleFilter(key)}
            compact
          >
            {label}
          </Chip>
        ))}
      </View>

      {/* Count */}
      <Text variant="labelSmall" className="px-4 pb-2 opacity-50">
        {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text variant="bodyLarge" className="opacity-40">No customers found</Text>
            <Text variant="bodySmall" className="opacity-30 mt-1">Tap + to add your first customer</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <FAB
        icon="account-plus"
        style={{ position: 'absolute', right: 16, bottom: 24, backgroundColor: '#0D1B2A' }}
        color="#fff"
        onPress={() => router.push('/(tabs)/customers/add')}
      />
    </View>
  )
                       }
