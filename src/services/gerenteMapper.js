export function normalizeGerentes(payload = []) {
  return payload.map((manager, index) => {
    const id = manager.idGerente ?? manager.id ?? String(index + 1);
    const name =
      manager.nomeGerente ?? manager.name ?? manager.nome ?? "Gerente";
    const email = manager.emailGerente ?? manager.email ?? "";
    const unit =
      manager.nomeFarmacia ??
      manager.unidade ??
      manager.unit ??
      manager.unidadeGerente ??
      manager.cidadeGerente ??
      manager.cidade ??
      manager.enderecoGerente ??
      manager.bairroGerente ??
      "Unidade não informada";

    return {
      id: String(id),
      name,
      email,
      farmaciaId: manager.fkIdFarmacia ?? manager.idFarmacia ?? null,
      idEndereco: manager.idEndereco ?? null,
      unit,
      status: manager.status || "Ativo",
    };
  });
}
