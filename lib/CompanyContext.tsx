"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Empresa {
  id: string;
  nome: string;
  cnpj?: string | null;
  regimeTributario?: string | null;
  segmento?: string | null;
  criadoEm?: string;
}

interface CompanyContextType {
  companies: Empresa[];
  selectedCompany: Empresa | null;
  loading: boolean;
  selectCompany: (company: Empresa | null) => void;
  loadCompanies: () => Promise<void>;
  createCompany: (nome: string) => Promise<Empresa>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [selectedCompany, setSelectedCompanyState] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega empresas e a seleção inicial
  useEffect(() => {
    async function init() {
      try {
        await loadCompanies();
        const saved = localStorage.getItem("selectedCompany");
        if (saved) {
          try {
            setSelectedCompanyState(JSON.parse(saved));
          } catch {
            localStorage.removeItem("selectedCompany");
          }
        }
      } catch (error) {
        console.error("Erro ao inicializar contexto de empresas:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadCompanies() {
    try {
      const resp = await fetch("/api/companies");
      if (resp.ok) {
        const data = await resp.json();
        setCompanies(data);
        
        // Mantém a empresa selecionada sincronizada se ela ainda existe
        setSelectedCompanyState((current) => {
          if (!current) return null;
          const match = data.find((c: Empresa) => c.id === current.id);
          if (match) {
            localStorage.setItem("selectedCompany", JSON.stringify(match));
            return match;
          }
          localStorage.removeItem("selectedCompany");
          return null;
        });
      }
    } catch (error) {
      console.error("Erro ao buscar empresas da API:", error);
    }
  }

  function selectCompany(company: Empresa | null) {
    setSelectedCompanyState(company);
    if (company) {
      localStorage.setItem("selectedCompany", JSON.stringify(company));
    } else {
      localStorage.removeItem("selectedCompany");
    }
  }

  async function createCompany(nome: string): Promise<Empresa> {
    const resp = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.erro ?? "Erro ao cadastrar empresa");
    }

    const newCompany = await resp.json();
    setCompanies((prev) => [...prev, newCompany].sort((a, b) => a.nome.localeCompare(b.nome)));
    selectCompany(newCompany);
    return newCompany;
  }

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        loading,
        selectCompany,
        loadCompanies,
        createCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany deve ser usado dentro de um CompanyProvider");
  }
  return context;
}
