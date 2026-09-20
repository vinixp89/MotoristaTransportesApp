import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTema } from '../context/ThemeContext'
import LogoIcon from '../components/LogoIcon'
import type { Cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'SobreApp'>

export default function SobreAppScreen({ navigation }: Props) {
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <View style={styles.topo}>
        <LogoIcon size={64} style={styles.logo} />
        <Text style={styles.nome}>Vai na Boa Motorista</Text>
        <Text style={styles.versao}>Versão 1.0.0</Text>
      </View>

      <Text style={styles.descricao}>
        O app do motorista parceiro Vai na Boa — receba corridas, acompanhe seus ganhos e gerencie
        sua conta em um só lugar.
      </Text>

      <View style={styles.lista}>
        <Pressable onPress={() => navigation.navigate('PoliticaPrivacidade')} style={styles.linha}>
          <Text style={styles.linhaTexto}>Política de privacidade</Text>
          <Text style={styles.linhaSeta}>›</Text>
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL('mailto:contato@vainaboamobilidade.com.br')}
          style={[styles.linha, { borderBottomWidth: 0 }]}
        >
          <Text style={styles.linhaTexto}>Falar com o suporte</Text>
          <Text style={styles.linhaSeta}>›</Text>
        </Pressable>
      </View>

      <Text style={styles.rodape}>© {new Date().getFullYear()} Vai na Boa Mobilidade</Text>
    </ScrollView>
  )
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor: cores.fundo,
    },
    conteudo: {
      padding: 20,
      paddingTop: 32,
      alignItems: 'center',
      gap: 20,
    },
    topo: {
      alignItems: 'center',
      gap: 4,
    },
    logo: {
      marginBottom: 8,
    },
    nome: {
      fontSize: 20,
      fontWeight: '700',
      color: cores.texto,
    },
    versao: {
      fontSize: 13,
      color: cores.textoSecundario,
    },
    descricao: {
      fontSize: 14,
      color: cores.texto,
      textAlign: 'center',
      lineHeight: 20,
    },
    lista: {
      width: '100%',
      backgroundColor: cores.cartao,
      borderRadius: 14,
      overflow: 'hidden',
    },
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: cores.borda,
    },
    linhaTexto: {
      fontSize: 14,
      color: cores.texto,
      fontWeight: '500',
    },
    linhaSeta: {
      fontSize: 18,
      color: cores.textoSecundario,
    },
    rodape: {
      fontSize: 11,
      color: cores.textoSecundario,
      marginTop: 12,
    },
  })
}
