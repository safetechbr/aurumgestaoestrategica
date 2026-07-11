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
        <div className="card">
          <h2>{transacoes.length} transações pendentes</h2>
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
              {transacoes.map((t) => {
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

      {!carregando && transacoes.length === 0 && selectedCompany && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)" }}>
          <CheckCircle2 size={18} color="var(--green)" />
          Nenhuma transação pendente.
        </div>
      )}
    </div>
  );
}
