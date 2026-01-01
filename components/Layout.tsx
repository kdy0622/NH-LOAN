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
      <header className="bg-white border-b border-gray-100 px-4 py-1.5 flex justify-between items-center sticky top-0 z-50 shadow-sm bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center font-black text-white text-[10px]" style={{ backgroundColor: NH_COLORS.primary }}>
            NH
          </div>
          <div>
            <h1 className="text-xs font-black text-gray-800 tracking-tighter leading-none">
              NH <span className="text-green-600">여신 파트너</span> Pro
            </h1>
            <p className="text-[6px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">Admin Management System</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={onToggleAdmin}
            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
              isAdmin ? 'bg-red-50 text-red-600 border border-red-100 shadow-inner' : 'bg-gray-50 text-gray-400 border border-gray-100'
            }`}
            title="관리자 모드"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-2 py-2 max-w-[1200px]">
        {children}
      </main>
      <footer className="py-2 text-center text-[7px] font-bold text-gray-300 bg-white border-t border-gray-50 no-print">
        &copy; 2024 NH LOAN CENTER. INTERNAL USE ONLY.
      </footer>
    </div>
  );
};