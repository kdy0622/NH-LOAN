
import React from 'react';
import { NH_COLORS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  isAdmin: boolean;
  onToggleAdmin: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, isAdmin, onToggleAdmin }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-gray-900">
      <header className="bg-white border-b border-gray-100 px-8 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm backdrop-blur-xl bg-white/90">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-green-100 transform -rotate-2" style={{ backgroundColor: NH_COLORS.primary }}>
            NH
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-800 tracking-tight flex items-center gap-2">
              NH <span className="text-green-600">여신 파트너</span>
              <span className="text-[9px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100 font-bold">Pro v3.2</span>
            </h1>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.25em]">Loan Professional Dashboard</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-gray-700">심사 분석 센터</p>
          </div>
          <button 
            onClick={onToggleAdmin}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isAdmin ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </button>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6 max-w-[1600px]">
        {children}
      </main>
      <footer className="py-6 text-center text-[9px] font-bold text-gray-300 border-t border-gray-100 bg-white">
        &copy; 2024 NH BANK LOAN CENTER. INTERNAL CONFIDENTIAL DATA.
      </footer>
    </div>
  );
};
