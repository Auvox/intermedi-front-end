import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { useRelogio } from "../../hooks/useRastreio";
import { preparoDoPedido } from "../../services/rastreio";
import SceneEnvironment from "./SceneEnvironment";
import PharmacyBuilding from "./PharmacyBuilding";
import StorageArea from "./StorageArea";
import ServicePoint from "./ServicePoint";
import Employee, { Patient } from "./Employee";
import ManagerOffice from "./ManagerOffice";
import DeliveryDock from "./DeliveryDock";
import CargaNaDoca from "./CargaNaDoca";
import AlertMarker from "./AlertMarker";
import CameraControls from "./CameraControls";
import { CamadaRotulos, ProjetorRotulos } from "./Rotulos";
import { COR_STATUS } from "./cores";
import {
  BALCOES,
  GONDOLA,
  MESA_GERENTE,
  ORIENTACAO,
  VISTAS,
  ZONAS,
  SEPARACAO_X,
  layoutEntregas,
  layoutEquipe,
  layoutEstoque,
  pacientesEmAtendimento,
} from "./layout";

const TRASEIRA_HOVER = 14;

// Cena 3D da unidade. Só desenha: os dados chegam prontos em `operacao`
// (services/operacao.js) e cada clique devolve a chave do objeto para a página,
// que mostra o painel com os dados reais e as ações que já existem no sistema.
// Renderiza sob demanda (frameloop="demand"): parada, a GPU fica ociosa.
export default function IntermediScene({ operacao, selecionado, onSelecionar, foco, reduzirMovimento, onContextoPerdido }) {
  const [hover, setHover] = useState(null);
  useCursor(Boolean(hover));
  // o ponteiro se move o tempo todo: só redesenha quando o objeto sob ele muda
  const mudarHover = (proximo) => setHover((atual) => (atual?.key === proximo?.key ? atual : proximo));
  // nível de detalhe: de perto, as placas mostram o nome do corredor
  const [perto, setPerto] = useState(false);
  const mudarDistancia = (d) => setPerto(d < 30);

  // caminhões e preparo andam com o relógio do navegador (1 s), só enquanto há
  // algo em movimento
  const temMovimento = operacao.entregas.some((e) => ["preparando", "enviada"].includes(e.status));
  const agora = useRelogio(temMovimento, 1000);

  const itensPorKey = useMemo(() => new Map(operacao.itens.map((i) => [i.key, i])), [operacao.itens]);
  const estoque = useMemo(() => layoutEstoque(operacao.corredores), [operacao.corredores]);
  const equipe = useMemo(() => layoutEquipe(operacao.funcionarios), [operacao.funcionarios]);
  const pacientes = useMemo(() => pacientesEmAtendimento(operacao.funcionarios, equipe), [operacao.funcionarios, equipe]);
  const caminhoes = useMemo(
    () => layoutEntregas(operacao.entregas, agora),
    [operacao.entregas, agora],
  );
  const autorDoChamado = useMemo(
    () => new Map(operacao.chamadosPendentes
      .filter((c) => c.idFuncionario)
      .map((c) => [c.key, `funcionario:${c.idFuncionario}`])),
    [operacao.chamadosPendentes],
  );

  // chamado selecionado: destaca os remédios pedidos e quem abriu
  const chamadoSel = operacao.chamadosPendentes.find((c) => c.key === selecionado);
  // Preparo do envio na doca (esta farmácia é a fornecedora): caminhão parado,
  // caixas no palete e, quando alguém começou, essa pessoa carregando.
  // Destaques nas prateleiras: remédios do chamado selecionado e os que estão
  // saindo do estoque para outra farmácia.
  const { cargas, destacados } = useMemo(() => {
    const porKey = new Map(operacao.entregas.map((e) => [e.key, e]));
    const lista = caminhoes
      .filter((c) => c.sentido === "saida" && c.estado !== "viajando")
      .map((c) => ({ ...c, entrega: porKey.get(c.key) }));
    return {
      cargas: lista,
      destacados: new Set([
        ...(chamadoSel?.remedios ?? []).map((r) => `remedio:${r.idRemedio}`),
        ...lista.map((c) => `remedio:${c.entrega.idRemedio}`),
      ]),
    };
  }, [caminhoes, operacao.entregas, chamadoSel]);
  // posição de cada pessoa carregando: a animação atualiza e a etiqueta segue
  const posicoesCarga = new Map(cargas.map((c) => [c.key, { current: [SEPARACAO_X + 0.9, 2.25, c.z] }]));
  const carregadores = new Map(cargas
    .filter((c) => c.estado === "carregando" && c.entrega.idFuncionarioPreparo)
    .map((c) => [`funcionario:${c.entrega.idFuncionarioPreparo}`, c]));
  const autorSel = chamadoSel ? autorDoChamado.get(chamadoSel.key) : null;

  // a câmera resolve o foco com a planta mais recente
  const cenaRef = useRef(null);
  useEffect(() => {
    cenaRef.current = { estoque, equipe, caminhoes, autorDoChamado };
  }, [estoque, equipe, caminhoes, autorDoChamado]);

  // a sombra de contato é refeita só quando a planta muda
  const versaoSombra = useMemo(
    () => [
      estoque.gondolas.map((g) => `${g.key}:${g.itens.map((i) => i.caixas).join(".")}`).join("|"),
      [...equipe.values()].map((p) => p.join(",")).join("|"),
      pacientes.length,
    ].join("/"),
    [estoque, equipe, pacientes],
  );

  // O <Canvas> descarta o contexto WebGL ao desmontar (ex.: trocar para 2D).
  // Só uma perda com a cena montada é falha de verdade.
  const aoPerderContexto = useRef(null);
  useEffect(() => {
    aoPerderContexto.current = (event) => {
      event.preventDefault();
      onContextoPerdido?.();
    };
    return () => {
      aoPerderContexto.current = null;
    };
  }, [onContextoPerdido]);

  const sair = () => mudarHover(null);
  const selecionar = (chave) => {
    setHover(null);
    onSelecionar(chave);
  };

  // Etiquetas e marcadores (camada HTML única sobre o canvas)
  const [registro] = useState(() => new Map());
  const rotulos = [];
  Object.entries(ZONAS).forEach(([id, z]) => rotulos.push({
    key: `zona:${id}`,
    p: [z.rotuloEm[0], 0.05, z.rotuloEm[1]],
    conteudo: <span className="op3d-zona">{z.rotulo}</span>,
  }));
  estoque.gondolas.forEach((g) => {
    const ativa = g.key === selecionado || g.key === hover?.key;
    rotulos.push({
      key: `placa:${g.key}`,
      p: [g.x0 + 0.05, GONDOLA.altura + 0.4, g.z],
      ancora: "esquerda",
      conteudo: (
        <span className={`op3d-placa${ativa ? " ativa" : ""}`}>
          <b>{String(g.numero).padStart(2, "0")}</b>
          {(perto || ativa) && <span>{g.categoria}</span>}
        </span>
      ),
    });
    g.itens.filter((i) => i.situacao !== "ok").forEach((i) => {
      const item = itensPorKey.get(i.key);
      rotulos.push({
        key: `alerta:${i.key}`,
        p: [i.x, 1.3, i.z + GONDOLA.profundidade / 2 + 0.2],
        conteudo: (
          <AlertMarker
            situacao={i.situacao}
            rotulo={`${item?.nomeCompleto ?? "Remédio"}: ${item?.alertaTexto ?? ""}`}
            onClick={() => selecionar(i.key)}
          />
        ),
      });
    });
  });
  operacao.funcionarios.forEach((f) => {
    if (carregadores.has(f.key)) return;
    const p = equipe.get(f.key);
    const ativa = selecionado === f.key || autorSel === f.key;
    rotulos.push({
      key: `pessoa:${f.key}`,
      p: [p[0], 2.25, p[2]],
      conteudo: (
        <span className={`op3d-pessoa${ativa ? " ativa" : ""}${f.noTurno ? "" : " fora"}`}>
          <i style={{ background: COR_STATUS[f.status.id] }} aria-hidden="true" />
          {f.primeiroNome}
        </span>
      ),
    });
    if (f.chamadosPendentes.length) {
      rotulos.push({
        key: `chamado-de:${f.key}`,
        p: [p[0] + 0.7, 1.7, p[2]],
        conteudo: (
          <AlertMarker
            tom="yellow"
            icone="chamado"
            rotulo={`${f.nome} abriu ${f.chamadosPendentes.length === 1 ? "um chamado pendente" : `${f.chamadosPendentes.length} chamados pendentes`}`}
            onClick={() => selecionar(f.chamadosPendentes[0])}
          />
        ),
      });
    }
  });
  if (operacao.gerente) {
    rotulos.push({
      key: "pessoa:gerente",
      p: [MESA_GERENTE.x - 0.1, 2.25, MESA_GERENTE.z - 0.85],
      conteudo: (
        <span className={`op3d-pessoa${selecionado === operacao.gerente.key ? " ativa" : ""}`}>
          <i style={{ background: COR_STATUS.disponivel }} aria-hidden="true" />
          {operacao.gerente.nome.split(" ")[0]}
        </span>
      ),
    });
  }
  const pendentes = operacao.kpis.chamados.pendentes;
  if (pendentes > 0) {
    rotulos.push({
      key: "marcador:chamados",
      p: [MESA_GERENTE.x - 0.6, 1.55, MESA_GERENTE.z + 0.4],
      conteudo: (
        <AlertMarker
          tom={operacao.chamadosPendentes.some((c) => ["alta", "urgente"].includes(c.prioridade)) ? "red" : "yellow"}
          icone="chamado"
          texto={String(pendentes)}
          rotulo={`${pendentes} ${pendentes === 1 ? "chamado pendente" : "chamados pendentes"} na gerência`}
          onClick={() => selecionar(operacao.chamadosPendentes.length === 1 ? operacao.chamadosPendentes[0].key : "chamados")}
        />
      ),
    });
  }
  cargas.forEach((c) => {
    const e = c.entrega;
    const prep = preparoDoPedido(e, agora);
    const quem = operacao.funcionarios.find((f) => f.idFuncionario === e.idFuncionarioPreparo);
    if (c.estado === "carregando" && prep) {
      rotulos.push({
        key: `pessoa:carga:${c.key}`,
        posicaoRef: posicoesCarga.get(c.key),
        conteudo: (
          <span className={`op3d-pessoa${selecionado === quem?.key ? " ativa" : ""}`}>
            <i style={{ background: COR_STATUS.atendimento }} aria-hidden="true" />
            {(quem?.primeiroNome ?? e.nomeFuncionarioPreparo?.split(" ")[0]) || "Equipe"}
          </span>
        ),
      });
    }
    rotulos.push({
      key: `marcador:carga:${c.key}`,
      p: [c.x - 1.6, 3.1, c.z],
      conteudo: c.estado === "carregando" && prep ? (
        <AlertMarker
          tom="blue"
          icone="caminhao"
          texto={`${prep.carregadas}/${prep.caixas}`}
          rotulo={`Carregando o caminhão para ${e.outraFarmacia}: ${prep.carregadas} de ${prep.caixas} ${prep.caixas === 1 ? "caixa" : "caixas"}`}
          onClick={() => selecionar(c.key)}
        />
      ) : (
        <AlertMarker
          tom="orange"
          icone="caminhao"
          texto="Aguardando preparo"
          rotulo={`Pedido aceito: ${e.quantidade}× ${e.nomeRemedio} para ${e.outraFarmacia}. Aguardando alguém da equipe começar o preparo`}
          onClick={() => selecionar(c.key)}
        />
      ),
    });
  });

  const aguardandoVoce = operacao.entregas.filter((e) => e.aguardandoVoce);
  // pedidos desta farmácia ainda na outra (aguardando, aceitos ou em preparo)
  const aguardandoFornecedor = operacao.entregas.filter((e) => e.sentido === "entrada" && e.progresso === null);
  if (aguardandoVoce.length) {
    rotulos.push({
      key: "marcador:pedidos-voce",
      p: [14.6, 3, -7.2],
      conteudo: (
        <AlertMarker
          tom="orange"
          icone="caminhao"
          texto={String(aguardandoVoce.length)}
          rotulo={`${aguardandoVoce.length} ${aguardandoVoce.length === 1 ? "pedido da rede aguardando" : "pedidos da rede aguardando"} sua resposta`}
          onClick={() => selecionar(aguardandoVoce[0].key)}
        />
      ),
    });
  }
  if (aguardandoFornecedor.length) {
    rotulos.push({
      key: "marcador:pedidos-fornecedor",
      p: [14.6, 3, -3.8],
      conteudo: (
        <AlertMarker
          tom="blue"
          icone="caminhao"
          texto={String(aguardandoFornecedor.length)}
          rotulo={aguardandoFornecedor.map((e) => `${e.quantidade}× ${e.nomeRemedio}: ${
            e.status === "preparando" ? `em preparo na ${e.outraFarmacia}${e.nomeFuncionarioPreparo ? ` (${e.nomeFuncionarioPreparo})` : ""}`
              : e.status === "aprovada" ? `aceito pela ${e.outraFarmacia}, aguardando o preparo`
                : `aguardando a ${e.outraFarmacia} responder`}`).join("; ")}
          onClick={() => selecionar(aguardandoFornecedor[0].key)}
        />
      ),
    });
  }
  if (hover) {
    rotulos.push({ key: "tooltip", p: hover.p, ancora: "acima", conteudo: <span className="op3d-tooltip">{hover.texto}</span> });
  }

  return (
    <div className="op3d-cena">
      <Canvas
        frameloop="demand"
        flat
        dpr={[1, 1.75]}
        camera={{ position: VISTAS.geral.posicao, fov: 32, near: 0.5, far: 240 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={(state) => {
          state.gl.domElement.addEventListener("webglcontextlost", (event) => aoPerderContexto.current?.(event));
          // só no desenvolvimento: permite que os testes leiam a cena (draw calls, câmera)
          if (import.meta.env.DEV) window.__intermedi3d = state;
        }}
        onPointerMissed={() => onSelecionar(null)}
      >
        <SceneEnvironment versao={versaoSombra} />
        <PharmacyBuilding />

        <StorageArea
          estoque={estoque}
          itensPorKey={itensPorKey}
          selecionado={selecionado}
          destacados={destacados}
          hover={hover}
          onSelecionar={selecionar}
          onHover={mudarHover}
        />

        {BALCOES.map((b, i) => (
          <ServicePoint
            key={b.key}
            p={[b.x, 0, b.z]}
            selecionado={selecionado === b.key}
            emHover={hover?.key === b.key}
            onClick={() => selecionar(b.key)}
            onHover={() => mudarHover({ key: b.key, p: [b.x, 1.4, b.z], texto: `Balcão ${i + 1}` })}
            onSair={sair}
          />
        ))}
        <ServicePoint
          p={[ORIENTACAO.x, 0, ORIENTACAO.z]}
          tipo="orientacao"
          selecionado={selecionado === ORIENTACAO.key}
          emHover={hover?.key === ORIENTACAO.key}
          onClick={() => selecionar(ORIENTACAO.key)}
          onHover={() => mudarHover({ key: ORIENTACAO.key, p: [ORIENTACAO.x, 1.1, ORIENTACAO.z], texto: "Orientação farmacêutica" })}
          onSair={sair}
        />

        {operacao.funcionarios.filter((f) => !carregadores.has(f.key)).map((f) => {
          const p = equipe.get(f.key);
          return (
            <Employee
              key={f.key}
              p={p}
              status={f.status.id}
              selecionado={selecionado === f.key || autorSel === f.key}
              emHover={hover?.key === f.key}
              onClick={() => selecionar(f.key)}
              onHover={() => mudarHover({ key: f.key, p: [p[0], 2.6, p[2]], texto: `${f.nome} · ${f.cargo} · ${f.status.label}` })}
              onSair={sair}
            />
          );
        })}
        {pacientes.map((p) => <Patient key={p.key} p={p.p} />)}

        <ManagerOffice
          gerente={operacao.gerente}
          chamados={operacao.chamadosPendentes}
          totalPendentes={pendentes}
          selecionado={selecionado}
          hover={hover}
          onSelecionar={selecionar}
          onHover={mudarHover}
        />

        {cargas.map((c) => {
          const quem = operacao.funcionarios.find((f) => f.idFuncionario === c.entrega.idFuncionarioPreparo);
          const chave = quem?.key ?? c.key;
          return (
            <CargaNaDoca
              key={c.key}
              entrega={c.entrega}
              z={c.z}
              agora={agora}
              selecionado={selecionado === chave}
              emHover={hover?.key === chave}
              reduzirMovimento={reduzirMovimento}
              posicaoRef={posicoesCarga.get(c.key)}
              onSelecionar={() => selecionar(chave)}
              onHover={() => mudarHover({ key: chave, p: [TRASEIRA_HOVER, 2.6, c.z], texto: `${c.entrega.nomeFuncionarioPreparo ?? "Funcionário"} · carregando o caminhão` })}
              onSair={sair}
            />
          );
        })}

        <DeliveryDock
          caminhoes={caminhoes}
          entregas={operacao.entregas}
          selecionado={selecionado}
          hover={hover}
          reduzirMovimento={reduzirMovimento}
          onSelecionar={selecionar}
          onHover={mudarHover}
        />

        <ProjetorRotulos rotulos={rotulos} registro={registro} />
        <CameraControls foco={foco} cenaRef={cenaRef} reduzirMovimento={reduzirMovimento} onDistancia={mudarDistancia} />
      </Canvas>
      <CamadaRotulos rotulos={rotulos} registro={registro} />
    </div>
  );
}
