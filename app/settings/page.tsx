"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/lib/CompanyContext";
import { Building, Shield, Check, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { selectedCompany, loadCompanies } = useCompany();

  // Estados dos inputs
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [regimeTributario, setRegimeTributario] = useState("");
  const [segmento, setSegmento] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  // Submenu ativo
  const [abaAtiva, setAbaAtiva] = useState<"EMPRESA">("EMPRESA");

  useEffect(() => {
    if (selectedCompany) {
      setNome(selectedCompany.nome ?? "");
      setCnpj(selectedCompany.cnpj ?? "");
      setRegimeTributario(selectedCompany.regimeTributario ?? "");
      setSegmento(selectedCompany.segmento ?? "");
      setSucesso(false);
      setErro("");
    }
  }, [selectedCompany]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !selectedCompany) return;

    setSalvando(true);
    setSucesso(false);
    setErro("");

    try {
      const resp = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          cnpj,
          regimeTributario,
          segmento,
        }),
      });

      if (!resp.ok) {
        const dados = await resp.json();
        throw new Error(dados.erro ?? "Erro ao salvar alterações.");
      }

      // Atualiza o contexto global e localstorage
      await loadCompanies();
      setSucesso(true);

      // Desaparece o aviso de sucesso após 3 segundos
      setTimeout(() => setSucesso(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErro(err.message ?? "Erro de conexão ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <h1>Configurações</h1>
      <p className="subtitle">Gerencie as preferências gerais e dados do workspace.</p>

      {sucesso && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(16, 185, 129, 0.15)",
          color: "var(--green)",
          padding: "12px 16px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--green)",
          marginBottom: 16,
          fontWeight: 500,
          fontSize: 14
        }}>
          <Check size={18} />
          Alterações salvas com sucesso!
        </div>
      )}

      {erro && (
        <div className="card alert-error" style={{ marginBottom: 16 }}>
          <strong style={{ color: "var(--red)" }}>Erro:</strong> {erro}
        </div>
      )}

      <div className="grid-layout two-cols-right-heavy">
        {/* Menu Lateral de Submenus */}
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              onClick={() => setAbaAtiva("EMPRESA")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                background: abaAtiva === "EMPRESA" ? "var(--surface-hover)" : "transparent",
                color: abaAtiva === "EMPRESA" ? "var(--purple-light)" : "var(--text-muted)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <Building size={16} />
              Dados da Empresa
            </button>
            <button
              disabled
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                background: "transparent",
                color: "var(--text-faint)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "not-allowed",
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              <Shield size={16} />
              Segurança (Em breve)
            </button>
          </div>
        </div>

        {/* Formulário de Edição */}
        <div className="card">
          <h2>Dados da Empresa</h2>
          <form onSubmit={handleSalvar}>
            <label>Nome da Empresa *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Razão social ou nome fantasia"
              required
              disabled={salvando}
            />

            <label>CNPJ</label>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              disabled={salvando}
            />

            <label>Regime Tributário</label>
            <select
              value={regimeTributario}
              onChange={(e) => setRegimeTributario(e.target.value)}
              disabled={salvando}
            >
              <option value="">Não informado</option>
              <option value="Simples Nacional">Simples Nacional</option>
              <option value="Lucro Presumido">Lucro Presumido</option>
              <option value="Lucro Real">Lucro Real</option>
              <option value="MEI">MEI (Microempreendedor Individual)</option>
              <option value="Outro">Outro</option>
            </select>

            <label>Segmento de Atuação</label>
            <input
              value={segmento}
              onChange={(e) => setSegmento(e.target.value)}
              placeholder="Ex: Tecnologia, Comércio de Roupas, Serviços Médicos"
              disabled={salvando}
            />

            <button type="submit" disabled={salvando} style={{ marginTop: 12 }}>
              {salvando ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 className="animate-spin" size={16} />
                  Salvando...
                </div>
              ) : "Salvar Alterações"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
