import { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { useEnvioLocalizacao } from '../hooks/useEnvioLocalizacao'
import api, { extrairMensagemErro } from '../api/client'
import { cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

// StatusMotorista serializado como número (TransportesApp.Domain/Enums/Enums.cs):
// Offline = 0, Disponivel = 1, EmCorrida = 2.
const STATUS_DISPONIVEL = 1

// Espelha a HomePage do front-end web pro perfil Motorista: botão "ficar online/offline" (que
// aqui também liga o envio de localização via GPS, ver useEnvioLocalizacao) + cards de navegação
// pra Corridas e Extrato, no roxo de marca do motorista.
export default function HomeScreen({ navigation }: Props) {
  const { usuario, logout } = useAuth()
  const [online, setOnline] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const { erro: erroLocalizacao } = useEnvioLocalizacao(online)

  async function handleAlternar() {
    setCarregando(true)
    setErro('')

    try {
      const endpoint = online ? '/Motoristas/ficar-offline' : '/Motoristas/ficar-disponivel'
      const { data } = await api.patch(endpoint)
      setOnline(data.status === STATUS_DISPONIVEL)
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.saudacao}>Olá!</Text>
          <Text style={styles.perfil}>
            Perfil: {usuario?.roles.length ? usuario.roles.join(', ') : 'sem perfil definido'}
          </Text>
        </View>

        <Pressable onPress={logout} hitSlop={8}>
          <Text style={styles.sair}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.linhaCards}>
        <Pressable
          onPress={handleAlternar}
          disabled={carregando}
          style={({ pressed }) => [
            styles.quadrado,
            { backgroundColor: online ? '#6b7280' : cores.primaria },
            (pressed || carregando) && styles.quadradoPressionado,
          ]}
        >
          {carregando ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <>
              <View style={[styles.bolinha, { backgroundColor: online ? '#4ade80' : 'rgba(255,255,255,0.5)' }]} />
              <Text style={styles.quadradoTexto}>{online ? 'Ficar offline' : 'Ficar online'}</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Corridas')}
          style={({ pressed }) => [styles.quadrado, styles.quadradoClaro, pressed && styles.quadradoPressionado]}
        >
          <Text style={styles.emoji}>🚗</Text>
          <Text style={[styles.quadradoTexto, { color: cores.primaria }]}>Corridas</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Extrato')}
          style={({ pressed }) => [styles.quadrado, styles.quadradoClaro, pressed && styles.quadradoPressionado]}
        >
          <Text style={styles.emoji}>📄</Text>
          <Text style={[styles.quadradoTexto, { color: cores.primaria }]}>Extrato de corridas</Text>
        </Pressable>
      </View>

      {erro || erroLocalizacao ? (
        <View style={styles.erroCaixa}>
          <Text style={styles.erroTexto}>{erro || erroLocalizacao}</Text>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    padding: 20,
    paddingTop: 24,
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  saudacao: {
    fontSize: 22,
    fontWeight: '700',
    color: cores.texto,
  },
  perfil: {
    fontSize: 13,
    color: cores.textoSecundario,
    marginTop: 2,
  },
  sair: {
    fontSize: 14,
    color: cores.textoSecundario,
    paddingVertical: 4,
  },
  linhaCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quadrado: {
    width: 128,
    height: 128,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  quadradoClaro: {
    backgroundColor: cores.cartao,
  },
  quadradoPressionado: {
    opacity: 0.85,
  },
  bolinha: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emoji: {
    fontSize: 22,
  },
  quadradoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.branco,
    textAlign: 'center',
  },
  erroCaixa: {
    marginTop: 16,
    backgroundColor: cores.erroFundo,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  erroTexto: {
    color: cores.erroTexto,
    fontSize: 13,
  },
})
