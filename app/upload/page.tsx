"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useCompany } from "@/lib/CompanyContext";

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

  useEffect(() => {
    if (selectedCompany) {
      carregarHistorico();
    } else {
      setImportacoes([]);
    }
  }, [selectedCompany]);

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
          <label>Origem (ex: extrato_banco_x, cartao_y)</label>
          <input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="opcional" />

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
        <div className="card">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} color="var(--green)" />
            Resultado
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            {resultado.upload.transacoesImportadas} transações importadas ({resultado.upload.linhasComErro} linhas com erro).
          </p>
          <div className="stat-grid">
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
          <a className="btn" href="/review">Ir para revisão manual</a>
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
                      <span className="badge">{imp.origem || "Não informada"}</span>
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
