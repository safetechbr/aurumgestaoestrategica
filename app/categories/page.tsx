"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/lib/CompanyContext";
import { Plus, Edit2, Trash2, Check, X, Loader2, RefreshCw } from "lucide-react";

interface Categoria {
  id: string;
  nome: string;
  tipo: "RECEITA" | "DESPESA";
  escopo: "EMPRESA" | "PESSOAL";
}

export default function CategoriesPage() {
  const { selectedCompany } = useCompany();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Estados para nova categoria
  const [nomeNova, setNomeNova] = useState("");
  const [tipoNova, setTipoNova] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [escopoNova, setEscopoNova] = useState<"EMPRESA" | "PESSOAL">("EMPRESA");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Estados para edição inline
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState("");
  const [editandoTipo, setEditandoTipo] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [editandoEscopo, setEditandoEscopo] = useState<"EMPRESA" | "PESSOAL">("EMPRESA");

  useEffect(() => {
    if (selectedCompany) {
      carregarCategorias();
    }
  }, [selectedCompany]);

  async function carregarCategorias() {
    if (!selectedCompany) return;
    setCarregando(true);
    setErro("");
    try {
      const resp = await fetch(`/api/categories?empresaId=${selectedCompany.id}`);
      if (resp.ok) {
        const dados = await resp.json();
        setCategorias(dados);
      } else {
        setErro("Não foi possível carregar as categorias.");
      }
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      setErro("Erro de conexão ao buscar categorias.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeNova.trim() || !selectedCompany) return;

    setSalvando(true);
    setErro("");
    try {
      const resp = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeNova,
          tipo: tipoNova,
          escopo: escopoNova,
          empresaId: selectedCompany.id,
        }),
      });

      const dados = await resp.json();
      if (resp.ok) {
        setCategorias((prev) => [...prev, dados].sort((a, b) => a.nome.localeCompare(b.nome)));
        setNomeNova("");
        setEscopoNova("EMPRESA");
      } else {
        setErro(dados.erro ?? "Erro ao criar categoria.");
      }
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      setErro("Erro de conexão ao criar categoria.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(cat: Categoria) {
    setEditandoId(cat.id);
    setEditandoNome(cat.nome);
    setEditandoTipo(cat.tipo);
    setEditandoEscopo(cat.escopo ?? "EMPRESA");
  }

  async function salvarEdicao(id: string) {
    if (!editandoNome.trim()) return;

    setErro("");
    try {
      const resp = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editandoNome,
          tipo: editandoTipo,
          escopo: editandoEscopo,
        }),
      });

      const dados = await resp.json();
      if (resp.ok) {
        setCategorias((prev) =>
          prev
            .map((c) => (c.id === id ? dados : c))
            .sort((a, b) => a.nome.localeCompare(b.nome))
        );
        setEditandoId(null);
      } else {
        setErro(dados.erro ?? "Erro ao salvar alterações.");
      }
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      setErro("Erro de conexão ao salvar alterações.");
    }
  }

  async function excluirCategoria(id: string, nome: string) {
    const confirmacao = confirm(
      `Tem certeza que deseja excluir a categoria "${nome}"?\n\n` +
      `Isso irá desassociar transações antigas e apagar as regras automáticas vinculadas a ela.`
    );
    if (!confirmacao) return;

    setErro("");
    try {
      const resp = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (resp.ok) {
        setCategorias((prev) => prev.filter((c) => c.id !== id));
      } else {
        const dados = await resp.json();
        setErro(dados.erro ?? "Erro ao excluir categoria.");
      }
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      setErro("Erro de conexão ao excluir categoria.");
    }
  }

  const receitasEmpresa = categorias.filter((c) => c.tipo === "RECEITA" && c.escopo !== "PESSOAL");
  const despesasEmpresa = categorias.filter((c) => c.tipo === "DESPESA" && c.escopo !== "PESSOAL");
  const receitasPessoal = categorias.filter((c) => c.tipo === "RECEITA" && c.escopo === "PESSOAL");
  const despesasPessoal = categorias.filter((c) => c.tipo === "DESPESA" && c.escopo === "PESSOAL");

  function renderCategoryRow(c: Categoria) {
    return (
      <div
        key={c.id}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 10px",
          borderBottom: "1px solid var(--border)",
          background: editandoId === c.id ? "rgba(124, 92, 252, 0.05)" : "transparent",
        }}
      >
        {editandoId === c.id ? (
          <div style={{ display: "flex", gap: 6, flexGrow: 1, marginRight: 12 }}>
            <input
              value={editandoNome}
              onChange={(e) => setEditandoNome(e.target.value)}
              style={{ marginBottom: 0, padding: "4px 8px", fontSize: 12.5 }}
            />
            <select
              value={editandoTipo}
              onChange={(e) => setEditandoTipo(e.target.value as "RECEITA" | "DESPESA")}
              style={{ marginBottom: 0, padding: "4px 8px", fontSize: 12.5, width: 85 }}
            >
              <option value="RECEITA">Receita</option>
              <option value="DESPESA">Despesa</option>
            </select>
            <select
              value={editandoEscopo}
              onChange={(e) => setEditandoEscopo(e.target.value as "EMPRESA" | "PESSOAL")}
              style={{ marginBottom: 0, padding: "4px 8px", fontSize: 12.5, width: 90 }}
            >
              <option value="EMPRESA">Empresa</option>
              <option value="PESSOAL">Pessoal</option>
            </select>
          </div>
        ) : (
          <span style={{ fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            {c.nome}
          </span>
        )}

        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {editandoId === c.id ? (
            <>
              <button
                onClick={() => salvarEdicao(c.id)}
                style={{ padding: 4, background: "var(--green)" }}
                title="Salvar"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => setEditandoId(null)}
                style={{ padding: 4, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                title="Cancelar"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => iniciarEdicao(c)}
                style={{ padding: 4, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                title="Editar"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => excluirCategoria(c.id, c.nome)}
                style={{ padding: 4, background: "rgba(239, 68, 68, 0.15)", color: "var(--red)" }}
                title="Excluir"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h1>Gerenciar Categorias</h1>
          <p className="subtitle">
            Defina e edite o plano de contas da empresa: <strong style={{ color: "var(--text)" }}>{selectedCompany?.nome}</strong>
          </p>
        </div>
        <button
          onClick={carregarCategorias}
          disabled={carregando}
          style={{
            padding: 8,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Recarregar lista"
        >
          <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />
        </button>
      </div>

      {erro && (
        <div className="card alert-error" style={{ marginBottom: 20 }}>
          <strong style={{ color: "var(--red)" }}>Erro:</strong> {erro}
        </div>
      )}

      <div className="grid-layout two-cols-right-heavy" style={{ alignItems: "start" }}>
        {/* Formulário de criação */}
        <div className="card">
          <h2>Nova Categoria</h2>
          <form onSubmit={handleCriar}>
            <label>Nome da categoria</label>
            <input
              value={nomeNova}
              onChange={(e) => setNomeNova(e.target.value)}
              placeholder="Ex: Alimentação, Vendas"
              required
              disabled={salvando}
            />

            <label>Tipo</label>
            <select
              value={tipoNova}
              onChange={(e) => setTipoNova(e.target.value as "RECEITA" | "DESPESA")}
              disabled={salvando}
            >
              <option value="DESPESA">Despesa (Saída)</option>
              <option value="RECEITA">Receita (Entrada)</option>
            </select>

            <label>Escopo da Categoria</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setEscopoNova("EMPRESA")}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: escopoNova === "EMPRESA" ? "var(--purple)" : "var(--surface)",
                  border: escopoNova === "EMPRESA" ? "1px solid var(--purple)" : "1px solid var(--border)",
                  color: escopoNova === "EMPRESA" ? "#fff" : "var(--text-muted)",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                🏢 Empresa
              </button>
              <button
                type="button"
                onClick={() => setEscopoNova("PESSOAL")}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: escopoNova === "PESSOAL" ? "var(--purple)" : "var(--surface)",
                  border: escopoNova === "PESSOAL" ? "1px solid var(--purple)" : "1px solid var(--border)",
                  color: escopoNova === "PESSOAL" ? "#fff" : "var(--text-muted)",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                👤 Pessoal
              </button>
            </div>

            <button type="submit" style={{ width: "100%", marginTop: 8 }} disabled={salvando}>
              {salvando ? "Salvando..." : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Plus size={16} />
                  Adicionar
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Listagem em Duas Colunas (Empresarial vs Pessoal) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {carregando && categorias.length === 0 ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 20, color: "var(--text-muted)" }}>
              <Loader2 className="animate-spin" size={18} style={{ color: "var(--purple)" }} />
              Carregando plano de contas...
            </div>
          ) : (
            <div className="category-split-container">
              {/* COLUNA ESQUERDA: EMPRESARIAL */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h3 className="column-title business">
                  <span>🏢 Empresarial</span>
                </h3>
                
                {/* Receitas Empresariais */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <h4 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0, fontSize: 13.5 }}>
                    <span>Receitas (Entradas)</span>
                    <span className="badge green">{receitasEmpresa.length}</span>
                  </h4>
                  {receitasEmpresa.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: "10px 0 0" }}>Nenhuma receita cadastrada.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
                      {receitasEmpresa.map((c) => renderCategoryRow(c))}
                    </div>
                  )}
                </div>

                {/* Despesas Empresariais */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <h4 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0, fontSize: 13.5 }}>
                    <span>Despesas (Saídas)</span>
                    <span className="badge red">{despesasEmpresa.length}</span>
                  </h4>
                  {despesasEmpresa.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: "10px 0 0" }}>Nenhuma despesa cadastrada.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
                      {despesasEmpresa.map((c) => renderCategoryRow(c))}
                    </div>
                  )}
                </div>
              </div>

              {/* COLUNA DIREITA: PESSOAL */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h3 className="column-title personal">
                  <span>👤 Pessoal</span>
                </h3>
                
                {/* Receitas Pessoais */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <h4 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0, fontSize: 13.5 }}>
                    <span>Receitas (Entradas)</span>
                    <span className="badge green">{receitasPessoal.length}</span>
                  </h4>
                  {receitasPessoal.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: "10px 0 0" }}>Nenhuma receita cadastrada.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
                      {receitasPessoal.map((c) => renderCategoryRow(c))}
                    </div>
                  )}
                </div>

                {/* Despesas Pessoais */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <h4 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0, fontSize: 13.5 }}>
                    <span>Despesas (Saídas)</span>
                    <span className="badge red">{despesasPessoal.length}</span>
                  </h4>
                  {despesasPessoal.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: "10px 0 0" }}>Nenhuma despesa cadastrada.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
                      {despesasPessoal.map((c) => renderCategoryRow(c))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
