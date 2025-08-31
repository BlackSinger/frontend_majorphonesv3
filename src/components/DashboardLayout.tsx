import React from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentPath }) => {
  return (
    <div className="flex h-screen" style={{backgroundColor: '#1e293b'}}>
      {/* Sidebar */}
      <Sidebar currentPath={currentPath} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top Bar - Mobile spacing for hamburger button */}
        <div className="lg:hidden h-16"></div>
        
        {/* Navbar */}
        <nav className="border-b border-slate-600/50 px-4 lg:px-10 py-2 relative" style={{backgroundColor: '#1e293b'}}>
          
          <div className="flex items-center justify-end relative z-10">
            {/* Right side - Combined User Actions */}
            <div className="flex items-center">
              {/* Combined Profile, Balance & Add Funds Button */}
              <a href="/profile" className="group bg-slate-700/50 hover:bg-slate-600/50 rounded-2xl p-2 border border-slate-600/50 hover:border-blue-500/50 backdrop-blur-sm transition-all duration-300 hover:scale-104">
                <div className="flex items-center space-x-4">
                  {/* Profile Section */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm group-hover:text-cyan-200 transition-colors duration-300">Profile</p>
                    </div>
                  </div>

                  {/* Separator 1 */}
                  <div className="w-px h-12 bg-slate-600/50 group-hover:bg-blue-500/30 transition-colors duration-300"></div>

                  {/* Balance Section */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs font-medium group-hover:text-slate-300 transition-colors duration-300">Balance</p>
                      <p className="text-white font-bold text-sm group-hover:text-emerald-200 transition-colors duration-300">$2,847.50</p>
                    </div>
                  </div>

                  {/* Separator 2 */}
                  <div className="w-px h-12 bg-slate-600/50 group-hover:bg-emerald-500/30 transition-colors duration-300"></div>

                  {/* Add Funds Section */}
                  <a href="/add-funds" className="flex items-center space-x-2 text-slate-300 group-hover:text-purple-300 transition-colors duration-300">
                    <div className="w-8 h-8 bg-slate-600/50 group-hover:bg-purple-500/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                      <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Add Funds</p>
                    </div>
                  </a>
                </div>
              </a>
            </div>
          </div>
        </nav>
        
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

export default DashboardLayout;