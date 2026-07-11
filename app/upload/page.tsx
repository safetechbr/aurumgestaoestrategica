"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useCompany } from "@/lib/CompanyContext";
import { resumirDescricao } from "@/lib/csv-parser";

export default function UploadPage() {
  const { selectedCompany } = useCompany();
  const [origem, setOrigem] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Histórico
  const [importacoes, setImportacoes] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // Conferencia
  const [categorias, setCategorias] = useState<any[]>([]);
  const [autoCategorizadas, setAutoCategorizadas] = useState<any[]>([]);
  const [carregandoAuto, setCarregandoAuto] = useState(false);

  useEffect(() => {
    if (selectedCompany) {
      carregarHistorico();
      carregarCategorias();
    } else {
      setImportacoes([]);
      setCategorias([]);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (resultado?.upload?.importacaoId) {
      buscarAutoCategorizadas(resultado.upload.importacaoId);
    } else {
      setAutoCategorizadas([]);
    }
  }, [resultado]);

  async function carregarCategorias() {
    if (!selectedCompany) return;
    try {
      const resp = await fetch(`/api/categories?empresaId=${selectedCompany.id}`);
      if (resp.ok) {
        setCategorias(await resp.json());
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  }

  async function buscarAutoCategorizadas(importacaoId: string) {
    if (!selectedCompany) return;
    setCarregandoAuto(true);
    try {
      const resp = await fetch(
        `/api/transactions?empresaId=${selectedCompany.id}&importacaoId=${importacaoId}&onlyCategorized=true`
      );
      if (resp.ok) {
        setAutoCategorizadas(await resp.json());
      }
    } catch (e) {
      console.error("Erro ao buscar transações auto-categorizadas:", e);
    } finally {
      setCarregandoAuto(false);
    }
  }

  async function alterarCategoriaAuto(t: any, novaCategoriaId: string) {
    try {
      const resp = await fetch(`/api/transactions/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor: t.valor,
          data: t.data,
          categoriaId: novaCategoriaId || null,
        }),
      });

      if (resp.ok) {
        const atualizada = await resp.json();
        setAutoCategorizadas((prev) =>
          prev.map((item) => (item.id === t.id ? { ...item, ...atualizada } : item))
        );
      }
    } catch (error) {
      console.error("Erro ao atualizar categoria rápida:", error);
    }
  }

  async function carregarHistorico() {
    if (!selectedCompany) return;
    setCarregandoHistorico(true);
    try {
      const resp = await fetch(`/api/imports?empresaId=${selectedCompany.id}`);
      if (resp.ok) {
        setImportacoes(await resp.json());
      }
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setCarregandoHistorico(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo || !selectedCompany) return;

    setCarregando(true);
    setErro(null);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      formData.append("empresaId", selectedCompany.id);
      formData.append("origem", origem);

      const respUpload = await fetch("/api/upload", { method: "POST", body: formData });
      const dadosUpload = await respUpload.json();
      if (!respUpload.ok) throw new Error(dadosUpload.erro);

      const respCategorize = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importacaoId: dadosUpload.importacaoId }),
      });
      const dadosCategorize = await respCategorize.json();
      if (!respCategorize.ok) throw new Error(dadosCategorize.erro);

      setResultado({ upload: dadosUpload, categorizacao: dadosCategorize });
      setOrigem("");
      setArquivo(null);

      // Limpa input de arquivo
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      await carregarHistorico();
    } catch (e: any) {
      setErro(e.message ?? "Erro ao processar o arquivo.");
    } finally {
      setCarregando(false);
    }
  }

  async function excluirImportacao(id: string, nomeArquivo: string) {
    const confirmacao = confirm(
      `Tem certeza que deseja excluir a importação do arquivo "${nomeArquivo}"?\n\n` +
      `Isso apagará permanentemente todas as transações importadas neste lote do banco de dados.`
    );
    if (!confirmacao) return;

    try {
      const resp = await fetch(`/api/imports/${id}`, { method: "DELETE" });
      if (resp.ok) {
        setImportacoes((prev) => prev.filter((i) => i.id !== id));
        if (resultado?.upload?.importacaoId === id) {
          setResultado(null);
        }
      } else {
        const dados = await resp.json();
        alert(dados.erro ?? "Erro ao excluir importação.");
      }
    } catch (error) {
      console.error("Erro ao excluir importação:", error);
      alert("Erro de conexão ao excluir importação.");
    }
  }

  return (
    <div>
      <h1>Importar CSV</h1>
      <p className="subtitle">
        Envie o extrato bancário para a empresa: <strong style={{ color: "var(--text)" }}>{selectedCompany?.nome}</strong>. O sistema categoriza automaticamente.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <label>Origem do Extrato (Tipo de Conta)</label>
          <select
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            required
            disabled={carregando}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              color: "var(--text)",
              marginBottom: 16,
              cursor: "pointer"
            }}
          >
            <option value="" disabled>Selecione a origem da conta...</option>
            <option value="CONTA_EMPRESA">🏢 Extrato da Conta da Empresa (PJ)</option>
            <option value="CONTA_PESSOAL">👤 Extrato da Conta Pessoal (PF)</option>
            <option value="CARTAO_PESSOAL">💳 Fatura do Cartão de Crédito Pessoal (PF)</option>
          </select>

          <label>Arquivo CSV</label>
          <input type="file" accept=".csv" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} required />

          <button type="submit" disabled={carregando}>
            {carregando ? "Processando..." : "Importar e categorizar"}
          </button>
        </form>
      </div>

      {erro && (
        <div className="card alert-error">
          <strong style={{ color: "var(--red)" }}>Erro:</strong> {erro}
        </div>
      )}

      {resultado && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={18} color="var(--green)" />
              Resultado
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              {resultado.upload.transacoesImportadas} transações importadas ({resultado.upload.linhasComErro} linhas com erro).
            </p>
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              <div>
                <div className="stat-value">{resultado.categorizacao.categorizadasPorRegra}</div>
                <div className="stat-label">Categorizadas por regra</div>
              </div>
              <div>
                <div className="stat-value">{resultado.categorizacao.categorizadasPorIA}</div>
                <div className="stat-label">Categorizadas por IA</div>
              </div>
              <div>
                <div className="stat-value">{resultado.categorizacao.enviadasParaRevisaoManual}</div>
                <div className="stat-label">Para revisão manual</div>
              </div>
            </div>
            <a className="btn" href="/review" style={{ display: "inline-block" }}>Ir para revisão manual</a>
          </div>

          {/* Seção de Conferencia de Auto-Categorizações */}
          {carregandoAuto ? (
            <div className="card" style={{ display: "flex", gap: 10, alignItems: "center", padding: 24, color: "var(--text-muted)", marginTop: 0 }}>
              <Loader2 className="animate-spin" size={16} />
              Carregando relatório de conferência...
            </div>
          ) : autoCategorizadas.length > 0 ? (
            <div className="card" style={{ marginTop: 0 }}>
              <h3 style={{ margin: "0 0 4px 0" }}>Conferência de Auto-Categorizações</h3>
              <p className="subtitle" style={{ margin: "0 0 16px 0", fontSize: 13, color: "var(--text-muted)" }}>
                As transações abaixo foram classificadas de forma automática. Se alguma estiver incorreta, ajuste o dropdown no final da linha.
              </p>
              
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.01)" }}>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12.5, color: "var(--text-muted)" }}>Data</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12.5, color: "var(--text-muted)" }}>Descrição</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 12.5, color: "var(--text-muted)" }}>Valor</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12.5, color: "var(--text-muted)", width: 220 }}>Categoria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoCategorizadas.map((t) => {
                      const categoriasDoTipo = categorias.filter((c) => c.tipo === t.tipo);
                      return (
                        <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 12px", fontSize: 13, whiteSpace: "nowrap" }}>
                            {new Date(t.data).toLocaleDateString("pt-BR")}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                              {resumirDescricao(t.descricaoOriginal)}
                            </div>
                            {t.descricaoOriginal !== resumirDescricao(t.descricaoOriginal) && (
                              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{t.descricaoOriginal}</div>
                            )}
                          </td>
                          <td style={{
                            padding: "10px 12px",
                            textAlign: "right",
                            fontWeight: 700,
                            fontSize: 13,
                            whiteSpace: "nowrap"
                          }} className={t.tipo === "RECEITA" ? "value-positive" : "value-negative"}>
                            {t.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <select
                              value={t.categoriaId || ""}
                              onChange={(e) => alterarCategoriaAuto(t, e.target.value)}
                              style={{
                                padding: "6px 10px",
                                fontSize: "12.5px",
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-sm)",
                                color: "var(--text)",
                                width: "100%",
                                marginBottom: 0,
                                cursor: "pointer"
                              }}
                            >
                              <option value="">Não categorizada</option>
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
            </div>
          ) : null}
        </div>
      )}

      {/* Histórico */}
      <div className="card" style={{ marginTop: 24 }}>
        <h2>Histórico de Importações</h2>

        {carregandoHistorico && importacoes.length === 0 ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 12, color: "var(--text-muted)" }}>
            <Loader2 className="animate-spin" size={16} />
            Buscando histórico...
          </div>
        ) : importacoes.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "10px 0 0" }}>
            Nenhum arquivo CSV importado para esta empresa ainda.
          </p>
        ) : (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Origem</th>
                <th>Data Importação</th>
                <th>Período Lançamentos</th>
                <th style={{ width: 80 }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {importacoes.map((imp) => {
                const dataImp = new Date(imp.importadoEm).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const periodo = imp.dataInicio && imp.dataFim
                  ? `${new Date(imp.dataInicio).toLocaleDateString("pt-BR")} a ${new Date(imp.dataFim).toLocaleDateString("pt-BR")}`
                  : "—";

                return (
                  <tr key={imp.id}>
                    <td style={{ fontWeight: 500 }}>{imp.nomeArquivo}</td>
                    <td>
                      {imp.origem === "CONTA_EMPRESA" && <span className="badge purple">🏢 Conta Empresa (PJ)</span>}
                      {imp.origem === "CONTA_PESSOAL" && <span className="badge amber">👤 Conta Pessoal (PF)</span>}
                      {imp.origem === "CARTAO_PESSOAL" && <span className="badge" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" }}>💳 Cartão Pessoal (PF)</span>}
                      {!["CONTA_EMPRESA", "CONTA_PESSOAL", "CARTAO_PESSOAL"].includes(imp.origem) && (
                        <span className="badge">{imp.origem || "Não informada"}</span>
                      )}
                    </td>
                    <td>{dataImp}</td>
                    <td>{periodo}</td>
                    <td>
                      <button
                        onClick={() => excluirImportacao(imp.id, imp.nomeArquivo)}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "var(--red)",
                          fontSize: 12,
                        }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
