import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'

// Espelha TipoUsuario do backend — mesma convenção do remetenteTipo do chat.
export const TIPO_USUARIO = { CLIENTE: 0, MOTORISTA: 1 } as const

type Props = {
  corridaId: string
  autorTipoAtual: number
  titulo: string
}

// Avaliação de 1 a 5 estrelas + comentário opcional depois de uma corrida finalizada — confere
// sozinho se esse lado já avaliou essa corrida antes de mostrar o formulário (ver GET
// {id}/avaliacoes no backend). Mesma tela do app Cliente.
export default function AvaliacaoForm({ corridaId, autorTipoAtual, titulo }: Props) {
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  const [carregando, setCarregando] = useState(true)
  const [jaAvaliada, setJaAvaliada] = useState(false)
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let cancelado = false

    api
      .get<{ autorTipo: number }[]>(`/Corridas/${corridaId}/avaliacoes`)
      .then(({ data }) => {
        if (cancelado) return
        setJaAvaliada(data.some((a) => a.autorTipo === autorTipoAtual))
      })
      .catch(() => {})
      .finally(() => !cancelado && setCarregando(false))

    return () => {
      cancelado = true
    }
  }, [corridaId, autorTipoAtual])

  async function handleEnviar() {
    if (nota === 0) {
      setErro('Escolha de 1 a 5 estrelas.')
      return
    }

    setEnviando(true)
    setErro('')

    try {
      await api.post(`/Corridas/${corridaId}/avaliar`, { nota, comentario: comentario.trim() || null })
      setJaAvaliada(true)
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return null

  if (jaAvaliada) {
    return (
      <View style={styles.agradecimento}>
        <Text style={styles.agradecimentoTexto}>Obrigado pela avaliação! ⭐</Text>
      </View>
    )
  }

  return (
    <View style={styles.caixa}>
      <Text style={styles.titulo}>{titulo}</Text>

      <View style={styles.estrelas}>
        {[1, 2, 3, 4, 5].map((valor) => (
          <Pressable key={valor} onPress={() => setNota(valor)} hitSlop={6}>
            <Text style={[styles.estrela, valor <= nota && { color: cores.primaria }]}>★</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={comentario}
        onChangeText={setComentario}
        placeholder="Comentário (opcional)"
        placeholderTextColor="#9ca3af"
        multiline
        maxLength={500}
        style={styles.input}
      />

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <Pressable
        onPress={handleEnviar}
        disabled={enviando}
        style={({ pressed }) => [styles.botao, enviando && styles.botaoDesabilitado, pressed && styles.botaoPressionado]}
      >
        {enviando ? <ActivityIndicator color={cores.branco} /> : <Text style={styles.botaoTexto}>Enviar avaliação</Text>}
      </Pressable>
    </View>
  )
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    caixa: {
      borderWidth: 1,
      borderColor: cores.borda,
      borderRadius: 14,
      padding: 14,
      backgroundColor: cores.cartao,
    },
    titulo: {
      fontSize: 13,
      fontWeight: '600',
      color: cores.texto,
    },
    estrelas: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 10,
    },
    estrela: {
      fontSize: 30,
      color: cores.borda,
      lineHeight: 34,
    },
    input: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: cores.borda,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      minHeight: 56,
      color: cores.texto,
      backgroundColor: cores.fundo,
      textAlignVertical: 'top',
    },
    erro: {
      marginTop: 8,
      fontSize: 12,
      color: cores.erroTexto,
    },
    botao: {
      marginTop: 12,
      backgroundColor: cores.primaria,
      borderRadius: 10,
      paddingVertical: 11,
      alignItems: 'center',
    },
    botaoPressionado: {
      opacity: 0.85,
    },
    botaoDesabilitado: {
      opacity: 0.6,
    },
    botaoTexto: {
      color: cores.branco,
      fontSize: 14,
      fontWeight: '600',
    },
    agradecimento: {
      backgroundColor: cores.cartao,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    agradecimentoTexto: {
      fontSize: 13,
      color: cores.textoSecundario,
    },
  })
}
