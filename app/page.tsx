"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/lib/CompanyContext";
import { Building2, TrendingUp, TrendingDown, Scale, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

export default function Home() {
  const { selectedCompany } = useCompany();
  
  // Data de referência padrão: Julho 2026
  const [mesCalendario, setMesCalendario] = useState(() => new Date(2026, 6, 1));
  const [relatorio, setRelatorio] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filtrarEmpresarial, setFiltrarEmpresarial] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      if (!selectedCompany) return;
      setLoading(true);
      try {
        const ano = mesCalendario.getFullYear();
        const mes = mesCalendario.getMonth();
        
        // Busca apenas o mês ativo do calendário (a API retornará o histórico de meses separadamente)
        const dataInicioObj = new Date(ano, mes, 1);
        const dataFimObj = new Date(ano, mes + 1, 0);

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
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [selectedCompany, mesCalendario]);

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

  function avancarMes() {
    setMesCalendario((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function obterNomeMes(data: Date) {
    return data.toLocaleString("pt-BR", { month: "long" });
  }

  // --- Processamento dos Dados do Mês Corrente ---
  const totalReceitas = relatorio?.resumo?.totalReceitas ?? 0;
  const totalDespesas = relatorio?.resumo?.totalDespesas ?? 0;
  const saldo = relatorio?.resumo?.saldo ?? 0;
  const totalReceitasEmpresa = relatorio?.resumo?.totalReceitasEmpresa ?? 0;
  const totalDespesasEmpresa = relatorio?.resumo?.totalDespesasEmpresa ?? 0;
  const saldoEmpresa = relatorio?.resumo?.saldoEmpresa ?? 0;
  const totalReceitasPessoal = relatorio?.resumo?.totalReceitasPessoal ?? 0;
  const totalDespesasPessoal = relatorio?.resumo?.totalDespesasPessoal ?? 0;
  const saldoPessoal = relatorio?.resumo?.saldoPessoal ?? 0;
  const transacoesNaoCategorizadas = relatorio?.resumo?.transacoesNaoCategorizadas ?? 0;

  const percentualMistura = totalDespesas > 0 ? (totalDespesasPessoal / totalDespesas) * 100 : 0;

  const receitaExibida = filtrarEmpresarial ? totalReceitasEmpresa : totalReceitas;
  const despesaExibida = filtrarEmpresarial ? totalDespesasEmpresa : totalDespesas;
  const saldoExibido = receitaExibida - despesaExibida;

  // --- Processamento do Gráfico de Evolução de 3 Meses ---
  const ultimos3Meses = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const match = relatorio?.porMes?.find((m: any) => m.mesAno === chave) ?? {
      mesAno: chave,
      receitas: 0,
      despesas: 0,
    };
    ultimos3Meses.push(match);
  }

  const maxValor3Meses = Math.max(1, ...ultimos3Meses.map((m) => Math.max(m.receitas, m.despesas)));

  // --- Processamento da Grade do Calendário ---
  const anoCal = mesCalendario.getFullYear();
  const mesCal = mesCalendario.getMonth();
  const primeiroDiaSemana = new Date(anoCal, mesCal, 1).getDay();
  const totalDiasMes = new Date(anoCal, mesCal + 1, 0).getDate();
  const totalDiasMesAnterior = new Date(anoCal, mesCal, 0).getDate();

  const celulasCalendario = [];

  // Dias do mês anterior (cinza)
  for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
    const diaNum = totalDiasMesAnterior - i;
    const dataStr = `${anoCal}-${String(mesCal).padStart(2, "0")}-${String(diaNum).padStart(2, "0")}`;
    celulasCalendario.push({ dia: diaNum, ativo: false, dataStr });
  }

  // Dias do mês atual
  for (let i = 1; i <= totalDiasMes; i++) {
    const dataStr = `${anoCal}-${String(mesCal + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    celulasCalendario.push({ dia: i, ativo: true, dataStr });
  }

  // Dias do próximo mês (cinza)
  const restante = 42 - celulasCalendario.length;
  for (let i = 1; i <= restante; i++) {
    const dataStr = `${anoCal}-${String(mesCal + 2).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    celulasCalendario.push({ dia: i, ativo: false, dataStr });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Painel de Diagnóstico</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            Workspace ativo: <strong style={{ color: "var(--text)" }}>{selectedCompany?.nome}</strong>
          </p>
        </div>

        {/* Alternador de Modo de Exibição */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", padding: 4, borderRadius: 8, border: "1px solid var(--border)", flexShrink: 0 }}>
          <button
            onClick={() => setFiltrarEmpresarial(true)}
            style={{
              padding: "6px 12px",
              background: filtrarEmpresarial ? "var(--purple)" : "transparent",
              color: filtrarEmpresarial ? "#fff" : "var(--text-muted)",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
              transition: "all 0.15s ease",
            }}
          >
            🏢 Empresarial
          </button>
          <button
            onClick={() => setFiltrarEmpresarial(false)}
            style={{
              padding: "6px 12px",
              background: !filtrarEmpresarial ? "var(--purple)" : "transparent",
              color: !filtrarEmpresarial ? "#fff" : "var(--text-muted)",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
              transition: "all 0.15s ease",
            }}
          >
            📊 Consolidado Geral
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 20, color: "var(--text-muted)" }}>
          <Loader2 className="animate-spin" size={16} />
          Buscando estatísticas...
        </div>
      ) : relatorio ? (
        <>
          {/* Métricas do mês selecionado */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon green"><TrendingUp size={20} /></div>
              <div>
                <div className="stat-label">Receitas ({obterNomeMes(mesCalendario)})</div>
                <div className="stat-value positive">{formatarMoeda(receitaExibida)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red"><TrendingDown size={20} /></div>
              <div>
                <div className="stat-label">Despesas ({obterNomeMes(mesCalendario)})</div>
                <div className="stat-value negative">{formatarMoeda(despesaExibida)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon teal"><Scale size={20} /></div>
              <div>
                <div className="stat-label">Balanço ({obterNomeMes(mesCalendario)})</div>
                <div className={`stat-value ${saldoExibido >= 0 ? "positive" : "negative"}`}>
                  {formatarMoeda(saldoExibido)}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><Building2 size={20} /></div>
              <div>
                <div className="stat-label">Pendentes de revisão</div>
                <div className="stat-value">{transacoesNaoCategorizadas}</div>
              </div>
            </div>
          </div>

          {/* Diagnóstico de Mistura Patrimonial */}
          {totalDespesasPessoal > 0 ? (
            <div className="card" style={{
              background: percentualMistura > 10 ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
              border: percentualMistura > 10 ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              gap: 16,
              alignItems: "center"
            }}>
              <div style={{
                background: percentualMistura > 10 ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                color: percentualMistura > 10 ? "var(--red)" : "var(--amber)",
                padding: 10,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 style={{
                  color: percentualMistura > 10 ? "var(--red)" : "var(--amber)",
                  margin: 0,
                  fontSize: 14.5,
                  fontWeight: 700
                }}>
                  {percentualMistura > 10 ? "Risco de Mistura Patrimonial Crítico!" : "Alerta de Mistura Patrimonial"}
                </h4>
                <p style={{
                  margin: "4px 0 0 0",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.5
                }}>
                  {percentualMistura > 10 
                    ? `Detectamos que ${formatarMoeda(totalDespesasPessoal)} (${percentualMistura.toFixed(1)}%) das despesas foram pagas com o caixa da empresa para fins pessoais. Isso compromete a saúde financeira e acarreta riscos fiscais graves.`
                    : `Identificamos que ${formatarMoeda(totalDespesasPessoal)} (${percentualMistura.toFixed(1)}%) das despesas do caixa da empresa são pessoais. É altamente recomendável formalizar essas retiradas via pró-labore para manter o caixa limpo.`
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="card" style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              gap: 16,
              alignItems: "center"
            }}>
              <div style={{
                background: "rgba(16, 185, 129, 0.15)",
                color: "var(--green)",
                padding: 10,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Scale size={24} />
              </div>
              <div>
                <h4 style={{
                  color: "var(--green)",
                  margin: 0,
                  fontSize: 14.5,
                  fontWeight: 700
                }}>
                  Gestão Patrimonial Saudável
                </h4>
                <p style={{
                  margin: "4px 0 0 0",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.5
                }}>
                  Excelente! Todas as despesas categorizadas pertencem ao escopo da Empresa. A separação rígida de contas pessoais e empresariais está sendo cumprida com sucesso.
                </p>
              </div>
            </div>
          )}

          <div className="grid-layout two-cols-left-heavy">
            {/* Coluna Esquerda: Balanço e Evolução */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              
              {/* Widget 1: Balanço mensal */}
              <div>
                <h3 style={{ marginBottom: 8, fontSize: 15, color: "var(--text-muted)" }}>Balanço mensal</h3>
                <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
                  <div style={{ display: "flex", gap: 24, padding: "24px 24px 16px 24px", alignItems: "center" }}>
                    
                    {/* Cápsulas de proporção */}
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 75, flexShrink: 0 }}>
                      <div style={{ width: 14, height: "100%", background: "var(--green)", borderRadius: 99 }} />
                      <div style={{
                        width: 14,
                        height: totalReceitas > 0 ? `${Math.min(100, (totalDespesas / totalReceitas) * 100)}%` : totalDespesas > 0 ? "100%" : "2%",
                        background: "var(--red)",
                        borderRadius: 99
                      }} />
                    </div>

                    {/* Valores de Receita e Despesa */}
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 13.5 }}>Receitas</span>
                        <strong className="value-positive">{formatarMoeda(totalReceitas)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8 }}>
                        <span style={{ fontWeight: 500, fontSize: 13.5 }}>Despesas</span>
                        <strong className="value-negative">{formatarMoeda(totalDespesas)}</strong>
                      </div>
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 500, fontSize: 13.5 }}>Balanço</span>
                        <strong style={{ color: "var(--text)", fontWeight: 700 }}>{formatarMoeda(saldo)}</strong>
                      </div>
                    </div>
                  </div>

                  <a href="/reports" style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderTop: "1px solid var(--border)",
                    color: "var(--purple-light)",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                    letterSpacing: "0.05em",
                  }}>
                    VER MAIS
                  </a>
                </div>
              </div>

              {/* Widget 2: Evolução de Receitas x Despesas */}
              <div>
                <h3 style={{ marginBottom: 8, fontSize: 15, color: "var(--text-muted)" }}>Receitas x Despesas</h3>
                <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
                  
                  {/* Gráfico SVG */}
                  <div style={{ padding: 24, paddingBottom: 16 }}>
                    <svg width="100%" height="150">
                      {/* Grid Lines */}
                      {[0, 0.5, 1].map((scale, i) => {
                        const y = 15 + 110 * (1 - scale);
                        return (
                          <g key={i}>
                            <line x1="55" y1={y} x2="100%" y2={y} stroke="var(--border)" strokeDasharray="3 3" />
                            <text x="50" y={y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9">
                              {formatarMoeda(maxValor3Meses * scale).split(",")[0]}
                            </text>
                          </g>
                        );
                      })}

                      {/* Barras dos últimos 3 meses */}
                      {ultimos3Meses.map((m, index) => {
                        // Calcula X centralizado baseado no tamanho
                        const xBase = 110 + index * 110;
                        const barWidth = 14;
                        const gap = 4;

                        const hRec = (m.receitas / maxValor3Meses) * 110;
                        const hDes = (m.despesas / maxValor3Meses) * 110;

                        const yRec = 125 - hRec;
                        const yDes = 125 - hDes;

                        const [ano, mes] = m.mesAno.split("-");

                        return (
                          <g key={m.mesAno}>
                            {/* Barra Receita (Verde) */}
                            <rect
                              x={xBase - barWidth - gap/2}
                              y={yRec}
                              width={barWidth}
                              height={Math.max(2, hRec)}
                              fill="var(--green)"
                              rx="3"
                            />
                            {/* Barra Despesa (Vermelha) */}
                            <rect
                              x={xBase + gap/2}
                              y={yDes}
                              width={barWidth}
                              height={Math.max(2, hDes)}
                              fill="var(--red)"
                              rx="3"
                            />
                            {/* Rótulo do Mês */}
                            <text x={xBase} y="145" textAnchor="middle" fill="var(--text-muted)" fontSize="10">
                              {parseInt(mes)}/{ano}
                            </text>
                          </g>
                        );
                      })}
                      <line x1="55" y1="125" x2="100%" y2="125" stroke="var(--border)" strokeWidth="1" />
                    </svg>
                  </div>

                  <a href="/reports" style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderTop: "1px solid var(--border)",
                    color: "var(--purple-light)",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                    letterSpacing: "0.05em",
                  }}>
                    VER MAIS
                  </a>
                </div>
              </div>

            </div>

            {/* Coluna Direita: Calendário */}
            <div>
              <h3 style={{ marginBottom: 8, fontSize: 15, color: "var(--text-muted)" }}>Calendário</h3>
              <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
                
                {/* Cabeçalho do Calendário */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                  <button onClick={voltarMes} style={{ background: "transparent", border: "none", color: "var(--purple-light)", cursor: "pointer", display: "flex" }}>
                    <ChevronLeft size={20} />
                  </button>
                  <span style={{ fontWeight: 700, textTransform: "capitalize", fontSize: 14 }}>
                    {obterNomeMes(mesCalendario)} {mesCalendario.getFullYear()}
                  </span>
                  <button onClick={avancarMes} style={{ background: "transparent", border: "none", color: "var(--purple-light)", cursor: "pointer", display: "flex" }}>
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Grid do Calendário */}
                <div style={{ padding: 12 }}>
                  {/* Dias da semana */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: 6 }}>
                    {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => (
                      <span key={d} style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{d}</span>
                    ))}
                  </div>

                  {/* Dias do mês */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                    {celulasCalendario.map((cel, index) => {
                      // Busca transações para o dia correspondente
                      const dadosDia = relatorio.porDia?.find((d: any) => {
                        // Compara strings YYYY-MM-DD
                        const [y, m, dNum] = d.data.split("-");
                        const formatada = `${y}-${m.padStart(2, "0")}-${dNum.padStart(2, "0")}`;
                        return formatada === cel.dataStr;
                      });

                      const temReceitas = dadosDia && dadosDia.receitas > 0;
                      const temDespesas = dadosDia && dadosDia.despesas > 0;

                      return (
                        <div
                          key={index}
                          style={{
                            background: "var(--surface)",
                            minHeight: 52,
                            padding: 4,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            opacity: cel.ativo ? 1 : 0.25,
                          }}
                        >
                          {/* Número do dia */}
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: cel.ativo ? "var(--text)" : "var(--text-faint)",
                            alignSelf: "flex-start"
                          }}>
                            {cel.dia}
                          </span>

                          {/* Lançamentos do dia */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                            {temReceitas && (
                              <div style={{
                                background: "var(--green)",
                                color: "white",
                                fontSize: 8,
                                padding: "1px 3px",
                                borderRadius: 4,
                                fontWeight: "bold",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }} title={`Receitas: ${formatarMoeda(dadosDia.receitas)}`}>
                                R$ {dadosDia.receitas.toFixed(0)}
                              </div>
                            )}
                            {temDespesas && (
                              <div style={{
                                background: "var(--red)",
                                color: "white",
                                fontSize: 8,
                                padding: "1px 3px",
                                borderRadius: 4,
                                fontWeight: "bold",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }} title={`Despesas: ${formatarMoeda(dadosDia.despesas)}`}>
                                R$ {dadosDia.despesas.toFixed(0)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <a href="/review" style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderTop: "1px solid var(--border)",
                  color: "var(--purple-light)",
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                  letterSpacing: "0.05em",
                }}>
                  VER MAIS
                </a>
              </div>
            </div>

          </div>
        </>
      ) : null}
    </div>
  );
}

