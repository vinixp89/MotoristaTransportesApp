import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import ThemeToggleButton from '../components/ThemeToggleButton'
import LoginScreen from '../screens/LoginScreen'
import CadastroScreen from '../screens/CadastroScreen'
import HomeScreen from '../screens/HomeScreen'
import ExtratoScreen from '../screens/ExtratoScreen'
import NavegacaoScreen from '../screens/NavegacaoScreen'
import PlanoExecutivoScreen from '../screens/PlanoExecutivoScreen'
import CarteiraScreen from '../screens/CarteiraScreen'
import SolicitarSaqueScreen from '../screens/SolicitarSaqueScreen'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  const { usuario, verificandoSessao } = useAuth()
  const { cores } = useTema()

  if (verificandoSessao) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.primaria} size="large" />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: cores.primaria,
        headerStyle: { backgroundColor: cores.cartao },
        headerTitleStyle: { color: cores.texto },
        contentStyle: { backgroundColor: cores.fundo },
        headerRight: () => <ThemeToggleButton />,
      }}
    >
      {usuario ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Extrato" component={ExtratoScreen} options={{ title: 'Extrato de corridas' }} />
          <Stack.Screen name="Navegacao" component={NavegacaoScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PlanoExecutivo" component={PlanoExecutivoScreen} options={{ title: 'Categoria Executivo' }} />
          <Stack.Screen name="Carteira" component={CarteiraScreen} options={{ title: 'Saldo e saques' }} />
          <Stack.Screen name="SolicitarSaque" component={SolicitarSaqueScreen} options={{ title: 'Solicitar saque' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Cadastro" component={CadastroScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  )
}
