import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import ThemeToggleButton from '../components/ThemeToggleButton'
import LoginScreen from '../screens/LoginScreen'
import CadastroScreen from '../screens/CadastroScreen'
import ConfirmarSmsScreen from '../screens/ConfirmarSmsScreen'
import HomeScreen from '../screens/HomeScreen'
import ExtratoScreen from '../screens/ExtratoScreen'
import NavegacaoScreen from '../screens/NavegacaoScreen'
import ChatCorridaScreen from '../screens/ChatCorridaScreen'
import PlanoExecutivoScreen from '../screens/PlanoExecutivoScreen'
import CarteiraScreen from '../screens/CarteiraScreen'
import SolicitarSaqueScreen from '../screens/SolicitarSaqueScreen'
import PoliticaPrivacidadeScreen from '../screens/PoliticaPrivacidadeScreen'
import NotificacoesScreen from '../screens/NotificacoesScreen'
import SobreAppScreen from '../screens/SobreAppScreen'
import ConfiguracoesContaScreen from '../screens/ConfiguracoesContaScreen'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  const { usuario, verificandoSessao, perfil, carregandoPerfil } = useAuth()
  const { cores } = useTema()

  // carregandoPerfil evita mostrar a Home destravada por um instante antes de saber se o telefone
  // já foi confirmado (ver AuthContext) — mesmo spinner de verificandoSessao.
  if (verificandoSessao || (usuario && carregandoPerfil)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.primaria} size="large" />
      </View>
    )
  }

  // perfil null (ex: falha de rede ao buscar) não trava o app — só bloqueia quando sabemos de
  // verdade que o telefone ainda não foi confirmado.
  const precisaConfirmarSms = Boolean(usuario) && perfil !== null && !perfil.telefoneVerificado

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
      {precisaConfirmarSms ? (
        <Stack.Screen name="ConfirmarSms" component={ConfirmarSmsScreen} options={{ headerShown: false }} />
      ) : usuario ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Extrato" component={ExtratoScreen} options={{ title: 'Extrato de corridas' }} />
          <Stack.Screen name="Navegacao" component={NavegacaoScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChatCorrida" component={ChatCorridaScreen} options={{ title: 'Chat com o cliente' }} />
          <Stack.Screen name="PlanoExecutivo" component={PlanoExecutivoScreen} options={{ title: 'Categoria Executivo' }} />
          <Stack.Screen name="Carteira" component={CarteiraScreen} options={{ title: 'Saldo e saques' }} />
          <Stack.Screen name="SolicitarSaque" component={SolicitarSaqueScreen} options={{ title: 'Solicitar saque' }} />
          <Stack.Screen name="PoliticaPrivacidade" component={PoliticaPrivacidadeScreen} options={{ title: 'Política de privacidade' }} />
          <Stack.Screen name="Notificacoes" component={NotificacoesScreen} options={{ title: 'Notificações' }} />
          <Stack.Screen name="SobreApp" component={SobreAppScreen} options={{ title: 'Sobre o app' }} />
          <Stack.Screen name="ConfiguracoesConta" component={ConfiguracoesContaScreen} options={{ title: 'Configurações da conta' }} />
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
