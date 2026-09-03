import { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from './src/context/AuthContext'
import { ThemeProvider, useTema } from './src/context/ThemeContext'
import RootNavigator from './src/navigation/RootNavigator'
import { configurarNotificacoes } from './src/notifications/config'

function AppConteudo() {
  const { tema } = useTema()

  useEffect(() => {
    configurarNotificacoes()
  }, [])

  return (
    <NavigationContainer>
      <RootNavigator />
      <StatusBar style={tema === 'dark' ? 'light' : 'dark'} />
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppConteudo />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
