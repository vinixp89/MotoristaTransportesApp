import { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Props) {
  const { carregando, login } = useAuth()
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  async function handleEntrar() {
    setErro('')

    const resultado = await login(email, senha)

    if (!resultado.sucesso) {
      setErro(resultado.mensagem ?? 'Não foi possível entrar.')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.tela}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.titulo}>Vai na Boa Motorista</Text>
        <Text style={styles.subtitulo}>Entre com sua conta para continuar</Text>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>E-mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Senha</Text>
          <TextInput
            value={senha}
            onChangeText={setSenha}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            style={styles.input}
          />
        </View>

        {erro ? (
          <View style={styles.erroCaixa}>
            <Text style={styles.erroTexto}>{erro}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleEntrar}
          disabled={carregando || !email || !senha}
          style={({ pressed }) => [
            styles.botao,
            (carregando || !email || !senha) && styles.botaoDesabilitado,
            pressed && styles.botaoPressionado,
          ]}
        >
          {carregando ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <Text style={styles.botaoTexto}>Entrar</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Cadastro')} hitSlop={8} style={styles.linkCadastro}>
          <Text style={styles.linkTexto}>Não tem conta? <Text style={styles.linkTextoDestaque}>Criar conta</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: cores.texto,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    color: cores.textoSecundario,
    marginBottom: 28,
    textAlign: 'center',
  },
  campo: {
    width: '100%',
    marginBottom: 16,
  },
  rotulo: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.texto,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: cores.texto,
    backgroundColor: cores.cartao,
  },
  erroCaixa: {
    width: '100%',
    backgroundColor: cores.erroFundo,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  erroTexto: {
    color: cores.erroTexto,
    fontSize: 13,
  },
  botao: {
    width: '100%',
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoPressionado: {
    backgroundColor: cores.primariaEscura,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: cores.branco,
    fontSize: 15,
    fontWeight: '600',
  },
  linkCadastro: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkTexto: {
    fontSize: 13,
    color: cores.textoSecundario,
  },
  linkTextoDestaque: {
    fontWeight: '700',
    color: cores.primaria,
  },
  })
}
