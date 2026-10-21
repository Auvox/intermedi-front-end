import { useEffect, useRef } from "react";
import { CORES_CALOR } from "./constantes";

// Mapa de calor desenhado num <canvas> por cima da tela (gradiente radial).
// pontos: [{ x, y, peso }] com x e y em fração da tela (0 a 1).
// 1) cada ponto vira um círculo em tons de cinza (mais cliques = mais forte);
// 2) a intensidade é pintada de azul (pouco) a vermelho (muito).
// O canvas também bloqueia os cliques na tela de baixo (modo somente leitura).

function paleta() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  const gradiente = ctx.createLinearGradient(0, 0, 256, 0);
  CORES_CALOR.forEach((cor, i) => gradiente.addColorStop(i / (CORES_CALOR.length - 1), cor));
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

export default function MapaCalorCanvas({ pontos, visivel = true, rotulo }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;

    function desenhar() {
      const { width, height } = canvas.getBoundingClientRect();
      const escala = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(width * escala));
      canvas.height = Math.max(1, Math.round(height * escala));
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!visivel || !pontos?.length) return;

      const raio = Math.max(14, Math.min(canvas.width, canvas.height) * 0.04);
      const maior = Math.max(...pontos.map((p) => p.peso));
      // 1) intensidade em tons de cinza (canal alfa)
      for (const { x, y, peso } of pontos) {
        const cx = x * canvas.width;
        const cy = y * canvas.height;
        const forca = Math.max(0.06, Math.sqrt(peso / maior));
        const gradiente = ctx.createRadialGradient(cx, cy, 0, cx, cy, raio);
        gradiente.addColorStop(0, `rgba(0, 0, 0, ${forca})`);
        gradiente.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradiente;
        ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2);
      }
      // 2) colore pela intensidade
      const imagem = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const cores = paleta();
      const px = imagem.data;
      for (let i = 0; i < px.length; i += 4) {
        const alfa = px[i + 3];
        if (!alfa) continue;
        const c = alfa * 4;
        px[i] = cores[c];
        px[i + 1] = cores[c + 1];
        px[i + 2] = cores[c + 2];
        px[i + 3] = Math.min(210, 40 + alfa);
      }
      ctx.putImageData(imagem, 0, 0);
    }

    desenhar();
    const observer = new ResizeObserver(desenhar);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [pontos, visivel]);

  return <canvas ref={ref} className="adm-dsp-calor-canvas" role="img" aria-label={rotulo} />;
}

export function LegendaCalor() {
  return (
    <div className="adm-dsp-legenda" aria-label="Legenda: azul são poucos cliques, vermelho são muitos">
      <span>Poucos cliques</span>
      <i style={{ background: `linear-gradient(90deg, ${CORES_CALOR.join(", ")})` }} aria-hidden="true" />
      <span>Muitos cliques</span>
    </div>
  );
}
