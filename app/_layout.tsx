import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useEffect } from 'react';
import { initDatabase, getDB } from '@/src/db/database';
import { checkOverdueStatus } from '@/src/logic/loanEngine';

export default function RootLayout() {
  useEffect(() => {
    const init = async () => {
      await initDatabase();
      await updateOverdueStatus();
    };
    init();
  }, []);

  const updateOverdueStatus = async () => {
    const db = await getDB();
    const activeLoans = await db.getAllAsync<any>(`SELECT * FROM loans WHERE status IN ('Active','Overdue')`);
    for (const loan of activeLoans) {
      const update = checkOverdueStatus(loan);
      if (update) {
        await db.runAsync(`UPDATE loans SET status=? WHERE id=?`, [update.status, loan.id]);
        await db.runAsync(
          `INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES ('AUTO_FLAG_OVERDUE','loan',?,?)`,
          [loan.id, `Loan passed grace period. Status set to Overdue.`]
        );
      }
    }
  };

  return (
    <PaperProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="dashboard" />
      </Stack>
    </PaperProvider>
  );
}
