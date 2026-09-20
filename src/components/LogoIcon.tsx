import { Image, View, type ViewStyle } from 'react-native'

// icon.png (usado antes aqui) tem fundo quase opaco (só ~1% transparente) — aparecia como um
// quadrado branco/claro atrás do logo no modo escuro. android-icon-foreground.png é o layer
// transparente do ícone adaptativo (91% transparente), mas o desenho ocupa só a região central
// (~55% do canvas, pela margem de segurança padrão de ícone adaptativo Android) — por isso a
// imagem é renderizada maior que o tamanho pedido e cortada (overflow hidden), pra preencher o
// espaço direito sem sobrar borda transparente em excesso.
const FATOR_CROP = 1.835

type Props = {
  size: number
  style?: ViewStyle
}

export default function LogoIcon({ size, style }: Props) {
  const tamanhoImagem = size * FATOR_CROP
  const deslocamento = (tamanhoImagem - size) / 2

  return (
    <View style={[{ width: size, height: size, overflow: 'hidden' }, style]}>
      <Image
        source={require('../../assets/android-icon-foreground.png')}
        style={{
          width: tamanhoImagem,
          height: tamanhoImagem,
          marginLeft: -deslocamento,
          marginTop: -deslocamento,
        }}
        resizeMode="contain"
      />
    </View>
  )
}
