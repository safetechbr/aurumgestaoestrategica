"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Share2 } from "lucide-react";
import { useCompany } from "@/lib/CompanyContext";
import { resumirDescricao } from "@/lib/csv-parser";

interface Transacao {
  id: string;
  data: string;
  descricaoOriginal: string;
  valor: number;
  tipo: "RECEITA" | "DESPESA";
  importacao?: {
    nomeArquivo: string;
    origem: string;
  };
}

interface Categoria {
  id: string;
  nome: string;
  tipo: "RECEITA" | "DESPESA";
  escopo?: "EMPRESA" | "PESSOAL";
  _count?: {
    transacoes: number;
  };
}

export default function ReviewPage() {
  const { selectedCompany } = useCompany();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Filtros e ordenação
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState("data_desc");

  useEffect(() => {
    if (selectedCompany) {
      carregar();
    }
  }, [selectedCompany]);

  async function carregar() {
    if (!selectedCompany) return;
    setCarregando(true);
    try {
      const resp = await fetch(`/api/transactions/pending?empresaId=${selectedCompany.id}`);
      const dados = await resp.json();
      setTransacoes(dados.transacoes ?? []);
      setCategorias(dados.categorias ?? []);
    } catch (error) {
      console.error("Erro ao carregar transações pendentes:", error);
    } finally {
      setCarregando(false);
    }
  }

  function copiarLinkCompartilhamento() {
    if (!selectedCompany) return;
    const shareUrl = `${window.location.origin}/share/review?id=${selectedCompany.id}`;
    navigator.clipboard.writeText(shareUrl);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 3000);
  }

  async function categorizar(transacaoId: string, categoriaId: string) {
    await fetch(`/api/transactions/${transacaoId}/categorize-manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoriaId, criarRegra: true }),
    });
    // remove da lista local — já categorizada, e a regra foi criada pro futuro
    setTransacoes((atual) => atual.filter((t) => t.id !== transacaoId));
  }

  // Filtragem
  const transacoesFiltradas = transacoes.filter((t) => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return true;
    return (
      t.descricaoOriginal.toLowerCase().includes(termo) ||
      resumirDescricao(t.descricaoOriginal).toLowerCase().includes(termo)
    );
  });

  // Ordenação
  const transacoesExibidas = [...transacoesFiltradas].sort((a, b) => {
    switch (ordenacao) {
      case "data_asc":
        return new Date(a.data).getTime() - new Date(b.data).getTime();
      case "data_desc":
        return new Date(b.data).getTime() - new Date(a.data).getTime();
      case "valor_desc":
        return Math.abs(b.valor) - Math.abs(a.valor);
      case "valor_asc":
        return Math.abs(a.valor) - Math.abs(b.valor);
      case "tipo_receita":
        if (a.tipo === b.tipo) return 0;
        return a.tipo === "RECEITA" ? -1 : 1;
      case "tipo_despesa":
        if (a.tipo === b.tipo) return 0;
        return a.tipo === "DESPESA" ? -1 : 1;
      case "alfa_asc":
        return a.descricaoOriginal.localeCompare(b.descricaoOriginal);
      case "alfa_desc":
        return b.descricaoOriginal.localeCompare(a.descricaoOriginal);
      default:
        return 0;
    }
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Revisão manual</h1>
          <p className="subtitle" style={{ margin: "4px 0 0" }}>
            Empresa ativa: <strong style={{ color: "var(--text)" }}>{selectedCompany?.nome}</strong>. Toda categorização feita aqui vira uma regra nova automaticamente.
          </p>
        </div>

        {selectedCompany && (
          <button
            onClick={copiarLinkCompartilhamento}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: linkCopiado ? "var(--green)" : "var(--purple)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Share2 size={16} />
            {linkCopiado ? "Copiado! Envie via WhatsApp" : "Enviar para o empresário"}
          </button>
        )}
      </div>

      {carregando && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 20, color: "var(--text-muted)" }}>
          <Loader2 className="animate-spin" size={16} />
          Buscando transações pendentes...
        </div>
      )}

      {!carregando && transacoes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Barra de Filtros e Pesquisa */}
          <div style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)"
          }}>
            {/* Campo de Pesquisa */}
            <div style={{ display: "flex", flex: 1, minWidth: 260, position: "relative" }}>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar por palavra-chave..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13.5,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  margin: 0
                }}
              />
              {busca && (
                <button
                  onClick={() => setBusca("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: 4
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Ordenador */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Ordenar por:</span>
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value)}
                style={{
                  padding: "8px 12px",
                  fontSize: 13.5,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  cursor: "pointer",
                  width: 220,
                  marginBottom: 0
                }}
              >
                <option value="data_desc">📅 Data (Mais recente primeiro)</option>
                <option value="data_asc">📅 Data (Mais antiga primeiro)</option>
                <option value="valor_desc">💵 Valor (Maior valor primeiro)</option>
                <option value="valor_asc">💵 Valor (Menor valor primeiro)</option>
                <option value="tipo_receita">🟢 Tipo (Entradas primeiro)</option>
                <option value="tipo_despesa">🔴 Tipo (Saídas primeiro)</option>
                <option value="alfa_asc">🔤 Ordem Alfabética (A-Z)</option>
                <option value="alfa_desc">🔤 Ordem Alfabética (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Listagem */}
          {transacoesExibidas.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
              Nenhum lançamento correspondente à pesquisa.
            </div>
          ) : (
            <div className="card" style={{ marginTop: 0 }}>
              <h2>
                {busca 
                  ? `${transacoesExibidas.length} correspondentes (de ${transacoes.length} pendentes)`
                  : `${transacoes.length} transações pendentes`
                }
              </h2>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoesExibidas.map((t) => {
                    const categoriasDoTipo = categorias.filter((c) => c.tipo === t.tipo);
                    // Ordena por frequência (quantidade de transações associadas)
                    const categoriasFrequentes = [...categoriasDoTipo]
                      .sort((a, b) => (b._count?.transacoes ?? 0) - (a._count?.transacoes ?? 0));
                    const catsEmpresa = categoriasFrequentes.filter(c => c.escopo === "EMPRESA" || !c.escopo);
                    const catsPessoal = categoriasFrequentes.filter(c => c.escopo === "PESSOAL");

                    return (
                      <tr key={t.id}>
                        <td>{new Date(t.data).toLocaleDateString("pt-BR")}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{resumirDescricao(t.descricaoOriginal)}</div>
                          {t.descricaoOriginal !== resumirDescricao(t.descricaoOriginal) && (
                            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{t.descricaoOriginal}</div>
                          )}
                          {t.importacao && (
                            <div style={{ display: "inline-block", fontSize: 10.5, color: "var(--text-muted)", marginTop: 6, background: "var(--surface)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 4 }}>
                              📄 {t.importacao.nomeArquivo}
                            </div>
                          )}
                          
                          {/* Botões de atalho para categorias mais frequentes */}
                          {categoriasFrequentes.length > 0 && (
                            <div className="category-split-container">
                              {/* Coluna Esquerda: Empresarial */}
                              <div className="category-column left">
                                <span className="category-column-title">Empresarial</span>
                                <div className="category-buttons-wrapper">
                                  {catsEmpresa.map((cat) => (
                                    <button
                                      key={cat.id}
                                      onClick={() => categorizar(t.id, cat.id)}
                                      className="category-btn business"
                                    >
                                      {cat.nome}
                                    </button>
                                  ))}
                                  {catsEmpresa.length === 0 && (
                                    <span style={{ fontSize: 10, color: "var(--text-faint)", fontStyle: "italic" }}>Nenhuma</span>
                                  )}
                                </div>
                              </div>

                              {/* Coluna Direita: Pessoal */}
                              <div className="category-column right">
                                <span className="category-column-title">Pessoal</span>
                                <div className="category-buttons-wrapper">
                                  {catsPessoal.map((cat) => (
                                    <button
                                      key={cat.id}
                                      onClick={() => categorizar(t.id, cat.id)}
                                      className="category-btn personal"
                                    >
                                      {cat.nome}
                                    </button>
                                  ))}
                                  {catsPessoal.length === 0 && (
                                    <span style={{ fontSize: 10, color: "var(--text-faint)", fontStyle: "italic" }}>Nenhuma</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className={t.tipo === "RECEITA" ? "value-positive" : "value-negative"}>
                          {t.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td>
                          <select defaultValue="" onChange={(e) => e.target.value && categorizar(t.id, e.target.value)}>
                            <option value="" disabled>Selecione...</option>
                            {categoriasDoTipo.filter(c => c.escopo === "EMPRESA" || !c.escopo).length > 0 && (
                              <optgroup label="Empresarial">
                                {categoriasDoTipo
                                  .filter(c => c.escopo === "EMPRESA" || !c.escopo)
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                  ))}
                              </optgroup>
                            )}
                            {categoriasDoTipo.filter(c => c.escopo === "PESSOAL").length > 0 && (
                              <optgroup label="Pessoal">
                                {categoriasDoTipo
                                  .filter(c => c.escopo === "PESSOAL")
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                  ))}
                              </optgroup>
                            )}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!carregando && transacoes.length === 0 && selectedCompany && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)" }}>
          <CheckCircle2 size={18} color="var(--green)" />
          Nenhuma transação pendente.
        </div>
      )}
    </div>
  );
}
