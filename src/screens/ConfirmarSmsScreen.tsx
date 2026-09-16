import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'

const SEGUNDOS_PARA_REENVIAR = 30

// Tela travada — sem opção de "voltar" nem tela anterior no stack: enquanto perfil.telefoneVerificado
// for false, o RootNavigator sempre mostra só essa tela (ver RootNavigator.tsx), nunca a Home. Manda
// o código automaticamente ao abrir; "Sair" é a única saída, pra quem digitou o telefone errado no
// cadastro poder recomeçar de outra conta. Mesma tela do app Cliente, adaptada.
export default function ConfirmarSmsScreen() {
  const { recarregarPerfil, logout } = useAuth()
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [segundosParaReenviar, setSegundosParaReenviar] = useState(0)

  async function handleEnviarCodigo() {
    setEnviando(true)
    setErro('')

    try {
      await api.post('/Auth/enviar-codigo-sms')
      setMensagem('Código enviado por SMS pro telefone que você cadastrou.')
      setSegundosParaReenviar(SEGUNDOS_PARA_REENVIAR)
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setEnviando(false)
    }
  }

  useEffect(() => {
    handleEnviarCodigo()
  }, [])

  useEffect(() => {
    if (segundosParaReenviar <= 0) return
    const id = setTimeout(() => setSegundosParaReenviar((atual) => atual - 1), 1000)
    return () => clearTimeout(id)
  }, [segundosParaReenviar])

  async function handleConfirmar() {
    setErro('')
    setConfirmando(true)

    try {
      await api.post('/Auth/confirmar-sms', { codigo })
      await recarregarPerfil()
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={styles.icone}>📱</Text>
        <Text style={styles.titulo}>Confirme seu telefone</Text>
        <Text style={styles.subtitulo}>
          Enviamos um código de 6 dígitos por SMS pro telefone que você cadastrou. Digite ele abaixo pra
          liberar o app.
        </Text>

        {mensagem ? <Text style={styles.mensagemTexto}>{mensagem}</Text> : null}

        <View style={styles.campo}>
          <TextInput
            value={codigo}
            onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.inputCodigo}
          />
        </View>

        {erro ? (
          <View style={styles.erroCaixa}>
            <Text style={styles.erroTexto}>{erro}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleConfirmar}
          disabled={confirmando || codigo.length !== 6}
          style={({ pressed }) => [
            styles.botao,
            (confirmando || codigo.length !== 6) && styles.botaoDesabilitado,
            pressed && styles.botaoPressionado,
          ]}
        >
          {confirmando ? <ActivityIndicator color={cores.branco} /> : <Text style={styles.botaoTexto}>Confirmar</Text>}
        </Pressable>

        <Pressable
          onPress={handleEnviarCodigo}
          disabled={enviando || segundosParaReenviar > 0}
          hitSlop={8}
          style={styles.linkReenviar}
        >
          <Text style={[styles.linkReenviarTexto, (enviando || segundosParaReenviar > 0) && styles.linkDesabilitado]}>
            {segundosParaReenviar > 0 ? `Reenviar código (${segundosParaReenviar}s)` : 'Reenviar código'}
          </Text>
        </Pressable>

        <Pressable onPress={() => logout()} hitSlop={8} style={styles.linkSair}>
          <Text style={styles.linkSairTexto}>Sair</Text>
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
      paddingVertical: 40,
    },
    icone: {
      fontSize: 40,
      marginBottom: 12,
    },
    titulo: {
      fontSize: 20,
      fontWeight: '700',
      color: cores.texto,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitulo: {
      fontSize: 13,
      color: cores.textoSecundario,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
    },
    mensagemTexto: {
      fontSize: 12,
      color: cores.primaria,
      textAlign: 'center',
      marginBottom: 16,
    },
    campo: {
      width: '100%',
      marginBottom: 20,
    },
    inputCodigo: {
      borderWidth: 1,
      borderColor: cores.borda,
      borderRadius: 10,
      paddingVertical: 14,
      fontSize: 24,
      letterSpacing: 10,
      textAlign: 'center',
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
      textAlign: 'center',
    },
    botao: {
      width: '100%',
      backgroundColor: cores.primaria,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
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
    linkReenviar: {
      marginTop: 18,
    },
    linkReenviarTexto: {
      fontSize: 13,
      fontWeight: '600',
      color: cores.primaria,
    },
    linkDesabilitado: {
      opacity: 0.5,
    },
    linkSair: {
      marginTop: 28,
    },
    linkSairTexto: {
      fontSize: 13,
      color: cores.textoSecundario,
    },
  })
}
