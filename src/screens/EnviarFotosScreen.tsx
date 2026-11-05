import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import { camposFoto, escolherFoto, type FotoSlot } from '../utils/fotosVerificacao'
import { tipoVeiculoDaApi } from '../utils/veiculo'
import type { Cores } from '../theme/colors'

// Tela travada, igual à de confirmação de SMS: enquanto o perfil não tiver as 3 fotos de verificação
// (selfie, veículo e placa), o RootNavigator mostra só essa tela, nunca a Home (ver RootNavigator.tsx).
// Cobre quem se cadastrou sem fotos ou cujo envio falhou depois de criar a conta. "Sair" é a única
// outra saída.
export default function EnviarFotosScreen() {
  const { perfil, recarregarPerfil, logout } = useAuth()
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  const [fotos, setFotos] = useState<Record<'selfie' | 'fotoVeiculo' | 'fotoPlaca', FotoSlot>>({
    selfie: null,
    fotoVeiculo: null,
    fotoPlaca: null,
  })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const todasPreenchidas = Boolean(fotos.selfie && fotos.fotoVeiculo && fotos.fotoPlaca)

  async function handleEscolherFoto(campo: keyof typeof fotos) {
    const foto = await escolherFoto(campo)
    if (foto) setFotos((atual) => ({ ...atual, [campo]: foto }))
  }

  async function handleEnviar() {
    setErro('')
    setEnviando(true)

    try {
      const dadosFormulario = new FormData()
      for (const [campo, foto] of Object.entries(fotos)) {
        if (!foto) continue
        dadosFormulario.append(campo, { uri: foto.uri, name: foto.nome, type: foto.tipo } as unknown as Blob)
      }

      await api.post('/Motoristas/fotos', dadosFormulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Com as 3 fotos salvas, o perfil passa a ter fotosEnviadas e o RootNavigator libera a Home.
      await recarregarPerfil()
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo} style={styles.tela}>
      <Text style={styles.icone}>📷</Text>
      <Text style={styles.titulo}>Envie suas fotos de verificação</Text>
      <Text style={styles.subtitulo}>
        Pra liberar o app, precisamos da sua selfie, da foto do veículo e da foto da placa. Toque em cada
        quadro pra tirar a foto ou escolher da galeria.
      </Text>

      <View style={styles.linhaFotos}>
        {camposFoto(tipoVeiculoDaApi(perfil?.tipoVeiculo)).map(({ chave, rotulo, dica }) => {
          const foto = fotos[chave]
          return (
            <Pressable key={chave} onPress={() => handleEscolherFoto(chave)} style={styles.fotoSlot}>
              {foto ? (
                <>
                  <Image source={{ uri: foto.uri }} style={styles.fotoPreview} />
                  <View style={styles.fotoSelo}>
                    <Text style={styles.fotoSeloTexto}>✓ {rotulo}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.fotoIcone}>📷</Text>
                  <Text style={styles.fotoRotulo}>{rotulo}</Text>
                  <Text style={styles.fotoDica}>{dica}</Text>
                </>
              )}
            </Pressable>
          )
        })}
      </View>

      {erro ? (
        <View style={styles.erroCaixa}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleEnviar}
        disabled={enviando || !todasPreenchidas}
        style={({ pressed }) => [
          styles.botao,
          (enviando || !todasPreenchidas) && styles.botaoDesabilitado,
          pressed && styles.botaoPressionado,
        ]}
      >
        {enviando ? <ActivityIndicator color={cores.branco} /> : <Text style={styles.botaoTexto}>Enviar fotos</Text>}
      </Pressable>

      <Pressable onPress={logout} hitSlop={8} style={styles.linkSair}>
        <Text style={styles.linkSairTexto}>Sair</Text>
      </Pressable>
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
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
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
      marginBottom: 24,
    },
    linhaFotos: {
      width: '100%',
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    fotoSlot: {
      flex: 1,
      aspectRatio: 0.85,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: cores.borda,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      gap: 4,
      overflow: 'hidden',
      backgroundColor: cores.cartao,
    },
    fotoPreview: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 12,
    },
    fotoIcone: {
      fontSize: 22,
    },
    fotoRotulo: {
      fontSize: 11,
      fontWeight: '600',
      color: cores.texto,
      textAlign: 'center',
    },
    fotoDica: {
      fontSize: 9,
      color: cores.textoSecundario,
      textAlign: 'center',
    },
    fotoSelo: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingVertical: 4,
    },
    fotoSeloTexto: {
      fontSize: 10,
      fontWeight: '700',
      color: '#ffffff',
      textAlign: 'center',
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
    linkSair: {
      marginTop: 28,
    },
    linkSairTexto: {
      fontSize: 13,
      color: cores.textoSecundario,
    },
  })
}
