import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import type { Ponto } from '../utils/navegacaoGps'

type Props = {
  pontosRota: Ponto[]
  destino: Ponto
  corHex: string
  posicao: Ponto
  heading: number | null
}

// Mapa full-screen de navegação: desenha o trajeto e a posição UMA vez (via HTML injetado no
// WebView) e, depois disso, só manda updates de posição/direção pro JS já carregado via
// injectJavaScript — evita recriar o mapa (e re-baixar os tiles) a cada posição nova do GPS.
function montarHtml(pontosRota: Ponto[], destino: Ponto, corHex: string, posicaoInicial: Ponto, headingInicial: number | null) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #mapa { height: 100%; margin: 0; padding: 0; background: #e5e7eb; }
    .seta-navegacao { width: 30px; height: 30px; transform: rotate(${headingInicial ?? 0}deg); transition: transform 0.25s linear; }
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const pontosRota = ${JSON.stringify(pontosRota)};
    const destino = ${JSON.stringify(destino)};
    const corHex = ${JSON.stringify(corHex)};
    let posicaoAtual = ${JSON.stringify(posicaoInicial)};
    let seguindo = true;

    const mapa = L.map('mapa', { zoomControl: false, attributionControl: false }).setView(
      [posicaoAtual.latitude, posicaoAtual.longitude], 17
    );
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mapa);

    L.polyline(pontosRota.map((p) => [p.latitude, p.longitude]), { color: corHex, weight: 6, opacity: 0.9 }).addTo(mapa);
    L.circleMarker([destino.latitude, destino.longitude], {
      radius: 9, color: corHex, fillColor: corHex, fillOpacity: 1, weight: 2,
    }).addTo(mapa);

    const iconeSeta = L.divIcon({
      className: '',
      html: '<div class="seta-navegacao" id="seta"><svg width="30" height="30" viewBox="0 0 24 24"><path d="M12 1.5L4 21l8-5.5L20 21z" fill="#2563eb" stroke="#ffffff" stroke-width="1.5"/></svg></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    const marcador = L.marker([posicaoAtual.latitude, posicaoAtual.longitude], { icon: iconeSeta, zIndexOffset: 1000 }).addTo(mapa);

    mapa.on('dragstart', function () { seguindo = false; });

    window.atualizarPosicao = function (lat, lon, heading) {
      posicaoAtual = { latitude: lat, longitude: lon };
      marcador.setLatLng([lat, lon]);
      const seta = document.getElementById('seta');
      if (seta && heading !== null && heading !== undefined) seta.style.transform = 'rotate(' + heading + 'deg)';
      if (seguindo) mapa.panTo([lat, lon], { animate: true, duration: 0.3 });
    };

    window.recentralizar = function () {
      seguindo = true;
      mapa.panTo([posicaoAtual.latitude, posicaoAtual.longitude]);
    };
  </script>
</body>
</html>`
}

export default function MapaNavegacao({ pontosRota, destino, corHex, posicao, heading }: Props) {
  const webviewRef = useRef<WebView>(null)

  useEffect(() => {
    webviewRef.current?.injectJavaScript(
      `window.atualizarPosicao(${posicao.latitude}, ${posicao.longitude}, ${heading ?? 'null'}); true;`
    )
  }, [posicao.latitude, posicao.longitude, heading])

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        // Chave fixa: o HTML só deve recarregar quando o trajeto muda de fato (rota recalculada),
        // não a cada posição nova — o componente pai já trata isso remontando via `key` na rota.
        source={{ html: montarHtml(pontosRota, destino, corHex, posicao, heading) }}
        style={styles.webview}
        originWhitelist={['*']}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
})
