import { View, Text, TextInput, Button } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Card } from 'react-native-paper';
import { getDB, generateLoanId } from '@/src/db/database';
import { calculateNewLoan } from '@/src/logic/loanEngine';

export default function CreateLoanScreen() {
  const { customerId } = useLocalSearchParams();
  const [amount, setAmount] = useState('');
  const [dueDays, setDueDays] = useState('30');

  const createLoan = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const db = await getDB();
    const loanId = await generateLoanId(db);
    const { original_cow, current_cow, current_calf, total_due } = calculateNewLoan(amt);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(dueDays));

    await db.runAsync(
      `INSERT INTO loans (id, customer_id, loan_date, original_cow, current_cow, current_calf, total_due, due_date) 
       VALUES (?,?,date('now'),?,?,?,?,?)`,
      [loanId, customerId, original_cow, current_calf, total_due, dueDate.toISOString().split('T')[0]]
    );
    await db.runAsync(
      `INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES ('CREATE','loan',?,?)`,
      [loanId, `Loan issued: R${original_cow} + R${current_calf} calf`]
    );
    router.replace('/dashboard');
  };

  const preview = amount ? calculateNewLoan(parseFloat(amount)) : null;

  return (
    <View className="flex-1 bg-slate-900 p-4">
      <Text className="text-white text-2xl font-bold mb-4">New Loan</Text>
      <Card mode="contained">
        <Card.Content>
          <TextInput
            className="bg-slate-800 text-white p-3 rounded mb-2"
            placeholder="Loan Amount (Cow)"
            placeholderTextColor="#64748b"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          <TextInput
            className="bg-slate-800 text-white p-3 rounded mb-3"
            placeholder="Days Until Due"
            placeholderTextColor="#64748b"
            value={dueDays}
            onChangeText={setDueDays}
            keyboardType="numeric"
          />
          {preview && (
            <View className="bg-slate-800 p-3 rounded mb-3">
              <Text className="text-slate-300 text-xs">Cow: R{preview.original_cow.toFixed(2)}</Text>
              <Text className="text-slate-300 text-xs">Calf: R{preview.current_calf.toFixed(2)}</Text>
              <Text className="text-white font-bold">Total Due: R{preview.total_due.toFixed(2)}</Text>
            </View>
          )}
          <Button title="Issue Loan" onPress={createLoan} />
        </Card.Content>
      </Card>
    </View>
  );
}
