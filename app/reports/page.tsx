"use client";

import { useEffect, useState } from "react";
import { Building2, TrendingUp, TrendingDown, Scale, Loader2, PieChart, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useCompany } from "@/lib/CompanyContext";

const CORES_PALETA = [
  "#7C5CFC", // Purple
  "#10B981", // Emerald
  "#EF4444", // Red
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#8B5CF6", // Violet
  "#6366F1", // Indigo
  "#06B6D4", // Cyan
];

interface CategoriaItem {
  categoria: string;
  tipo: "RECEITA" | "DESPESA";
  escopo: "EMPRESA" | "PESSOAL";
  total: number;
  quantidade: number;
}

interface MensalItem {
  mesAno: string;
  receitas: number;
  despesas: number;
}

export default function ReportsPage() {
  const { selectedCompany } = useCompany();
  
  // Data de referência padrão: Julho 2026 para corresponder às sementes de teste
  const [mesReferencia, setMesReferencia] = useState(() => new Date(2026, 6, 1));
  const [relatorio, setRelatorio] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);

  // Controle de abas
  const [abaAtiva, setAbaAtiva] = useState<"PIZZA" | "BARRAS">("PIZZA");
  const [tipoFiltroPizza, setTipoFiltroPizza] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [visaoFiltro, setVisaoFiltro] = useState<"PJ" | "PF" | "CONFUSAO">("PJ");


  useEffect(() => {
    if (selectedCompany) {
      gerarRelatorio();
    } else {
      setRelatorio(null);
    }
  }, [selectedCompany, mesReferencia, abaAtiva]);

  function formatarDataISO(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  async function gerarRelatorio() {
    if (!selectedCompany) return;
    setCarregando(true);
    try {
      const isPizza = abaAtiva === "PIZZA";
      const dataInicioObj = isPizza
        ? new Date(mesReferencia.getFullYear(), mesReferencia.getMonth(), 1)
        : new Date(mesReferencia.getFullYear(), mesReferencia.getMonth() - 5, 1);
      
      const dataFimObj = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth() + 1, 0);

      const params = new URLSearchParams({
        empresaId: selectedCompany.id,
        dataInicio: formatarDataISO(dataInicioObj),
        dataFim: formatarDataISO(dataFimObj),
      });

      const resp = await fetch(`/api/reports?${params.toString()}`);
      if (resp.ok) {
        setRelatorio(await resp.json());
      }
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
    } finally {
      setCarregando(false);
    }
  }

  function voltarMes() {
    setMesReferencia((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function avancarMes() {
    setMesReferencia((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function obterNomeMes(data: Date) {
    const nome = data.toLocaleString("pt-BR", { month: "long" });
    return nome.charAt(0).toUpperCase() + nome.slice(1);
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

  function formatarMoeda(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatarMesAnoExtenso(mesAno: string) {
    const [ano, mes] = mesAno.split("-");
    const data = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    const nomeMes = data.toLocaleString("pt-BR", { month: "long" });
    return nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) + " " + ano;
  }

  function formatarMesAnoAbreviado(mesAno: string) {
    const [ano, mes] = mesAno.split("-");
    const data = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    const m = data.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
    return m.charAt(0).toUpperCase() + m.slice(1);
  }

  // --- Processamento dos dados de Pizza (Donut) ---
  const categoriasEmpresa = relatorio
    ? relatorio.porCategoria.filter((c: any) => c.tipo === tipoFiltroPizza && c.escopo === "EMPRESA")
    : [];

  const categoriasPessoal = relatorio
    ? relatorio.porCategoria.filter((c: any) => c.tipo === tipoFiltroPizza && c.escopo === "PESSOAL")
    : [];

  const totalEmpresa = categoriasEmpresa.reduce((sum: number, c: any) => sum + c.total, 0);
  const totalPessoal = categoriasPessoal.reduce((sum: number, c: any) => sum + c.total, 0);

  // Calcula segmentos da pizza de Empresa
  let acumuladoEmpresa = 0;
  const segmentosEmpresa = categoriasEmpresa.map((c: any, index: number) => {
    const percent = totalEmpresa > 0 ? c.total / totalEmpresa : 0;
    const strokeDash = percent * 440;
    const strokeOffset = -acumuladoEmpresa * 440;
    acumuladoEmpresa += percent;

    return {
      ...c,
      percent,
      strokeDash: `${strokeDash} ${440 - strokeDash}`,
      strokeOffset,
      cor: CORES_PALETA[index % CORES_PALETA.length],
    };
  });

  // Calcula segmentos da pizza de Pessoal
  let acumuladoPessoal = 0;
  const segmentosPessoal = categoriasPessoal.map((c: any, index: number) => {
    const percent = totalPessoal > 0 ? c.total / totalPessoal : 0;
    const strokeDash = percent * 440;
    const strokeOffset = -acumuladoPessoal * 440;
    acumuladoPessoal += percent;

    return {
      ...c,
      percent,
      strokeDash: `${strokeDash} ${440 - strokeDash}`,
      strokeOffset,
      cor: CORES_PALETA[index % CORES_PALETA.length],
    };
  });

  // --- Processamento dos dados de Barras ---
  const dadosMensais: MensalItem[] = relatorio?.porMes ?? [];
  const maxValorMensal = dadosMensais.length > 0
    ? Math.max(...dadosMensais.map((d: any) => Math.max(d.receitas, d.despesas)))
    : 1;

  // --- Processamento para Confusão Patrimonial ---
  const totalDespesasEmpresaReal = relatorio?.resumo?.totalDespesasEmpresa ?? 0;
  const confusaoPatrimonial = relatorio?.resumo?.confusaoPatrimonial ?? 0;
  const totalSaidasPJ = totalDespesasEmpresaReal + confusaoPatrimonial;
  const indiceConfusao = totalSaidasPJ > 0
    ? ((confusaoPatrimonial / totalSaidasPJ) * 100).toFixed(1)
    : "0.0";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1>Relatórios</h1>
          <p className="subtitle">
            Empresa ativa: <strong style={{ color: "var(--text)" }}>{selectedCompany?.nome}</strong>. Diagnóstico consolidado de contas.
          </p>
        </div>

        {/* Menu de Abas */}
        {visaoFiltro !== "CONFUSAO" && (
          <div style={{ display: "flex", gap: 4, background: "var(--surface)", padding: 4, borderRadius: 8, border: "1px solid var(--border)" }}>
            <button
              onClick={() => setAbaAtiva("PIZZA")}
              style={{
                padding: "6px 12px",
                background: abaAtiva === "PIZZA" ? "var(--purple)" : "transparent",
                color: abaAtiva === "PIZZA" ? "#fff" : "var(--text-muted)",
                borderRadius: 6,
                display: "flex",
                gap: 6,
                alignItems: "center",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              <PieChart size={14} />
              Pizza
            </button>
            <button
              onClick={() => setAbaAtiva("BARRAS")}
              style={{
                padding: "6px 12px",
                background: abaAtiva === "BARRAS" ? "var(--purple)" : "transparent",
                color: abaAtiva === "BARRAS" ? "#fff" : "var(--text-muted)",
                borderRadius: 6,
                display: "flex",
                gap: 6,
                alignItems: "center",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              <BarChart3 size={14} />
              Barras
            </button>
          </div>
        )}
      </div>

      {/* Seletor de Visão: PJ, PF, Confusão Patrimonial */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12, overflowX: "auto" }}>
        <button
          onClick={() => setVisaoFiltro("PJ")}
          style={{
            padding: "8px 16px",
            background: visaoFiltro === "PJ" ? "rgba(124, 92, 252, 0.12)" : "transparent",
            color: visaoFiltro === "PJ" ? "var(--purple-light)" : "var(--text-muted)",
            border: visaoFiltro === "PJ" ? "1px solid var(--purple)" : "1px solid transparent",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13.5,
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          🏢 Empresa (PJ)
        </button>
        <button
          onClick={() => setVisaoFiltro("PF")}
          style={{
            padding: "8px 16px",
            background: visaoFiltro === "PF" ? "rgba(245, 158, 11, 0.12)" : "transparent",
            color: visaoFiltro === "PF" ? "#F59E0B" : "var(--text-muted)",
            border: visaoFiltro === "PF" ? "1px solid #F59E0B" : "1px solid transparent",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13.5,
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          👤 Sócio (PF)
        </button>
        <button
          onClick={() => setVisaoFiltro("CONFUSAO")}
          style={{
            padding: "8px 16px",
            background: visaoFiltro === "CONFUSAO" ? "rgba(239, 68, 68, 0.12)" : "transparent",
            color: visaoFiltro === "CONFUSAO" ? "var(--red)" : "var(--text-muted)",
            border: visaoFiltro === "CONFUSAO" ? "1px solid var(--red)" : "1px solid transparent",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13.5,
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          ⚠️ Diagnóstico de Contas
        </button>
      </div>

      {/* Seletor de Mês Otimizado */}
      <div className="card" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "16px 24px", overflowX: "auto", marginBottom: 20 }}>
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
            {obterMesesVizinhos(mesReferencia).map((d, index) => {
              const isAtivo = d.getFullYear() === mesReferencia.getFullYear() && d.getMonth() === mesReferencia.getMonth();
              return (
                <button
                  key={index}
                  onClick={() => setMesReferencia(d)}
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

      {carregando && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 20, color: "var(--text-muted)", marginBottom: 16 }}>
          <Loader2 className="animate-spin" size={16} />
          Gerando relatório atualizado...
        </div>
      )}

      {relatorio && (
        <>
          {/* Métricas consolidadas com base no filtro de visão */}
          {visaoFiltro === "PJ" && (
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-icon green"><TrendingUp size={20} /></div>
                <div>
                  <div className="stat-label">Faturamento (PJ)</div>
                  <div className="stat-value positive">{formatarMoeda(relatorio.resumo.totalReceitasEmpresa)}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><TrendingDown size={20} /></div>
                <div>
                  <div className="stat-label">Custos Operacionais</div>
                  <div className="stat-value negative">{formatarMoeda(relatorio.resumo.totalDespesasEmpresa)}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon teal"><Scale size={20} /></div>
                <div>
                  <div className="stat-label">Lucro Operacional</div>
                  <div className={`stat-value ${relatorio.resumo.saldoEmpresa >= 0 ? "positive" : "negative"}`}>
                    {formatarMoeda(relatorio.resumo.saldoEmpresa)}
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><Building2 size={20} /></div>
                <div>
                  <div className="stat-label">Não categorizadas</div>
                  <div className="stat-value">{relatorio.resumo.transacoesNaoCategorizadas}</div>
                </div>
              </div>
            </div>
          )}

          {visaoFiltro === "PF" && (
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-icon green"><TrendingUp size={20} /></div>
                <div>
                  <div className="stat-label">Rendimento (Sócio)</div>
                  <div className="stat-value positive">{formatarMoeda(relatorio.resumo.totalReceitasPessoal)}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><TrendingDown size={20} /></div>
                <div>
                  <div className="stat-label">Gastos Pessoais PF</div>
                  <div className="stat-value negative">{formatarMoeda(relatorio.resumo.totalDespesasPessoal)}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon teal"><Scale size={20} /></div>
                <div>
                  <div className="stat-label">Saldo PF</div>
                  <div className={`stat-value ${relatorio.resumo.saldoPessoal >= 0 ? "positive" : "negative"}`}>
                    {formatarMoeda(relatorio.resumo.saldoPessoal)}
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><Building2 size={20} /></div>
                <div>
                  <div className="stat-label">Não categorizadas</div>
                  <div className="stat-value">{relatorio.resumo.transacoesNaoCategorizadas}</div>
                </div>
              </div>
            </div>
          )}

          {visaoFiltro === "CONFUSAO" && (
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-icon blue"><Building2 size={20} /></div>
                <div>
                  <div className="stat-label">Saídas Totais PJ</div>
                  <div className="stat-value">{formatarMoeda(totalSaidasPJ)}</div>
                </div>
              </div>
              <div className="stat-card" style={{ border: confusaoPatrimonial > 0 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--border)" }}>
                <div className="stat-icon red" style={{ background: "rgba(239, 68, 68, 0.12)" }}><TrendingDown size={20} /></div>
                <div>
                  <div className="stat-label" style={{ color: "var(--red)" }}>PJ pagou gastos Pessoais</div>
                  <div className="stat-value negative" style={{ color: "var(--red)" }}>{formatarMoeda(confusaoPatrimonial)}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon teal"><Scale size={20} /></div>
                <div>
                  <div className="stat-label">Índice de Confusão</div>
                  <div className="stat-value" style={{ color: parseFloat(indiceConfusao) > 0 ? "var(--red)" : "var(--text)" }}>{indiceConfusao}%</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><TrendingUp size={20} /></div>
                <div>
                  <div className="stat-label">Sobrou real na PJ</div>
                  <div className="stat-value positive">{formatarMoeda(relatorio.resumo.saldoEmpresa - confusaoPatrimonial)}</div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 1: GRÁFICO DE PIZZA (DONUT) */}
          {abaAtiva === "PIZZA" && visaoFiltro !== "CONFUSAO" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Filtro de Tipo (Receita vs Despesa) */}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
                <button
                  onClick={() => setTipoFiltroPizza("DESPESA")}
                  style={{
                    padding: "8px 16px",
                    background: tipoFiltroPizza === "DESPESA" ? "rgba(239, 68, 68, 0.15)" : "transparent",
                    color: tipoFiltroPizza === "DESPESA" ? "var(--red)" : "var(--text-muted)",
                    border: `1px solid ${tipoFiltroPizza === "DESPESA" ? "var(--red)" : "var(--border)"}`,
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Despesas (Saídas)
                </button>
                <button
                  onClick={() => setTipoFiltroPizza("RECEITA")}
                  style={{
                    padding: "8px 16px",
                    background: tipoFiltroPizza === "RECEITA" ? "rgba(16, 185, 129, 0.15)" : "transparent",
                    color: tipoFiltroPizza === "RECEITA" ? "var(--green)" : "var(--text-muted)",
                    border: `1px solid ${tipoFiltroPizza === "RECEITA" ? "var(--green)" : "var(--border)"}`,
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Receitas (Entradas)
                </button>
              </div>

              {/* Pizza centralizada baseada na Visão ativa */}
              <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                {visaoFiltro === "PJ" ? (
                  /* 1. Bloco Empresarial */
                  <div className="card" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 650, width: "100%" }}>
                    <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                      <span>🏢 Distribuição Empresarial (PJ)</span>
                      <span className="badge purple">{formatarMoeda(totalEmpresa)}</span>
                    </h2>

                    {/* Donut Empresarial */}
                    <div style={{ display: "flex", justifyContent: "center", position: "relative", width: "100%", height: 220 }}>
                      <svg width="220" height="220" viewBox="0 0 220 220">
                        <circle cx="110" cy="110" r="70" fill="transparent" stroke="var(--border)" strokeWidth="15" />
                        {segmentosEmpresa.map((seg: any, i: number) => (
                          <circle
                            key={i}
                            cx="110"
                            cy="110"
                            r="70"
                            fill="transparent"
                            stroke={seg.cor}
                            strokeWidth="16"
                            strokeDasharray={seg.strokeDash}
                            strokeDashoffset={seg.strokeOffset}
                            transform="rotate(-90 110 110)"
                            strokeLinecap="round"
                          />
                        ))}
                      </svg>
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                      }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>Total</span>
                        <strong style={{ fontSize: 15, color: "var(--text)", whiteSpace: "nowrap" }}>{formatarMoeda(totalEmpresa)}</strong>
                      </div>
                    </div>

                    {/* Lista de categorias Empresariais */}
                    <div>
                      <h3 style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>Categorias</h3>
                      {segmentosEmpresa.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                          Nenhum lançamento desse tipo encontrado.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {segmentosEmpresa.map((seg: any, i: number) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                borderRadius: 8,
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: seg.cor, flexShrink: 0 }} />
                                <div>
                                  <span style={{ fontWeight: 600, fontSize: 13 }}>{seg.categoria}</span>
                                  <span style={{ display: "block", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                                    {(seg.percent * 100).toFixed(1)}% ({seg.quantidade} transações)
                                  </span>
                                </div>
                              </div>
                              <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 13 }}>
                                {formatarMoeda(seg.total)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 2. Bloco Pessoal */
                  <div className="card" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 650, width: "100%" }}>
                    <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                      <span>👤 Distribuição Pessoal (PF)</span>
                      <span className="badge amber">{formatarMoeda(totalPessoal)}</span>
                    </h2>

                    {/* Donut Pessoal */}
                    <div style={{ display: "flex", justifyContent: "center", position: "relative", width: "100%", height: 220 }}>
                      <svg width="220" height="220" viewBox="0 0 220 220">
                        <circle cx="110" cy="110" r="70" fill="transparent" stroke="var(--border)" strokeWidth="15" />
                        {segmentosPessoal.map((seg: any, i: number) => (
                          <circle
                            key={i}
                            cx="110"
                            cy="110"
                            r="70"
                            fill="transparent"
                            stroke={seg.cor}
                            strokeWidth="16"
                            strokeDasharray={seg.strokeDash}
                            strokeDashoffset={seg.strokeOffset}
                            transform="rotate(-90 110 110)"
                            strokeLinecap="round"
                          />
                        ))}
                      </svg>
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                      }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>Total</span>
                        <strong style={{ fontSize: 15, color: "var(--text)", whiteSpace: "nowrap" }}>{formatarMoeda(totalPessoal)}</strong>
                      </div>
                    </div>

                    {/* Lista de categorias Pessoais */}
                    <div>
                      <h3 style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>Categorias</h3>
                      {segmentosPessoal.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                          Nenhum lançamento desse tipo encontrado.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {segmentosPessoal.map((seg: any, i: number) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                borderRadius: 8,
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: seg.cor, flexShrink: 0 }} />
                                <div>
                                  <span style={{ fontWeight: 600, fontSize: 13 }}>{seg.categoria}</span>
                                  <span style={{ display: "block", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                                    {(seg.percent * 100).toFixed(1)}% ({seg.quantidade} transações)
                                  </span>
                                </div>
                              </div>
                              <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 13 }}>
                                {formatarMoeda(seg.total)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 2: GRÁFICO DE BARRAS (BALANÇO MENSAL) */}
          {abaAtiva === "BARRAS" && visaoFiltro !== "CONFUSAO" && (
            <div className="card grid-layout two-cols-left-heavy">
              
              {/* Lado Esquerdo: O Gráfico de Barras SVG */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h3>Evolução Mensal</h3>
                {dadosMensais.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 12 }}>
                    Dados insuficientes para gerar a evolução mensal.
                  </p>
                ) : (
                  <div style={{ width: "100%", overflowX: "auto", marginTop: 20 }}>
                    <svg width={Math.max(500, dadosMensais.length * 90 + 60)} height="280">
                      {/* Linhas de grade e valores */}
                      {[0, 0.25, 0.5, 0.75, 1].map((scale, i) => {
                        const y = 30 + 180 * (1 - scale);
                        const valorLabel = formatarMoeda(maxValorMensal * scale);
                        return (
                          <g key={i}>
                            <line x1="55" y1={y} x2="100%" y2={y} stroke="var(--border)" strokeDasharray="3 3" />
                            <text x="50" y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="9">
                              {valorLabel.split(",")[0]}
                            </text>
                          </g>
                        );
                      })}

                      {/* Eixo de meses e barras */}
                      {dadosMensais.map((d, index) => {
                        const xBase = 70 + index * 90;
                        const barWidth = 16;
                        const gap = 4;

                        // Altura proporcional
                        const hReceita = (d.receitas / maxValorMensal) * 180;
                        const hDespesa = (d.despesas / maxValorMensal) * 180;

                        // Y das barras
                        const yReceita = 210 - hReceita;
                        const yDespesa = 210 - hDespesa;

                        return (
                          <g key={d.mesAno}>
                            {/* Barra Receita (Verde) */}
                            <rect
                              x={xBase - barWidth - gap/2}
                              y={yReceita}
                              width={barWidth}
                              height={Math.max(2, hReceita)}
                              fill="var(--green)"
                              rx="3"
                            />

                            {/* Barra Despesa (Vermelha) */}
                            <rect
                              x={xBase + gap/2}
                              y={yDespesa}
                              width={barWidth}
                              height={Math.max(2, hDespesa)}
                              fill="var(--red)"
                              rx="3"
                            />

                            {/* Rótulo do Mês */}
                            <text x={xBase} y="235" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="500">
                              {formatarMesAnoAbreviado(d.mesAno)}
                            </text>
                          </g>
                        );
                      })}
                      
                      {/* Linha da base do gráfico */}
                      <line x1="55" y1="210" x2="100%" y2="210" stroke="var(--border)" strokeWidth="1.5" />
                    </svg>
                    
                    {/* Legenda */}
                    <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                        <div style={{ width: 10, height: 10, background: "var(--green)", borderRadius: 3 }} />
                        <span>Receitas</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                        <div style={{ width: 10, height: 10, background: "var(--red)", borderRadius: 3 }} />
                        <span>Despesas</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lado Direito: Listagem dos Meses */}
              <div>
                <h3>Balanço mensal</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
                  {dadosMensais.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        paddingBottom: 12,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <h4 style={{ margin: "0 0 6px 0", fontSize: 14, color: "var(--purple)" }}>
                        {formatarMesAnoExtenso(d.mesAno)}
                      </h4>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>Receita</span>
                        <strong className="value-positive">{formatarMoeda(d.receitas)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: "var(--text-muted)" }}>Despesa</span>
                        <strong className="value-negative">{formatarMoeda(d.despesas)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingTop: 6, borderTop: "1px dashed var(--border)" }}>
                        <span style={{ color: "var(--text)" }}>Saldo</span>
                        <strong style={{ color: d.receitas - d.despesas >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                          {formatarMoeda(d.receitas - d.despesas)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DIAGNÓSTICO DE CONFUSÃO PATRIMONIAL */}
          {visaoFiltro === "CONFUSAO" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Alerta Educativo */}
              <div className="card alert-error" style={{ display: "flex", flexDirection: "column", gap: 8, background: "rgba(239, 68, 68, 0.03)", border: "1px solid rgba(239, 68, 68, 0.15)", padding: 20 }}>
                <h3 style={{ margin: 0, color: "var(--red)", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                  ⚠️ O que é a Confusão Patrimonial?
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                  Confusão patrimonial ocorre quando a conta bancária da empresa (PJ) é utilizada para pagar despesas pessoais do sócio (PF). 
                  Isso prejudica a apuração exata do lucro da empresa, distorce o custo de vida do empresário e pode gerar problemas fiscais graves com a Receita Federal.
                </p>
                <strong style={{ fontSize: 12.5, color: "var(--text)", marginTop: 4 }}>
                  Meta recomendada: Manter o Índice de Confusão Patrimonial em 0.0%.
                </strong>
              </div>

              {/* Lista de Transações Confusas */}
              <div className="card">
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Detalhamento dos Lançamentos Misturados</h3>
                {relatorio.transacoesConfusas && relatorio.transacoesConfusas.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "12px 0" }}>
                    🎉 Excelente! Nenhuma despesa pessoal foi paga com a conta corrente da empresa neste período.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <th style={{ textAlign: "left", padding: 8, fontSize: 12, color: "var(--text-muted)" }}>Data</th>
                          <th style={{ textAlign: "left", padding: 8, fontSize: 12, color: "var(--text-muted)" }}>Descrição</th>
                          <th style={{ textAlign: "left", padding: 8, fontSize: 12, color: "var(--text-muted)" }}>Categoria (PF)</th>
                          <th style={{ textAlign: "right", padding: 8, fontSize: 12, color: "var(--text-muted)" }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.transacoesConfusas.map((t: any) => (
                          <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: 10, fontSize: 12.5 }}>{new Date(t.data).toLocaleDateString("pt-BR")}</td>
                            <td style={{ padding: 10, fontSize: 12.5, fontWeight: 500 }}>{t.descricaoOriginal}</td>
                            <td style={{ padding: 10, fontSize: 12.5 }}>
                              <span className="badge amber" style={{ fontSize: 10.5 }}>{t.categoria}</span>
                            </td>
                            <td style={{ padding: 10, fontSize: 12.5, textAlign: "right", color: "var(--red)", fontWeight: 600 }}>
                              {formatarMoeda(t.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
