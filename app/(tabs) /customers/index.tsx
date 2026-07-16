import { View, ScrollView, Text, TextInput, Button, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { Card } from 'react-native-paper';
import { getDB } from '@/src/db/database';
import { router } from 'expo-router';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const loadCustomers = async () => {
    const db = await getDB();
    const data = await db.getAllAsync(`SELECT * FROM customers ORDER BY date_added DESC`);
    setCustomers(data);
  };

  const addCustomer = async () => {
    if (name.length < 2) return;
    const db = await getDB();
    const id = `CUS-${Date.now()}`;
    await db.runAsync(
      `INSERT INTO customers (id, full_name, phone_number) VALUES (?,?,?)`,
      [id, name, phone]
    );
    await db.runAsync(
      `INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES ('CREATE','customer',?,?)`,
      [id, `Customer ${name} added`]
    );
    setName(''); setPhone('');
    loadCustomers();
  };

  useEffect(() => { loadCustomers(); }, []);

  return (
    <View className="flex-1 bg-slate-900 p-4">
      <Text className="text-white text-2xl font-bold mb-4">Customers</Text>
      <Card className="mb-4" mode="contained">
        <Card.Content>
          <TextInput
            className="bg-slate-800 text-white p-3 rounded mb-2"
            placeholder="Full Name"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            className="bg-slate-800 text-white p-3 rounded mb-3"
            placeholder="Phone Number"
            placeholderTextColor="#64748b"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Button title="Add Customer" onPress={addCustomer} />
        </Card.Content>
      </Card>
      <FlatList
        data={customers}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Card className="mb-2" mode="contained" onPress={() => router.push(`/loans/create?customerId=${item.id}`)}>
            <Card.Content>
              <Text className="text-white font-bold">{item.full_name}</Text>
              <Text className="text-slate-400 text-xs">{item.phone_number}</Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
            }
