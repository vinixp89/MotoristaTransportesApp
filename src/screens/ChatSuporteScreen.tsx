import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import api, { extrairMensagemErro } from '../api/client'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'

type Mensagem = {
  id: string
  usuarioId: string
  tipoUsuario: number
  enviadaPeloAdmin: boolean
  texto: string
  dataEnvio: string
}

const INTERVALO_MS = 3000
const LIMITE_CARACTERES = 500

// Chat com o suporte (Admin), fora do contexto de uma corrida — mesmo padrão de polling do
// ChatCorridaScreen, só que "minha mensagem" é qualquer uma que não veio do Admin. O campo de texto
// fica NO TOPO (e grande) de propósito: embaixo ele ficava coberto pela barra de navegação do Android
// (o app desenha edge-to-edge) e pelo teclado, e o usuário não conseguia digitar.
export default function ChatSuporteScreen() {
  const { cores } = useTema()
  const styles = criarEstilos(cores)
  const insets = useSafeAreaInsets()

  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const ultimaDataRef = useRef<string | null>(null)
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const listaRef = useRef<FlatList<Mensagem>>(null)

  const buscar = useCallback(async () => {
    try {
      const { data } = await api.get<Mensagem[]>('/suporte/mensagens', {
        params: ultimaDataRef.current ? { desde: ultimaDataRef.current } : undefined,
      })

      if (data.length > 0) {
        setMensagens((atual) => [...atual, ...data])
        ultimaDataRef.current = data[data.length - 1].dataEnvio
        setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 100)
      }
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setCarregando(false)
    }
  }, [])

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
      const { data } = await api.post<Mensagem>('/suporte/mensagens', { texto: textoLimpo })
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

  const botaoDesabilitado = enviando || !texto.trim()

  return (
    <View style={styles.tela}>
      <View style={styles.caixaEnvio}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escreva sua mensagem pro suporte"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          multiline
          maxLength={LIMITE_CARACTERES}
          textAlignVertical="top"
        />

        <View style={styles.rodapeEnvio}>
          <Text style={styles.contador}>
            {texto.length}/{LIMITE_CARACTERES}
          </Text>
          <Pressable
            onPress={handleEnviar}
            disabled={botaoDesabilitado}
            style={({ pressed }) => [
              styles.botaoEnviar,
              botaoDesabilitado && styles.botaoEnviarDesabilitado,
              pressed && styles.botaoPressionado,
            ]}
          >
            {enviando ? <ActivityIndicator color={cores.branco} /> : <Text style={styles.botaoEnviarTexto}>Enviar</Text>}
          </Pressable>
        </View>

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      </View>

      <FlatList
        ref={listaRef}
        data={mensagens}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 16 }]}
        renderItem={({ item }) => {
          const minha = !item.enviadaPeloAdmin
          return (
            <View style={[styles.bolha, minha ? styles.bolhaMinha : styles.bolhaOutro]}>
              {!minha && <Text style={styles.remetente}>Suporte</Text>}
              <Text style={[styles.bolhaTexto, minha && styles.bolhaTextoMinha]}>{item.texto}</Text>
              <Text style={[styles.bolhaHora, minha && styles.bolhaHoraMinha]}>
                {new Date(item.dataEnvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )
        }}
        ListEmptyComponent={
          !carregando ? (
            <Text style={styles.vazio}>
              Conte aqui o que está acontecendo — alguém do nosso time vai te responder por aqui mesmo.
            </Text>
          ) : null
        }
      />
    </View>
  )
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor: cores.fundo,
    },
    caixaEnvio: {
      padding: 16,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: cores.borda,
      backgroundColor: cores.fundo,
    },
    input: {
      minHeight: 130,
      maxHeight: 220,
      borderWidth: 1,
      borderColor: cores.borda,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: cores.texto,
      backgroundColor: cores.cartao,
    },
    rodapeEnvio: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    contador: {
      fontSize: 12,
      color: cores.textoSecundario,
    },
    botaoEnviar: {
      minWidth: 120,
      backgroundColor: cores.primaria,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    botaoEnviarDesabilitado: {
      opacity: 0.5,
    },
    botaoPressionado: {
      opacity: 0.8,
    },
    botaoEnviarTexto: {
      color: cores.branco,
      fontSize: 15,
      fontWeight: '700',
    },
    erro: {
      fontSize: 12,
      color: cores.erroTexto,
    },
    lista: {
      padding: 16,
      gap: 8,
      flexGrow: 1,
    },
    vazio: {
      marginTop: 24,
      marginHorizontal: 16,
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
    remetente: {
      fontSize: 11,
      fontWeight: '700',
      color: cores.primaria,
      marginBottom: 2,
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
  })
}
