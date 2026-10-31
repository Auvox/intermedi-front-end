import { useRef } from "react";
import { Link } from "react-router-dom";
import { useMotion, useScrollProgress } from "../hooks";

// Chamada final: o título do hero volta como convite, e o campo verde
// desliza para o rodapé.
export default function ChamadaFinal() {
  const ref = useRef(null);
  const movimento = useMotion();
  useScrollProgress(ref, { ativo: movimento, repouso: 0.5 });

  return (
    <section ref={ref} id="acesso" className="lpx-final lpx-fundo-green" data-fundo="green" aria-labelledby="final-titulo">
      <h2 id="final-titulo" className="lpx-final-titulo">
        <span className="lpx-linha"><span>Interligue a sua</span></span>
        <span className="lpx-linha"><span>farmácia.</span></span>
      </h2>
      <div className="lpx-final-base">
        <p className="lpx-corpo" data-reveal>
          Gerente, funcionário ou administrador: entre com a sua conta e continue de onde parou.
        </p>
        <Link to="/login" className="lpx-btn lpx-btn-ink lpx-btn-grande" data-reveal style={{ "--d": 1 }}>
          Acessar a plataforma
        </Link>
      </div>
    </section>
  );
}
