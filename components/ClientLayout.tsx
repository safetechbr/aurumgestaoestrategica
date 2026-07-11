"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { CompanyProvider, useCompany, Empresa } from "@/lib/CompanyContext";
import { LayoutDashboard, ArrowLeftRight, PieChart, ListChecks, Plus, Building2, LogOut, Loader2, Tags, Settings, List, Upload } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Importar CSV", icon: Upload },
  { href: "/transactions", label: "Transações", icon: List },
  { href: "/review", label: "Revisão manual", icon: ListChecks },
  { href: "/reports", label: "Relatórios", icon: PieChart },
  { href: "/categories", label: "Categorias", icon: Tags },
  { href: "/settings", label: "Configurações", icon: Settings },
];

function SidebarAndHeader({ children }: { children: React.ReactNode }) {
  const { companies, selectedCompany, selectCompany, createCompany } = useCompany();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    setCreating(true);
    setError("");
    try {
      await createCompany(newCompanyName);
      setNewCompanyName("");
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message ?? "Erro ao criar empresa");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <a href="/" className="sidebar-brand">
            diagnóstico<span>.</span>
          </a>
          
          <div style={{ marginTop: 20 }}>
            <label style={{ marginBottom: 4 }}>Empresa selecionada</label>
            <div style={{ display: "flex", gap: 4 }}>
              <select
                value={selectedCompany?.id ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "NEW") {
                    setShowCreateModal(true);
                  } else {
                    const found = companies.find((c) => c.id === val);
                    selectCompany(found ?? null);
                  }
                }}
                style={{ marginBottom: 0, paddingRight: 30 }}
              >
                <option value="" disabled>Selecione...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
                <option value="NEW">+ Criar Nova Empresa</option>
              </select>
              {selectedCompany && (
                <button
                  onClick={() => selectCompany(null)}
                  title="Sair da empresa"
                  style={{
                    padding: 8,
                    background: "var(--surface-hover)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        <a href="/upload" className="btn-new" style={{ marginTop: 10 }}>
          <Plus size={16} />
          Nova importação
        </a>

        <nav className="sidebar-nav" style={{ flexGrow: 1, marginTop: 10 }}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="sidebar-link">
              <item.icon size={18} />
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="content">{children}</main>

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 420, margin: 20 }}>
            <h2>Cadastrar Nova Empresa</h2>
            <form onSubmit={handleCreateCompany}>
              <label>Nome da empresa</label>
              <input
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Ex: Minha Empresa Ltda"
                required
                autoFocus
              />
              {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>{error}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={creating}>
                  {creating ? "Criando..." : "Criar empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function WelcomeLanding() {
  const { companies, selectCompany, createCompany } = useCompany();
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    setCreating(true);
    setError("");
    try {
      await createCompany(newCompanyName);
      setNewCompanyName("");
    } catch (err: any) {
      setError(err.message ?? "Erro ao criar empresa");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, letterSpacing: "-0.03em" }}>
            diagnóstico<span style={{ color: "var(--purple-light)" }}>.</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 16, marginTop: 8 }}>
            Selecione uma empresa existente ou crie uma nova para iniciar o diagnóstico financeiro.
          </p>
        </div>

        <div className="grid-layout two-cols-equal">
          <div className="card" style={{ display: "flex", flexDirection: "column", height: "fit-content" }}>
            <h2>Selecione uma Empresa</h2>
            
            {companies.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "10px 0" }}>
                Nenhuma empresa cadastrada ainda. Crie uma ao lado para começar.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxHeight: 280,
                  overflowY: "auto",
                  paddingRight: 6,
                }}
              >
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCompany(c)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      background: "var(--surface-hover)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      fontSize: 14.5,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--purple)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <Building2 size={18} color="var(--purple-light)" />
                    <span style={{ flexGrow: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.nome}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Criar Nova Empresa</h2>
            <form onSubmit={handleCreateCompany}>
              <label>Nome da empresa</label>
              <input
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Ex: Minha Empresa Ltda"
                required
              />
              {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>{error}</div>}
              <button type="submit" style={{ width: "100%" }} disabled={creating}>
                {creating ? "Criando..." : "Criar e Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { selectedCompany, loading } = useCompany();
  const pathname = usePathname();
  const isSharePage = pathname?.startsWith("/share");

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--purple)" }} />
          <span style={{ color: "var(--text-muted)" }}>Carregando workspaces...</span>
        </div>
      </div>
    );
  }

  if (isSharePage) {
    return <div style={{ minHeight: "100vh", background: "var(--bg)" }}>{children}</div>;
  }

  if (!selectedCompany) {
    return <WelcomeLanding />;
  }

  return <SidebarAndHeader>{children}</SidebarAndHeader>;
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanyProvider>
      <LayoutContent>{children}</LayoutContent>
    </CompanyProvider>
  );
}
