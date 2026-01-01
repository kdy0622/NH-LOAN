import React from 'react';
import { NH_COLORS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  isAdmin: boolean;
  onToggleAdmin: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, isAdmin, onToggleAdmin }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5f9] text-gray-900">
      <header className="bg-white border-b border-gray-100 px-6 py-2 flex justify-between items-center sticky top-0 z-50 shadow-sm bg-white/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm" style={{ backgroundColor: NH_COLORS.primary }}>
            NH
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-800 tracking-tight">
              NH <span className="text-green-600">여신 파트너</span> Pro
            </h1>
            <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Administrative Dashboard</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={onToggleAdmin}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isAdmin ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </button>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-4 max-w-[1400px]">
        {children}
      </main>
      <footer className="py-4 text-center text-[8px] font-bold text-gray-300 bg-white border-t border-gray-50">
        &copy; 2024 NH LOAN CENTER. INTERNAL ONLY.
      </footer>
    </div>
  );
};