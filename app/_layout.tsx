import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { PaperProvider, MD3LightTheme } from 'react-native-paper'
import { View, ActivityIndicator } from 'react-native'
import { getDB } from '@/src/db/database'

const theme = { ...MD3LightTheme, colors: { ...MD3LightTheme.colors, primary: '#0D1B2A' } }

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => { getDB().then(() => setReady(true)).catch(console.error) }, [])

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0D1B2A" />
      </View>
    )
  }

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  )
}
