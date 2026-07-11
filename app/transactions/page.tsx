"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/lib/CompanyContext";
import { Loader2, ChevronLeft, ChevronRight, Edit2, Trash2, Check, X, Calendar, DollarSign, Wallet, ArrowDownCircle, ArrowUpCircle, Search } from "lucide-react";
import { resumirDescricao } from "@/lib/csv-parser";

interface Categoria {
  id: string;
  nome: string;
  tipo: "RECEITA" | "DESPESA";
  escopo: "EMPRESA" | "PESSOAL";
}

interface Transacao {
  id: string;
  data: string;
  descricaoOriginal: string;
  valor: number;
  tipo: "RECEITA" | "DESPESA";
  categoriaId: string | null;
  categoria?: Categoria | null;
}

export default function TransactionsPage() {
  const { selectedCompany } = useCompany();

  const [mesCalendario, setMesCalendario] = useState(() => new Date(2026, 6, 1));
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<"TODAS" | "RECEITA" | "DESPESA">("TODAS");
  const [buscaTermo, setBuscaTermo] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");

  // Estados de Edição Inline
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoData, setEditandoData] = useState("");
  const [editandoValor, setEditandoValor] = useState("");
  const [editandoCategoriaId, setEditandoCategoriaId] = useState("");
  const [editandoCatTransacaoId, setEditandoCatTransacaoId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCompany) {
      carregarDados();
    }
  }, [selectedCompany, mesCalendario]);

  async function carregarDados() {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const ano = mesCalendario.getFullYear();
      const mes = mesCalendario.getMonth();
      const dataInicioObj = new Date(ano, mes, 1);
      const dataFimObj = new Date(ano, mes + 1, 0);

      const params = new URLSearchParams({
        empresaId: selectedCompany.id,
        dataInicio: formatarDataISO(dataInicioObj),
        dataFim: formatarDataISO(dataFimObj),
      });

      // Busca transações
      const tResp = await fetch(`/api/transactions?${params.toString()}`);
      if (tResp.ok) {
        setTransacoes(await tResp.json());
      }

      // Busca categorias
      const cResp = await fetch(`/api/categories?empresaId=${selectedCompany.id}`);
      if (cResp.ok) {
        setCategorias(await cResp.json());
      }
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatarDataISO(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function formatarMoeda(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function voltarMes() {
    setMesCalendario((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  // Helper para formatar a data que vai no input Date (YYYY-MM-DD)
  function formatarParaInputDate(dataStr: string) {
    const d = new Date(dataStr);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function avancarMes() {
    setMesCalendario((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function obterNomeMes(data: Date) {
    const nome = data.toLocaleString("pt-BR", { month: "long" });
    return nome.charAt(0).toUpperCase() + nome.slice(1) + " " + data.getFullYear();
  }

  function obterMesesVizinhos(dataAtiva: Date) {
    const meses = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(dataAtiva.getFullYear(), dataAtiva.getMonth() + i, 1);
      meses.push(d);
    }
    return meses;
  }

  function obterNomeMesCurto(data: Date) {
    const nome = data.toLocaleString("pt-BR", { month: "short" });
    const ano = String(data.getFullYear()).slice(-2);
    const nomeLimpo = nome.replace(".", "");
    return `${nomeLimpo.charAt(0).toUpperCase() + nomeLimpo.slice(1)} ${ano}`;
  }

  // Ativa modo edição inline
  function iniciarEdicao(t: Transacao) {
    setEditandoId(t.id);
    setEditandoData(formatarParaInputDate(t.data));
    setEditandoValor(String(t.valor));
    setEditandoCategoriaId(t.categoriaId || "");
  }

  // Salva edição no banco
  async function salvarEdicao(id: string) {
    try {
      const resp = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor: parseFloat(editandoValor),
          data: editandoData,
          categoriaId: editandoCategoriaId || null,
        }),
      });

      if (resp.ok) {
        const atualizada = await resp.json();
        setTransacoes((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...atualizada } : t))
        );
        setEditandoId(null);
      }
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
    }
  }

  // Salva apenas a categoria alterada rapidamente
  async function salvarCategoriaRapido(t: Transacao, novaCategoriaId: string) {
    try {
      const resp = await fetch(`/api/transactions/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor: t.valor,
          data: formatarParaInputDate(t.data),
          categoriaId: novaCategoriaId || null,
        }),
      });

      if (resp.ok) {
        const atualizada = await resp.json();
        setTransacoes((prev) =>
          prev.map((item) => (item.id === t.id ? { ...item, ...atualizada } : item))
        );
      }
    } catch (error) {
      console.error("Erro ao salvar categoria rápida:", error);
    } finally {
      setEditandoCatTransacaoId(null);
    }
  }

  // Exclui transação
  async function excluirTransacao(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    try {
      const resp = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (resp.ok) {
        setTransacoes((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
    }
  }

  // Cálculos de KPI para o mês ativo
  const totalReceitasMes = transacoes
    .filter((t) => t.tipo === "RECEITA")
    .reduce((sum, t) => sum + t.valor, 0);

  const totalDespesasMes = transacoes
    .filter((t) => t.tipo === "DESPESA")
    .reduce((sum, t) => sum + Math.abs(t.valor), 0);

  const balancoMes = totalReceitasMes - totalDespesasMes;

  // Filtragem local por tipo e termo de busca
  const transacoesFiltradas = transacoes.filter((t) => {
    // 1. Filtrar por tipo
    if (filtroTipo !== "TODAS" && t.tipo !== filtroTipo) {
      return false;
    }

    // 2. Filtrar por categoria
    if (filtroCategoria !== "TODAS") {
      if (filtroCategoria === "NAO_CATEGORIZADA") {
        if (t.categoriaId !== null) return false;
      } else {
        if (t.categoriaId !== filtroCategoria) return false;
      }
    }

    // 2. Filtrar por termo de busca (case-insensitive)
    if (buscaTermo.trim()) {
      const termo = buscaTermo.toLowerCase().trim();
      
      const descOriginalMatches = t.descricaoOriginal.toLowerCase().includes(termo);
      const descResumidaMatches = resumirDescricao(t.descricaoOriginal).toLowerCase().includes(termo);
      const catMatches = t.categoria?.nome.toLowerCase().includes(termo) ?? false;
      const valorMatches = String(t.valor).includes(termo) || formatarMoeda(t.valor).toLowerCase().includes(termo);

      return descOriginalMatches || descResumidaMatches || catMatches || valorMatches;
    }

    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Transações</h1>
      </div>

      {/* KPI Cards de Resumo */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon blue"><Wallet size={20} /></div>
          <div>
            <div className="stat-label">Saldo do Mês</div>
            <div className={`stat-value ${balancoMes >= 0 ? "positive" : "negative"}`}>
              {formatarMoeda(balancoMes)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green"><ArrowUpCircle size={20} /></div>
          <div>
            <div className="stat-label">Receitas</div>
            <div className="stat-value positive">{formatarMoeda(totalReceitasMes)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red"><ArrowDownCircle size={20} /></div>
          <div>
            <div className="stat-label">Despesas</div>
            <div className="stat-value negative">{formatarMoeda(totalDespesasMes)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal"><Calendar size={20} /></div>
          <div>
            <div className="stat-label">Lançamentos</div>
            <div className="stat-value">{transacoes.length}</div>
          </div>
        </div>
      </div>

      {/* Seletor de Mês Otimizado */}
      <div className="card" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "16px 24px", marginBottom: 20, overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center", flexWrap: "nowrap" }}>
          
          {/* Seta Esquerda */}
          <button
            onClick={voltarMes}
            style={{
              padding: 8,
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "50%",
              color: "var(--purple-light)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-hover)";
              e.currentTarget.style.borderColor = "var(--purple)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Meses Vizinhos */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "4px 0", scrollbarWidth: "none" }}>
            {obterMesesVizinhos(mesCalendario).map((d, index) => {
              const isAtivo = d.getFullYear() === mesCalendario.getFullYear() && d.getMonth() === mesCalendario.getMonth();
              return (
                <button
                  key={index}
                  onClick={() => setMesCalendario(d)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: isAtivo ? "2px solid var(--purple)" : "1px solid var(--border)",
                    background: isAtivo ? "rgba(124, 92, 252, 0.12)" : "transparent",
                    color: isAtivo ? "var(--purple-light)" : "var(--text-muted)",
                    fontWeight: isAtivo ? "bold" : "500",
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    minWidth: 80,
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (!isAtivo) {
                      e.currentTarget.style.color = "var(--text)";
                      e.currentTarget.style.borderColor = "var(--text-muted)";
                      e.currentTarget.style.background = "var(--surface-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAtivo) {
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {obterNomeMesCurto(d)}
                </button>
              );
            })}
          </div>

          {/* Seta Direita */}
          <button
            onClick={avancarMes}
            style={{
              padding: 8,
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "50%",
              color: "var(--purple-light)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-hover)";
              e.currentTarget.style.borderColor = "var(--purple)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <ChevronRight size={18} />
          </button>

        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        {/* Pills de Filtragem de Tipo */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", padding: 4, borderRadius: 8, border: "1px solid var(--border)" }}>
          <button
            onClick={() => setFiltroTipo("TODAS")}
            style={{
              padding: "6px 14px",
              background: filtroTipo === "TODAS" ? "var(--purple)" : "transparent",
              color: filtroTipo === "TODAS" ? "#fff" : "var(--text-muted)",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12.5,
              transition: "all 0.15s ease",
            }}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltroTipo("RECEITA")}
            style={{
              padding: "6px 14px",
              background: filtroTipo === "RECEITA" ? "rgba(16, 185, 129, 0.15)" : "transparent",
              color: filtroTipo === "RECEITA" ? "var(--green)" : "var(--text-muted)",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12.5,
              transition: "all 0.15s ease",
            }}
          >
            Receitas
          </button>
          <button
            onClick={() => setFiltroTipo("DESPESA")}
            style={{
              padding: "6px 14px",
              background: filtroTipo === "DESPESA" ? "rgba(239, 68, 68, 0.15)" : "transparent",
              color: filtroTipo === "DESPESA" ? "var(--red)" : "var(--text-muted)",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12.5,
              transition: "all 0.15s ease",
            }}
          >
            Despesas
          </button>
        </div>

        {/* Filtro de Categoria */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{
              margin: 0,
              padding: "6px 12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              height: "38px",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            <option value="TODAS">Todas as categorias</option>
            <option value="NAO_CATEGORIZADA">Não categorizadas</option>
            <optgroup label="Empresarial">
              {categorias
                .filter((c) => c.escopo === "EMPRESA")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Pessoal">
              {categorias
                .filter((c) => c.escopo === "PESSOAL")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        {/* Barra de Pesquisa */}
        <div style={{ position: "relative", flex: 1, minWidth: "200px", maxWidth: "400px" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Buscar transações..."
            value={buscaTermo}
            onChange={(e) => setBuscaTermo(e.target.value)}
            style={{
              margin: 0,
              padding: "8px 12px 8px 36px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              width: "100%",
              height: "38px",
            }}
          />
          {buscaTermo && (
            <button
              type="button"
              onClick={() => setBuscaTermo("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 0,
                width: 22,
                height: 22,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X size={14} style={{ margin: 0 }} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 40, color: "var(--text-muted)" }}>
          <Loader2 className="animate-spin" size={20} />
          Carregando transações do período...
        </div>
      ) : transacoesFiltradas.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
          Nenhum lançamento encontrado para o filtro selecionado neste mês.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.01)" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>Data</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>Descrição</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>Categoria</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>Valor</th>
                <th style={{ textAlign: "center", padding: "12px 16px", fontSize: 13, color: "var(--text-muted)", width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.map((t) => (
                <tr
                  key={t.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: editandoId === t.id ? "rgba(124, 92, 252, 0.04)" : "transparent",
                  }}
                >
                  {/* DATA */}
                  <td style={{ padding: "14px 16px", whiteSpace: "nowrap", fontSize: 13.5 }}>
                    {editandoId === t.id ? (
                      <input
                        type="date"
                        value={editandoData}
                        onChange={(e) => setEditandoData(e.target.value)}
                        style={{ marginBottom: 0, padding: "4px 8px", fontSize: 12.5 }}
                      />
                    ) : (
                      new Date(t.data).toLocaleDateString("pt-BR")
                    )}
                  </td>

                  {/* DESCRIÇÃO */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)" }}>
                      {resumirDescricao(t.descricaoOriginal)}
                    </div>
                    {t.descricaoOriginal !== resumirDescricao(t.descricaoOriginal) && (
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2, wordBreak: "break-word" }}>
                        {t.descricaoOriginal}
                      </div>
                    )}
                  </td>

                  {/* CATEGORIA */}
                  <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                    {editandoId === t.id ? (
                      <select
                        value={editandoCategoriaId}
                        onChange={(e) => setEditandoCategoriaId(e.target.value)}
                        style={{ marginBottom: 0, padding: "4px 8px", fontSize: 12.5 }}
                      >
                        <option value="">Não categorizada</option>
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} ({c.tipo === "RECEITA" ? "Receita" : "Despesa"} - {c.escopo === "PESSOAL" ? "Pessoal" : "Empresa"})
                          </option>
                        ))}
                      </select>
                    ) : editandoCatTransacaoId === t.id ? (
                      <select
                        value={t.categoriaId || ""}
                        autoFocus
                        onBlur={() => setEditandoCatTransacaoId(null)}
                        onChange={(e) => salvarCategoriaRapido(t, e.target.value)}
                        style={{ marginBottom: 0, padding: "4px 8px", fontSize: 12.5 }}
                      >
                        <option value="">Não categorizada</option>
                        <optgroup label="Empresarial">
                          {categorias
                            .filter((c) => c.escopo === "EMPRESA")
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Pessoal">
                          {categorias
                            .filter((c) => c.escopo === "PESSOAL")
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    ) : (
                      <div 
                        onClick={() => setEditandoCatTransacaoId(t.id)}
                        style={{ 
                          display: "inline-flex", 
                          alignItems: "center", 
                          gap: 8, 
                          cursor: "pointer", 
                          padding: "6px 10px", 
                          borderRadius: 6, 
                          transition: "all 0.15s ease",
                          marginLeft: -10
                        }}
                        className="quick-edit-category"
                        title="Clique para alterar a categoria rapidamente"
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: t.categoria
                              ? t.categoria.escopo === "PESSOAL"
                                ? "#F59E0B"
                                : "var(--purple-light)"
                              : "var(--text-faint)",
                          }}
                        />
                        <span 
                          style={{ 
                            fontSize: 13.5, 
                            color: t.categoria ? "var(--text)" : "var(--text-muted)",
                            borderBottom: "1px dashed transparent",
                            transition: "border-color 0.15s ease",
                            display: "inline-block"
                          }}
                          className="quick-edit-category-name"
                        >
                          {t.categoria ? t.categoria.nome : "Não categorizada"}
                        </span>
                        {t.categoria && (
                          <span
                            style={{
                              fontSize: 9.5,
                              padding: "1px 5px",
                              borderRadius: 4,
                              fontWeight: 600,
                              background: t.categoria.escopo === "PESSOAL" ? "rgba(245, 158, 11, 0.12)" : "rgba(124, 92, 252, 0.12)",
                              color: t.categoria.escopo === "PESSOAL" ? "#F59E0B" : "var(--purple-light)",
                            }}
                          >
                            {t.categoria.escopo === "PESSOAL" ? "Pessoal" : "Empresa"}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* VALOR */}
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      fontWeight: 700,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                    }}
                    className={t.tipo === "RECEITA" ? "value-positive" : "value-negative"}
                  >
                    {editandoId === t.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editandoValor}
                        onChange={(e) => setEditandoValor(e.target.value)}
                        style={{ marginBottom: 0, padding: "4px 8px", fontSize: 12.5, width: 100, textAlign: "right" }}
                      />
                    ) : (
                      formatarMoeda(t.valor)
                    )}
                  </td>

                  {/* AÇÕES */}
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      {editandoId === t.id ? (
                        <>
                          <button
                            onClick={() => salvarEdicao(t.id)}
                            style={{ padding: 6, background: "var(--green)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Salvar"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditandoId(null)}
                            style={{
                              padding: 6,
                              background: "var(--surface-hover)",
                              border: "1px solid var(--border)",
                              color: "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => iniciarEdicao(t)}
                            style={{
                              padding: 6,
                              background: "var(--surface-hover)",
                              border: "1px solid var(--border)",
                              color: "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => excluirTransacao(t.id)}
                            style={{
                              padding: 6,
                              background: "rgba(239, 68, 68, 0.12)",
                              border: "none",
                              color: "var(--red)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
