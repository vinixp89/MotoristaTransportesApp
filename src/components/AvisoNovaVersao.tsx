import { useEffect, useState } from 'react'
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Application from 'expo-application'
import api from '../api/client'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'

// Pop-up "Nova versão disponível": toda vez que o app abre, pergunta pro backend qual é a última
// versão liberada na Play Store (GET /Config/app → motoristaVersaoAtual, ver ConfigController) e, se
// a instalada (versionCode do build) for menor, bloqueia o app com um aviso que só tem o botão de
// atualizar (sem "Agora não" e sem fechar no botão voltar) — a atualização é obrigatória.
export default function AvisoNovaVersao() {
  const { cores } = useTema()
  const styles = criarEstilos(cores)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    let ativo = true

    async function verificar() {
      try {
        const instalada = Number(Application.nativeBuildVersion)
        const { data } = await api.get<{ motoristaVersaoAtual?: number }>('/Config/app')
        const atual = Number(data.motoristaVersaoAtual ?? 0)

        if (ativo && Number.isFinite(instalada) && atual > 0 && instalada < atual) setVisivel(true)
      } catch {
        // Sem rede ou erro no servidor: simplesmente não avisa, nunca atrapalha o uso do app.
      }
    }

    verificar()

    return () => {
      ativo = false
    }
  }, [])

  async function handleAtualizar() {
    const pacote = Application.applicationId
    try {
      await Linking.openURL(`market://details?id=${pacote}`)
    } catch {
      await Linking.openURL(`https://play.google.com/store/apps/details?id=${pacote}`)
    }
    // Não esconde o aviso depois de abrir a loja: se o usuário voltar sem atualizar, ele continua aí.
  }

  return (
    // onRequestClose vazio: o botão voltar do Android não fecha o aviso.
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.fundo}>
        <View style={styles.caixa}>
          <Text style={styles.icone}>🚀</Text>
          <Text style={styles.titulo}>Nova versão disponível</Text>
          <Text style={styles.texto}>
            Pra continuar usando o app, atualize pra versão mais recente. Leva só um minuto.
          </Text>

          <Pressable onPress={handleAtualizar} style={({ pressed }) => [styles.botao, pressed && styles.botaoPressionado]}>
            <Text style={styles.botaoTexto}>Atualizar agora</Text>
          </Pressable>

        </View>
      </View>
    </Modal>
  )
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    fundo: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    caixa: {
      width: '100%',
      backgroundColor: cores.cartao,
      borderRadius: 18,
      padding: 24,
      alignItems: 'center',
    },
    icone: {
      fontSize: 36,
      marginBottom: 8,
    },
    titulo: {
      fontSize: 19,
      fontWeight: '700',
      color: cores.texto,
      marginBottom: 8,
      textAlign: 'center',
    },
    texto: {
      fontSize: 14,
      color: cores.textoSecundario,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
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
    botaoTexto: {
      color: cores.branco,
      fontSize: 15,
      fontWeight: '600',
    },
  })
}
