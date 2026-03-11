"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface HeaderContextType {
  mobileMenuOpen: boolean;
  companyDropdownOpen: boolean;
  servicesDropdownOpen: boolean;
  languageDropdownOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  setCompanyDropdownOpen: (open: boolean) => void;
  setServicesDropdownOpen: (open: boolean) => void;
  setLanguageDropdownOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  closeAllDropdowns: () => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const closeAllDropdowns = () => {
    setCompanyDropdownOpen(false);
    setServicesDropdownOpen(false);
    setLanguageDropdownOpen(false);
  };

  return (
    <HeaderContext.Provider
      value={{
        mobileMenuOpen,
        companyDropdownOpen,
        servicesDropdownOpen,
        languageDropdownOpen,
        setMobileMenuOpen,
        setCompanyDropdownOpen,
        setServicesDropdownOpen,
        setLanguageDropdownOpen,
        toggleMobileMenu,
        closeMobileMenu,
        closeAllDropdowns,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error("useHeader must be used within HeaderProvider");
  }
  return context;
}
