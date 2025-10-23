import React from 'react';
import MajorSidebar from './MajorSidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const MajorDashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {

  return (
    <div className="flex h-screen" style={{backgroundColor: '#1e293b'}}>
      {/* Sidebar */}
      <MajorSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Mobile Menu Button */}
        <div className="lg:hidden border-b border-slate-600/50 px-4 py-2 flex justify-start" style={{backgroundColor: '#1e293b'}}>
          <button
            onClick={() => {
              const sidebar = document.querySelector('[data-sidebar]');
              const overlay = document.querySelector('[data-overlay]');
              const isOpen = sidebar?.classList.contains('translate-x-0');

              if (isOpen) {
                sidebar?.classList.add('-translate-x-full');
                sidebar?.classList.remove('translate-x-0');
                overlay?.classList.add('hidden');
              } else {
                sidebar?.classList.remove('-translate-x-full');
                sidebar?.classList.add('translate-x-0');
                overlay?.classList.remove('hidden');
              }
            }}
            className="text-white p-2 rounded-lg border border-slate-600 hover:border-blue-500 transition-all duration-300 hover:bg-slate-700/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <main
          className="flex-1 overflow-y-auto p-4 lg:p-8 dashboard-scrollbar"
          style={{
            backgroundColor: '#1e293b',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(71, 85, 105, 0.6) rgba(30, 41, 59, 0.3)'
          }}
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MajorDashboardLayout;
