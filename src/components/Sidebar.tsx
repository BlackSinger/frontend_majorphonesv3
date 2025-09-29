import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import LogoMajor from '../LogoMajor.png';

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
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOut(auth);
      navigate('/signin');
    } catch (error: any) {
      console.error('Error signing out:', error);

      let errorMessage = 'An error occurred while signing out';

      switch (error.code) {
        case 'auth/network-request-failed':
          errorMessage = 'You are experiencing network errors, please try again';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts, please try again later';
          break;
        case 'auth/internal-error':
          errorMessage = 'An unexpected error occurred, please try again';
          break;
        default:
          errorMessage = 'An unexpected error occurred, please try again';
      }

      setModalMessage(errorMessage);
      setShowModal(true);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

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
      name: 'Empty SIM cards',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      path: '/emptysimcard'
    },
    {
      name: 'Virtual Debit Cards',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      path: '/virtualcard'
    },
    {
      name: 'Proxies',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      path: '/proxies'
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
    },
    {
      name: 'Open a Ticket',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: '/tickets'
    }
  ];


  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style>{`
        .sidebar-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .sidebar-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 10px;
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.6);
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.8);
        }
      `}</style>

      {/* Mobile Overlay */}
      <div 
        data-overlay
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden hidden"
        onClick={() => {
          const sidebar = document.querySelector('[data-sidebar]');
          const overlay = document.querySelector('[data-overlay]');
          sidebar?.classList.add('-translate-x-full');
          sidebar?.classList.remove('translate-x-0');
          overlay?.classList.add('hidden');
        }}
      />

      {/* Sidebar */}
      <div 
        data-sidebar
        className="fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-600 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 -translate-x-full lg:-translate-x-0" 
        style={{backgroundColor: '#1e293b'}}
      >
        

        <div className="flex flex-col h-full relative z-10">
          {/* Header */}
          <div className="border-b border-slate-600/50 bg-slate-800/50" style={{ paddingTop: '0.05rem', paddingBottom: '0.05rem' }}>
            <div className="flex items-center justify-center">
              {/* Logo */}
              <img src={LogoMajor} alt="Major Phones Logo" className="w-50 h-20" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-5 overflow-y-auto sidebar-scrollbar" 
               style={{
                 scrollbarWidth: 'thin',
                 scrollbarColor: 'rgba(71, 85, 105, 0.6) rgba(30, 41, 59, 0.3)'
               }}>
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
              <a href="mailto:support@majorphones.com" className="flex flex-col items-center justify-center p-3 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-300 border border-slate-600/30 hover:border-blue-500/50 hover:shadow-lg hover:scale-105 group">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center mb-1 group-hover:from-blue-500 group-hover:to-cyan-500 transition-all duration-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Email</span>
              </a>
            </div>

            {/* Logout */}
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-slate-300 hover:text-red-400 bg-slate-800/50 hover:bg-red-900/20 rounded-xl transition-all duration-300 border border-slate-600/30 hover:border-red-500/50 group shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSigningOut ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2 text-slate-300" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Error Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Sign Out Error</h3>
              <p className="text-blue-200 mb-4">{modalMessage}</p>
              <button
                onClick={handleModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;