import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import api from '../api/client'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'

type Navigation = NativeStackNavigationProp<RootStackParamList, keyof RootStackParamList>

type ItemMenu = {
  rotulo: string
  destino: keyof RootStackParamList
  badge?: number
}

// Botão de três barrinhas na Home que abre um menu — notificações (com badge de não lidas), sobre
// o app e configurações da conta. Fica junto do ThemeToggleButton no cabeçalho (mesmo padrão do
// app Cliente, ver MenuHamburguer.tsx do MobileTransportesApp).
export default function MenuHamburguer({ navigation }: { navigation: Navigation }) {
  const { cores } = useTema()
  const styles = criarEstilos(cores)
  const [aberto, setAberto] = useState(false)
  const [naoLidas, setNaoLidas] = useState(0)

  useEffect(() => {
    api
      .get('/NotificacoesMotorista/nao-lidas/contagem')
      .then(({ data }) => setNaoLidas(data.naoLidas))
      .catch(() => {})
  }, [])

  function irPara(tela: keyof RootStackParamList) {
    setAberto(false)
    navigation.navigate(tela as never)
  }

  const itens: ItemMenu[] = [
    { rotulo: '🔔 Notificação', destino: 'Notificacoes', badge: naoLidas },
    { rotulo: 'ℹ️ Sobre', destino: 'SobreApp' },
    { rotulo: '⚙️ Configurações', destino: 'ConfiguracoesConta' },
  ]

  return (
    <>
      <Pressable
        onPress={() => setAberto(true)}
        hitSlop={8}
        style={[styles.botao, { borderColor: cores.borda, backgroundColor: cores.cartao }]}
      >
        <Text style={styles.icone}>☰</Text>
        {naoLidas > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>{naoLidas > 9 ? '9+' : naoLidas}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={aberto} animationType="fade" transparent onRequestClose={() => setAberto(false)}>
        <Pressable style={styles.overlay} onPress={() => setAberto(false)}>
          <Pressable style={[styles.painel, { backgroundColor: cores.cartao }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.titulo, { color: cores.texto }]}>Menu</Text>

            {itens.map((item) => (
              <Pressable
                key={item.rotulo}
                onPress={() => irPara(item.destino)}
                style={({ pressed }) => [styles.item, pressed && { backgroundColor: cores.fundo }]}
              >
                <Text style={[styles.itemTexto, { color: cores.texto }]}>{item.rotulo}</Text>
                {!!item.badge && (
                  <View style={styles.badgeItem}>
                    <Text style={styles.badgeTexto}>{item.badge > 9 ? '9+' : item.badge}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    botao: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icone: {
      fontSize: 16,
      color: cores.texto,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeTexto: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '700',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 70,
      paddingRight: 16,
    },
    painel: {
      width: 220,
      borderRadius: 14,
      paddingVertical: 8,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    titulo: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      opacity: 0.6,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    itemTexto: {
      fontSize: 14,
      fontWeight: '500',
    },
    badgeItem: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
  })
}
