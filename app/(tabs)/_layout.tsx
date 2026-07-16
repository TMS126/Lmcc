import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false, 
      tabBarStyle: { backgroundColor: '#0D1B2A' },
      tabBarActiveTintColor: '#3b82f6',
      tabBarInactiveTintColor: '#64748b'
    }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="view-dashboard" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="loans/index"
        options={{
          title: 'Loans',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="cash-multiple" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers/index"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-group" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
