import { Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

// Seleção das 3 fotos de verificação (selfie, veículo, placa), usada tanto no cadastro quanto na tela
// que trava o app enquanto faltar alguma (ver EnviarFotosScreen).
export type FotoSlot = { uri: string; nome: string; tipo: string } | null

export const CAMPOS_FOTO = [
  { chave: 'selfie' as const, rotulo: 'Selfie', dica: 'Seu rosto, bem visível' },
  { chave: 'fotoVeiculo' as const, rotulo: 'Foto do veículo', dica: 'De frente, o carro inteiro' },
  { chave: 'fotoPlaca' as const, rotulo: 'Foto da placa', dica: 'Placa legível, de perto' },
]

// Abre um Alert perguntando câmera ou galeria, e devolve o arquivo escolhido pronto pra mandar
// como multipart (ver handleCadastrar) — ou null se o motorista cancelar em qualquer etapa.
export function escolherFoto(nomeCampo: string): Promise<FotoSlot> {
  return new Promise((resolve) => {
    Alert.alert('Adicionar foto', undefined, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      {
        text: 'Câmera',
        onPress: async () => {
          const permissao = await ImagePicker.requestCameraPermissionsAsync()
          if (!permissao.granted) {
            resolve(null)
            return
          }
          const resultado = await ImagePicker.launchCameraAsync({ quality: 0.7 })
          resolve(paraFotoSlot(resultado, nomeCampo))
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
          if (!permissao.granted) {
            resolve(null)
            return
          }
          const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] })
          resolve(paraFotoSlot(resultado, nomeCampo))
        },
      },
    ])
  })
}

function paraFotoSlot(resultado: ImagePicker.ImagePickerResult, nomeCampo: string): FotoSlot {
  if (resultado.canceled || !resultado.assets?.[0]) return null

  const asset = resultado.assets[0]
  return { uri: asset.uri, nome: `${nomeCampo}.jpg`, tipo: asset.mimeType ?? 'image/jpeg' }
}
