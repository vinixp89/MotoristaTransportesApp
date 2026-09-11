import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'

type Notificacao = {
  id: string
  titulo: string
  mensagem: string
  lida: boolean
  dataCriacao: string
}

function formatarData(iso: string) {
  const data = new Date(iso)
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Caixa de entrada — histórico persistido de avisos do app, ver NotificacoesMotoristaController no
// backend. Abre pelo menu hambúrguer da Home.
export default function NotificacoesScreen() {
  const { cores } = useTema()
  const styles = criarEstilos(cores)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  function carregar() {
    return api
      .get<Notificacao[]>('/NotificacoesMotorista')
      .then(({ data }) => setNotificacoes(data))
      .catch((error) => setErro(extrairMensagemErro(error)))
  }

  useFocusEffect(
    useCallback(() => {
      carregar().finally(() => setCarregando(false))
    }, [])
  )

  async function handleAbrir(notificacao: Notificacao) {
    if (notificacao.lida) return

    setNotificacoes((atual) => atual.map((n) => (n.id === notificacao.id ? { ...n, lida: true } : n)))

    try {
      await api.post(`/NotificacoesMotorista/${notificacao.id}/marcar-lida`)
    } catch {
      // Falha isolada não é grave — só volta a aparecer como não lida na próxima recarga.
    }
  }

  async function handleMarcarTodas() {
    setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })))

    try {
      await api.post('/NotificacoesMotorista/marcar-todas-lidas')
    } catch {
      // Idem — próxima recarga corrige se falhar.
    }
  }

  const temNaoLida = notificacoes.some((n) => !n.lida)

  if (carregando) {
    return (
      <View style={[styles.tela, styles.centralizado]}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    )
  }

  return (
    <View style={styles.tela}>
      {erro ? (
        <View style={styles.erroCaixa}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      ) : null}

      {temNaoLida && (
        <Pressable onPress={handleMarcarTodas} style={styles.marcarTodas}>
          <Text style={styles.marcarTodasTexto}>Marcar todas como lidas</Text>
        </Pressable>
      )}

      <FlatList
        data={notificacoes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Text style={styles.vazioTexto}>Você ainda não tem nenhuma notificação.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handleAbrir(item)} style={[styles.item, !item.lida && styles.itemNaoLido]}>
            {!item.lida && <View style={styles.pontoNaoLido} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitulo}>{item.titulo}</Text>
              <Text style={styles.itemMensagem}>{item.mensagem}</Text>
              <Text style={styles.itemData}>{formatarData(item.dataCriacao)}</Text>
            </View>
          </Pressable>
        )}
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
    centralizado: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    erroCaixa: {
      backgroundColor: cores.erroFundo,
      margin: 16,
      marginBottom: 0,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    erroTexto: {
      color: cores.erroTexto,
      fontSize: 13,
    },
    marcarTodas: {
      alignSelf: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    marcarTodasTexto: {
      fontSize: 12,
      fontWeight: '600',
      color: cores.primaria,
    },
    lista: {
      padding: 16,
      gap: 10,
      flexGrow: 1,
    },
    vazio: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
    },
    vazioTexto: {
      fontSize: 13,
      color: cores.textoSecundario,
    },
    item: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: cores.cartao,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: cores.borda,
    },
    itemNaoLido: {
      borderColor: cores.primaria,
    },
    pontoNaoLido: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: cores.primaria,
      marginTop: 5,
    },
    itemTitulo: {
      fontSize: 14,
      fontWeight: '700',
      color: cores.texto,
      marginBottom: 2,
    },
    itemMensagem: {
      fontSize: 13,
      color: cores.textoSecundario,
      marginBottom: 6,
    },
    itemData: {
      fontSize: 11,
      color: cores.textoSecundario,
      opacity: 0.7,
    },
  })
}
