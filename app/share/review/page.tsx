"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Check } from "lucide-react";
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

function ShareReviewContent() {
  const searchParams = useSearchParams();
  const empresaId = searchParams.get("id");

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Estados do Modal de Criação de Categoria
  const [modalAberto, setModalAberto] = useState(false);
  const [novaNome, setNovaNome] = useState("");
  const [novaTipo, setNovaTipo] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [novaEscopo, setNovaEscopo] = useState<"EMPRESA" | "PESSOAL">("EMPRESA");
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [criandoCat, setCriandoCat] = useState(false);

  // Filtros e ordenação
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState("data_desc");

  async function salvarCategoria() {
    if (!novaNome.trim()) {
      setErroModal("Por favor, digite o nome da categoria.");
      return;
    }
    setCriandoCat(true);
    setErroModal(null);
    try {
      const resp = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novaNome.trim(),
          tipo: novaTipo,
          escopo: novaEscopo,
          empresaId,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        setErroModal(errData.erro || "Erro ao criar categoria.");
        setCriandoCat(false);
        return;
      }

      const novaCat = await resp.json();
      
      // Adiciona na lista local de categorias
      setCategorias((prev) => [...prev, {
        id: novaCat.id,
        nome: novaCat.nome,
        tipo: novaCat.tipo,
        escopo: novaCat.escopo,
        _count: { transacoes: 0 }
      }]);

      setFeedback(`Categoria "${novaCat.nome}" criada com sucesso!`);
      setTimeout(() => setFeedback(null), 2500);

      // Fecha modal e limpa form
      setModalAberto(false);
      setNovaNome("");
      setNovaTipo("DESPESA");
      setNovaEscopo("EMPRESA");
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      setErroModal("Erro de conexão ao criar categoria.");
    } finally {
      setCriandoCat(false);
    }
  }

  useEffect(() => {
    if (empresaId) {
      carregar();
    }
  }, [empresaId]);

  async function carregar() {
    setCarregando(true);
    try {
      const resp = await fetch(`/api/transactions/pending?empresaId=${empresaId}`);
      const dados = await resp.json();
      setTransacoes(dados.transacoes ?? []);
      setCategorias(dados.categorias ?? []);
      setNomeEmpresa(dados.nomeEmpresa ?? "Empresa");
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    } finally {
      setCarregando(false);
    }
  }

  async function categorizar(transacaoId: string, categoriaId: string, categoriaNome: string) {
    try {
      await fetch(`/api/transactions/${transacaoId}/categorize-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoriaId, criarRegra: true }),
      });
      setFeedback(`Classificado como "${categoriaNome}"!`);
      setTimeout(() => setFeedback(null), 2500);

      setTransacoes((atual) => atual.filter((t) => t.id !== transacaoId));
    } catch (error) {
      console.error("Erro ao categorizar transação:", error);
    }
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

  if (!empresaId) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
        <h2>Link inválido ou incompleto.</h2>
        <p>Verifique o link enviado pelo seu consultor.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 80px 16px" }}>
      {/* Cabeçalho prêmio mobile */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={{ textAlign: "left" }}>
          <h1 style={{ fontSize: 24, letterSpacing: "-0.02em", margin: 0 }}>
            diagnóstico<span style={{ color: "var(--purple-light)" }}>.</span>
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
            Categorização de Lançamentos de <strong style={{ color: "var(--text)" }}>{nomeEmpresa}</strong>
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          style={{
            padding: "8px 14px",
            fontSize: 12.5,
            background: "var(--purple)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: "0 2px 4px rgba(124, 92, 252, 0.2)",
            whiteSpace: "nowrap"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--purple-dark)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--purple)"}
        >
          + Nova Categoria
        </button>
      </header>

      {feedback && (
        <div style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--purple)",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: 30,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          zIndex: 9999,
        }}>
          <Check size={16} />
          {feedback}
        </div>
      )}

      {carregando && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", padding: 40, color: "var(--text-muted)" }}>
          <Loader2 className="animate-spin" size={24} style={{ color: "var(--purple)" }} />
          <span>Buscando transações pendentes...</span>
        </div>
      )}

      {!carregando && transacoes.length > 0 && (
        <div>
          {/* Barra de Filtros e Pesquisa */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "var(--surface)",
            padding: 16,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            marginBottom: 20
          }}>
            {/* Campo de Pesquisa */}
            <div style={{ display: "flex", width: "100%", position: "relative" }}>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar por palavra-chave..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Ordenar por:</span>
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value)}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  cursor: "pointer",
                  flex: 1,
                  minWidth: 180,
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

          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Olá! Ajude-nos classificando estas transações:
            </span>
            <span style={{
              background: "rgba(124, 92, 252, 0.15)",
              color: "var(--purple-light)",
              padding: "2px 8px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700
            }}>
              {busca 
                ? `${transacoesExibidas.length} correspondentes (de ${transacoes.length} pendentes)`
                : `${transacoes.length} pendentes`
              }
            </span>
          </div>

          {transacoesExibidas.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
              Nenhum lançamento correspondente à pesquisa.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {transacoesExibidas.map((t) => {
              const categoriasDoTipo = categorias.filter((c) => c.tipo === t.tipo);
              const categoriasFrequentes = [...categoriasDoTipo]
                .sort((a, b) => (b._count?.transacoes ?? 0) - (a._count?.transacoes ?? 0));
              const catsEmpresa = categoriasFrequentes.filter(c => c.escopo === "EMPRESA" || !c.escopo);
              const catsPessoal = categoriasFrequentes.filter(c => c.escopo === "PESSOAL");

              return (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 500 }}>
                      {new Date(t.data).toLocaleDateString("pt-BR")}
                    </span>
                    <strong style={{
                      fontSize: 16,
                      color: t.tipo === "RECEITA" ? "var(--green)" : "var(--text)"
                    }}>
                      {t.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </strong>
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text)" }}>
                      {resumirDescricao(t.descricaoOriginal)}
                    </div>
                    {t.descricaoOriginal !== resumirDescricao(t.descricaoOriginal) && (
                      <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2, wordBreak: "break-word" }}>
                        {t.descricaoOriginal}
                      </div>
                    )}
                    {t.importacao && (
                      <div style={{ display: "inline-block", fontSize: 10.5, color: "var(--text-muted)", marginTop: 6, background: "var(--surface)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 4 }}>
                        📄 {t.importacao.nomeArquivo}
                      </div>
                    )}
                  </div>

                  {categoriasFrequentes.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                        Selecione a categoria:
                      </span>
                      <div className="category-split-container">
                        {/* Column Left: Business */}
                        <div className="category-column left">
                          <span className="category-column-title">Empresarial</span>
                          <div className="category-buttons-wrapper">
                            {catsEmpresa.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => categorizar(t.id, cat.id, cat.nome)}
                                className="category-btn business"
                              >
                                {cat.nome}
                              </button>
                            ))}
                            {catsEmpresa.length === 0 && (
                              <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontStyle: "italic" }}>
                                Nenhuma
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Column Right: Personal */}
                        <div className="category-column right">
                          <span className="category-column-title">Pessoal</span>
                          <div className="category-buttons-wrapper">
                            {catsPessoal.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => categorizar(t.id, cat.id, cat.nome)}
                                className="category-btn personal"
                              >
                                {cat.nome}
                              </button>
                            ))}
                            {catsPessoal.length === 0 && (
                              <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontStyle: "italic" }}>
                                Nenhuma
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      Mais opções:
                    </span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const catObj = categoriasDoTipo.find(c => c.id === val);
                          categorizar(t.id, val, catObj?.nome ?? "Categoria");
                        }
                      }}
                      style={{ marginBottom: 0, padding: "4px 8px", fontSize: 12.5 }}
                    >
                      <option value="" disabled>Escolha outra...</option>
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {!carregando && transacoes.length === 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 32, textAlign: "center" }}>
          <CheckCircle2 size={36} color="var(--green)" />
          <div>
            <h3 style={{ margin: 0, color: "var(--text)" }}>Tudo concluído!</h3>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13.5 }}>
              Nenhuma transação pendente de categorização para esta empresa. Obrigado!
            </p>
          </div>
        </div>
      )}
      {/* Modal Nova Categoria */}
      {modalAberto && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 16
        }}>
          <div className="card" style={{
            width: "100%",
            maxWidth: 400,
            padding: 24,
            border: "1px solid var(--border)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Nova Categoria</h3>
            
            {erroModal && (
              <div style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 6, color: "var(--red)", fontSize: 13 }}>
                {erroModal}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Nome da Categoria</label>
              <input
                type="text"
                placeholder="Ex: Combustível, Softwares..."
                value={novaNome}
                onChange={(e) => setNovaNome(e.target.value)}
                style={{
                  padding: "8px 12px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 14,
                  color: "var(--text)",
                  width: "100%",
                  margin: 0
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Fluxo</label>
                <select
                  value={novaTipo}
                  onChange={(e) => setNovaTipo(e.target.value as any)}
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 14,
                    color: "var(--text)",
                    width: "100%",
                    marginBottom: 0
                  }}
                >
                  <option value="DESPESA">Saída (Despesa)</option>
                  <option value="RECEITA">Entrada (Receita)</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Escopo</label>
                <select
                  value={novaEscopo}
                  onChange={(e) => setNovaEscopo(e.target.value as any)}
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 14,
                    color: "var(--text)",
                    width: "100%",
                    marginBottom: 0
                  }}
                >
                  <option value="EMPRESA">Empresarial</option>
                  <option value="PESSOAL">Pessoal / Sócio</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setModalAberto(false);
                  setErroModal(null);
                  setNovaNome("");
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={criandoCat}
                onClick={salvarCategoria}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--purple)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--purple-dark)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "var(--purple)"}
              >
                {criandoCat ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShareReviewPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--purple)" }} />
      </div>
    }>
      <ShareReviewContent />
    </Suspense>
  );
}
