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
import { camposFoto, escolherFoto, type ChaveFoto, type FotoSlot } from '../utils/fotosVerificacao'
import { TEXTO_CNH_EAR, TEXTO_REGRAS_MOTO, tipoVeiculoDaApi } from '../utils/veiculo'
import type { Cores } from '../theme/colors'

// Tela travada, igual à de confirmação de SMS: enquanto o cadastro tiver alguma pendência
// (perfil.cadastroCompleto falso), o RootNavigator mostra só essa tela, nunca a Home (ver
// RootNavigator.tsx). Pede só o que falta: as fotos de verificação (selfie, veículo, placa e, pra
// moto, a CNH) e, pra moto, a declaração de CNH A/EAR e o aceite das regras da moto. Cobre quem se
// cadastrou sem fotos, cujo envio falhou depois de criar a conta, ou o motorista de moto cadastrado
// antes dessas exigências existirem. "Sair" é a única outra saída.
export default function EnviarFotosScreen() {
  const { perfil, recarregarPerfil, logout } = useAuth()
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  const tipoVeiculo = tipoVeiculoDaApi(perfil?.tipoVeiculo)
  const ehMoto = tipoVeiculo === 'moto'

  // Só os quadros das fotos que ainda não estão no servidor.
  const jaTemFoto: Record<ChaveFoto, boolean> = {
    selfie: Boolean(perfil?.temFotoSelfie),
    fotoVeiculo: Boolean(perfil?.temFotoVeiculo),
    fotoPlaca: Boolean(perfil?.temFotoPlaca),
    fotoCnh: Boolean(perfil?.temFotoCnh),
  }
  const camposFaltando = camposFoto(tipoVeiculo).filter((c) => !jaTemFoto[c.chave])
  const precisaRegrasMoto = ehMoto && !(perfil?.cnhCategoriaAEar && perfil?.regrasMotoAceitas)

  const [fotos, setFotos] = useState<Record<ChaveFoto, FotoSlot>>({
    selfie: null,
    fotoVeiculo: null,
    fotoPlaca: null,
    fotoCnh: null,
  })
  const [cnhAEar, setCnhAEar] = useState(false)
  const [regrasAceitas, setRegrasAceitas] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const fotosOk = camposFaltando.every((c) => fotos[c.chave])
  const regrasOk = !precisaRegrasMoto || (cnhAEar && regrasAceitas)
  const podeEnviar = fotosOk && regrasOk

  async function handleEscolherFoto(campo: ChaveFoto) {
    const foto = await escolherFoto(campo)
    if (foto) setFotos((atual) => ({ ...atual, [campo]: foto }))
  }

  async function handleEnviar() {
    setErro('')
    setEnviando(true)

    try {
      if (camposFaltando.length > 0) {
        const dadosFormulario = new FormData()
        for (const campo of camposFaltando) {
          const foto = fotos[campo.chave]
          if (!foto) continue
          dadosFormulario.append(campo.chave, { uri: foto.uri, name: foto.nome, type: foto.tipo } as unknown as Blob)
        }

        await api.post('/Motoristas/fotos', dadosFormulario, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      if (precisaRegrasMoto) {
        await api.post('/Motoristas/regras-moto', { cnhCategoriaAEar: cnhAEar, aceitoRegras: regrasAceitas })
      }

      // Com tudo salvo, o perfil passa a ter cadastroCompleto e o RootNavigator libera a Home.
      await recarregarPerfil()
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo} style={styles.tela}>
      <Text style={styles.icone}>📋</Text>
      <Text style={styles.titulo}>Complete seu cadastro</Text>
      <Text style={styles.subtitulo}>
        Pra liberar o app, falta enviar {camposFaltando.length > 0 ? 'as fotos abaixo' : ''}
        {camposFaltando.length > 0 && precisaRegrasMoto ? ' e ' : ''}
        {precisaRegrasMoto ? 'confirmar as regras da moto' : ''}. Toque em cada quadro pra tirar a foto ou
        escolher da galeria.
      </Text>

      {camposFaltando.length > 0 ? (
        <View style={styles.linhaFotos}>
          {camposFaltando.map(({ chave, rotulo, dica }) => {
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
      ) : null}

      {precisaRegrasMoto ? (
        <View style={styles.blocoRegras}>
          <Pressable onPress={() => setCnhAEar((atual) => !atual)} style={styles.checkboxLinha}>
            <View style={[styles.checkbox, cnhAEar && styles.checkboxMarcado]}>
              {cnhAEar ? <Text style={styles.checkboxMarca}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxTexto}>{TEXTO_CNH_EAR}</Text>
          </Pressable>

          <View style={styles.regrasCaixa}>
            <Text style={styles.regrasTexto}>Regras para motoristas de moto{'\n\n'}• {TEXTO_REGRAS_MOTO}</Text>
          </View>

          <Pressable onPress={() => setRegrasAceitas((atual) => !atual)} style={styles.checkboxLinha}>
            <View style={[styles.checkbox, regrasAceitas && styles.checkboxMarcado]}>
              {regrasAceitas ? <Text style={styles.checkboxMarca}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxTexto}>Li e aceito as regras para motoristas de moto.</Text>
          </Pressable>
        </View>
      ) : null}

      {erro ? (
        <View style={styles.erroCaixa}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleEnviar}
        disabled={enviando || !podeEnviar}
        style={({ pressed }) => [
          styles.botao,
          (enviando || !podeEnviar) && styles.botaoDesabilitado,
          pressed && styles.botaoPressionado,
        ]}
      >
        {enviando ? <ActivityIndicator color={cores.branco} /> : <Text style={styles.botaoTexto}>Enviar</Text>}
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
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    fotoSlot: {
      flexBasis: '30%',
      flexGrow: 0,
      flexShrink: 0,
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
    blocoRegras: {
      width: '100%',
      marginBottom: 20,
      gap: 14,
    },
    checkboxLinha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderWidth: 1,
      borderColor: cores.borda,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: cores.cartao,
    },
    checkboxMarcado: {
      backgroundColor: cores.primaria,
      borderColor: cores.primaria,
    },
    checkboxMarca: {
      color: cores.branco,
      fontSize: 14,
      fontWeight: '700',
    },
    checkboxTexto: {
      flex: 1,
      fontSize: 13,
      color: cores.texto,
      lineHeight: 18,
    },
    regrasCaixa: {
      borderWidth: 1,
      borderColor: cores.borda,
      borderRadius: 10,
      backgroundColor: cores.cartao,
      padding: 12,
    },
    regrasTexto: {
      fontSize: 12,
      color: cores.textoSecundario,
      lineHeight: 18,
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
