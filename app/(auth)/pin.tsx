import { View, Text, TextInput, Button } from 'react-native';
import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const PIN_KEY = 'lmcc_pin';

export default function PinScreen() {
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { checkPin(); tryBiometric(); }, []);

  const checkPin = async () => {
    const saved = await SecureStore.getItemAsync(PIN_KEY);
    if (saved) { setStoredPin(saved); setIsSetup(false); }
    else { setIsSetup(true); }
  };

  const tryBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled && !isSetup) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock LMCC',
        fallbackLabel: 'Use PIN'
      });
      if (result.success) router.replace('/dashboard');
    }
  };

  const handleSubmit = async () => {
    if (pin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    if (isSetup) {
      await SecureStore.setItemAsync(PIN_KEY, pin);
      router.replace('/dashboard');
    } else {
      if (pin === storedPin) router.replace('/dashboard');
      else { setError('Incorrect PIN'); setPin(''); }
    }
  };

  return (
    <View className="flex-1 justify-center bg-slate-900 p-6">
      <Text className="text-white text-2xl font-bold text-center mb-8">LMCC</Text>
      <Text className="text-slate-300 text-center mb-4">
        {isSetup ? 'Create your secure PIN' : 'Enter PIN to continue'}
      </Text>
      <TextInput
        className="bg-slate-800 text-white p-4 rounded-lg text-center text-2xl mb-2"
        value={pin}
        onChangeText={setPin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        placeholder="••••"
      />
      {error ? <Text className="text-red-500 text-center mb-4">{error}</Text> : null}
      <Button title={isSetup ? 'Set PIN' : 'Unlock'} onPress={handleSubmit} />
      {!isSetup && <Button title="Use Fingerprint" onPress={tryBiometric} />}
    </View>
  );
}
