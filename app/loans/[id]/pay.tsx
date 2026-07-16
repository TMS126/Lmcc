import { View, Text, TextInput, Button } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Card } from 'react-native-paper';
import { getDB, generateReceiptNumber } from '@/src/db/database';
import { applyPaymentToLoan } from '@/src/logic/loanEngine';

export default function PayLoanScreen() {
  const { id } = useLocalSearchParams();
  const [loan, setLoan] = useState<any>(null);
  const [amount, setAmount] = useState('');

  const loadLoan = async () => {
    const db = await getDB();
    const data = await db.getFirstAsync(`SELECT * FROM loans WHERE id=?`, [id]);
    setLoan(data);
  };

  const makePayment = async () => {
    const payAmt = parseFloat(amount);
    if (!payAmt || payAmt <= 0) return;
    const db = await getDB();
    const result = applyPaymentToLoan(loan, payAmt);
    const receipt = generateReceiptNumber();

    await db.runAsync(
      `UPDATE loans SET current_cow=?, current_calf=?, total_due=?, status=?, total_paid=total_paid+? WHERE id=?`,
      [result.remaining_cow, result.new_calf, result.new_total_due, result.new_status, payAmt, id]
    );
    await db.runAsync(
      `INSERT INTO payments (loan_id, amount, interest_paid, principal_paid, penalty_fee, remaining_cow, new_calf, new_total_due, receipt_number)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, payAmt, result.interest_paid, result.principal_paid, result.penalty_fee, result.remaining_cow, result.new_calf, result.new_total_due, receipt]
    );
    await db.runAsync(
      `INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES ('PAYMENT','loan',?,?)`,
      [id, `Payment R${payAmt}. Receipt ${receipt}`]
    );
    router.back();
  };

  useEffect(() => { loadLoan(); }, []);
  if (!loan) return <View className="flex-1 bg-slate-900" />;

  return (
    <View className="flex-1 bg-slate-900 p-4">
      <Text className="text-white text-2xl font-bold mb-4">Payment</Text>
      <Card className="mb-4" mode="contained">
        <Card.Content>
          <Text className="text-slate-400 text-xs">Loan {loan.id}</Text>
          <Text className="text-white">Cow Owed: R{loan.current_cow.toFixed(2)}</Text>
          <Text className="text-white">Calf Owed: R{loan.current_calf.toFixed(2)}</Text>
          <Text className="text-white font-bold">Total Due: R{loan.total_due.toFixed(2)}</Text>
          <Text className="text-slate-400 text-xs mt-2">Status: {loan.status}</Text>
        </Card.Content>
      </Card>
      <TextInput
        className="bg-slate-800 text-white p-3 rounded mb-3"
        placeholder="Payment Amount"
        placeholderTextColor="#64748b"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />
      <Button title="Submit Payment" onPress={makePayment} />
    </View>
  );
}
