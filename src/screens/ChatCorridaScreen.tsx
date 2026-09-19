import { useCallback, useEffect, useRef, useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'ChatCorrida'>

type Mensagem = {
  id: string
  corridaId: string
  remetenteTipo: number // 0 Cliente, 1 Motorista (TipoUsuario do backend)
  texto: string
  dataEnvio: string
}

const REMETENTE_MOTORISTA = 1
const INTERVALO_MS = 3000

// Chat entre motorista e cliente enquanto a corrida está confirmada/em andamento — mesmo endpoint
// (POST/GET /Corridas/{id}/mensagens) e mesma tela do app Cliente, só invertendo qual lado é "minha
// mensagem".
export default function ChatCorridaScreen({ route }: Props) {
  const { corridaId } = route.params
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const ultimaDataRef = useRef<string | null>(null)
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const listaRef = useRef<FlatList<Mensagem>>(null)

  const buscar = useCallback(async () => {
    try {
      const { data } = await api.get<Mensagem[]>(`/Corridas/${corridaId}/mensagens`, {
        params: ultimaDataRef.current ? { desde: ultimaDataRef.current } : undefined,
      })

      if (data.length > 0) {
        setMensagens((atual) => [...atual, ...data])
        ultimaDataRef.current = data[data.length - 1].dataEnvio
        setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 100)
      }
    } catch (error) {
      setErro(extrairMensagemErro(error))
    }
  }, [corridaId])

  useEffect(() => {
    buscar()
    intervaloRef.current = setInterval(buscar, INTERVALO_MS)

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current)
    }
  }, [buscar])

  async function handleEnviar() {
    const textoLimpo = texto.trim()
    if (!textoLimpo) return

    setEnviando(true)
    setErro('')

    try {
      const { data } = await api.post<Mensagem>(`/Corridas/${corridaId}/mensagens`, { texto: textoLimpo })
      setMensagens((atual) => [...atual, data])
      ultimaDataRef.current = data.dataEnvio
      setTexto('')
      setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 100)
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listaRef}
        data={mensagens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => {
          const minha = item.remetenteTipo === REMETENTE_MOTORISTA
          return (
            <View style={[styles.bolha, minha ? styles.bolhaMinha : styles.bolhaOutro]}>
              <Text style={[styles.bolhaTexto, minha && styles.bolhaTextoMinha]}>{item.texto}</Text>
              <Text style={[styles.bolhaHora, minha && styles.bolhaHoraMinha]}>
                {new Date(item.dataEnvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )
        }}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhuma mensagem ainda — diga oi pro cliente.</Text>}
      />

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <View style={styles.linhaEnvio}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escreva uma mensagem"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={handleEnviar}
          disabled={enviando || !texto.trim()}
          style={({ pressed }) => [
            styles.botaoEnviar,
            (enviando || !texto.trim()) && styles.botaoEnviarDesabilitado,
            pressed && styles.botaoPressionado,
          ]}
        >
          <Text style={styles.botaoEnviarTexto}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor: cores.fundo,
    },
    lista: {
      padding: 16,
      gap: 8,
      flexGrow: 1,
    },
    vazio: {
      marginTop: 40,
      textAlign: 'center',
      fontSize: 13,
      color: cores.textoSecundario,
    },
    bolha: {
      maxWidth: '78%',
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 6,
    },
    bolhaMinha: {
      alignSelf: 'flex-end',
      backgroundColor: cores.primaria,
      borderBottomRightRadius: 4,
    },
    bolhaOutro: {
      alignSelf: 'flex-start',
      backgroundColor: cores.cartao,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: cores.borda,
    },
    bolhaTexto: {
      fontSize: 14,
      color: cores.texto,
    },
    bolhaTextoMinha: {
      color: cores.branco,
    },
    bolhaHora: {
      marginTop: 2,
      fontSize: 10,
      color: cores.textoSecundario,
      alignSelf: 'flex-end',
    },
    bolhaHoraMinha: {
      color: 'rgba(255,255,255,0.75)',
    },
    erro: {
      marginHorizontal: 16,
      marginBottom: 8,
      fontSize: 12,
      color: cores.erroTexto,
    },
    linhaEnvio: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: cores.borda,
      backgroundColor: cores.fundo,
    },
    input: {
      flex: 1,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: cores.borda,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: cores.texto,
      backgroundColor: cores.cartao,
    },
    botaoEnviar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: cores.primaria,
      alignItems: 'center',
      justifyContent: 'center',
    },
    botaoEnviarDesabilitado: {
      opacity: 0.5,
    },
    botaoPressionado: {
      opacity: 0.8,
    },
    botaoEnviarTexto: {
      color: cores.branco,
      fontSize: 16,
      fontWeight: '700',
    },
  })
}
