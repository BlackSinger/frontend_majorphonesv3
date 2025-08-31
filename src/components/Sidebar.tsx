import React, { useState } from 'react';

interface SidebarProps {
  currentPath?: string;
}

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath = '/dashboard' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
        </svg>
      ),
      path: '/dashboard'
    },
    {
      name: 'Short Numbers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 6h18M3 14h18M3 18h18" />
        </svg>
      ),
      path: '/short',
    },
    {
      name: 'Middle Numbers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 6h10M7 14h10M7 18h10" />
        </svg>
      ),
      path: '/middle'
    },
    {
      name: 'Long Numbers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M5 6h14M5 14h14M5 18h14M3 22h18M3 2h18" />
        </svg>
      ),
      path: '/long'
    },
    {
      name: 'Empty Simcard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      path: '/emptysimcard'
    },
    {
      name: 'History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: '/history'
    },
    {
      name: 'Transactions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      path: '/transactions',
    }
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden bg-gradient-to-br from-slate-700 to-slate-800 text-white p-2.5 rounded-xl shadow-xl hover:from-blue-600 hover:to-cyan-600 border border-slate-600 hover:border-blue-500 transition-all duration-300 hover:scale-110"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 border-r border-slate-600 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Enhanced Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Geometric patterns */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2364748b' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          
          {/* Floating orbs */}
          <div className="absolute top-20 right-8 w-32 h-32 bg-gradient-to-r from-blue-500/20 to-cyan-400/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-40 left-6 w-24 h-24 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/3 right-4 w-16 h-16 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 rounded-full blur-lg animate-pulse delay-2000"></div>
          
        </div>

        <div className="flex flex-col h-full relative z-10">
          {/* Header */}
          <div className="px-6 py-8 border-b border-slate-600/50 bg-slate-800/50">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <svg className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-white font-bold text-xl tracking-tight drop-shadow-sm">Major Phones</h1>
                <p className="text-slate-300 text-sm font-medium">SMS verification service</p>
              </div>
            </div>
          </div>


          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg transform scale-105'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50 hover:scale-102'
                  }`}
                >
                  {/* Active item glow effect */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 blur-sm"></div>
                  )}
                  
                  <div className={`mr-3 transition-all duration-300 relative z-10 ${
                    isActive ? 'text-blue-100 drop-shadow-sm' : 'text-slate-400 group-hover:text-blue-400'
                  }`}>
                    {item.icon}
                  </div>
                  
                  <span className="flex-1 font-medium relative z-10">{item.name}</span>
                  
                  {item.badge && (
                    <span className="ml-2 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full shadow-sm animate-pulse relative z-10">
                      {item.badge}
                    </span>
                  )}
                  
                  {isActive && (
                    <div className="ml-2 w-2 h-2 bg-cyan-300 rounded-full animate-pulse relative z-10 shadow-sm"></div>
                  )}
                </a>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-600/50 space-y-3 bg-slate-800/30">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center p-3 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-300 border border-slate-600/30 hover:border-blue-500/50 hover:shadow-lg hover:scale-105 group">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center mb-1 group-hover:from-blue-500 group-hover:to-cyan-500 transition-all duration-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM4.828 7l6.586 6.586a2 2 0 002.828 0l6.586-6.586a2 2 0 000-2.828L14.242 2.172a2 2 0 00-2.828 0L4.828 4.828a2 2 0 000 2.828z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">API</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-300 border border-slate-600/30 hover:border-blue-500/50 hover:shadow-lg hover:scale-105 group">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center mb-1 group-hover:from-blue-500 group-hover:to-cyan-500 transition-all duration-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Help</span>
              </button>
            </div>

            {/* Logout */}
            <button className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-slate-300 hover:text-red-400 bg-slate-800/50 hover:bg-red-900/20 rounded-xl transition-all duration-300 border border-slate-600/30 hover:border-red-500/50 group shadow-lg hover:scale-105">
              <svg className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>

            {/* Version with enhanced styling */}
            <div className="text-center pt-3">
              <div className="inline-flex items-center px-3 py-1 bg-slate-800/50 rounded-full border border-slate-600/30">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse mr-2"></div>
                <p className="text-slate-400 text-xs font-medium">Version 2.1.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;