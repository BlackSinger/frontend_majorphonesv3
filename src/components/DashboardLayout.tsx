import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [hideBalanceTimeout, setHideBalanceTimeout] = useState<NodeJS.Timeout | null>(null);
  // Function to fetch balance when eye icon is clicked
  const handleShowBalance = async () => {
    if (!currentUser) {
      setBalanceError('User not authenticated');
      setShowErrorModal(true);
      return;
    }

    setIsLoadingBalance(true);
    setBalanceError(null);

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);

      // Use onSnapshot for a single read
      const unsubscribe = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const rawBalance = userData.balance || 0;
            setBalance(parseFloat(rawBalance) || 0);
            setShowBalance(true);
            setIsLoadingBalance(false);

            // Clear any existing timeout
            if (hideBalanceTimeout) {
              clearTimeout(hideBalanceTimeout);
            }

            // Set timeout to hide balance after 5 seconds
            const timeout = setTimeout(() => {
              setShowBalance(false);
              setBalance(null);
            }, 5000);

            setHideBalanceTimeout(timeout);

            // Unsubscribe immediately after getting the data
            unsubscribe();
          } else {
            setBalance(0);
            setShowBalance(true);
            setIsLoadingBalance(false);
            unsubscribe();
          }
        },
        (error: any) => {
          let errorMessage = 'Failed to load balance';

          if (error.code === 'permission-denied') {
            errorMessage = 'Access denied to balance information';
          } else if (error.code === 'unavailable') {
            errorMessage = 'Service temporarily unavailable, try again later';
          } else if (error.code === 'unauthenticated') {
            errorMessage = 'Authentication required';
          }

          setBalanceError(errorMessage);
          setShowErrorModal(true);
          setBalance(null);
          setIsLoadingBalance(false);
          setShowBalance(false);
        }
      );
    } catch (error) {
      setBalanceError('Error loading balance');
      setShowErrorModal(true);
      setIsLoadingBalance(false);
      setShowBalance(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideBalanceTimeout) {
        clearTimeout(hideBalanceTimeout);
      }
    };
  }, [hideBalanceTimeout]);

  const formatBalance = (amount: number | null) => {
    if (amount === null) return '-';

    if (Number.isInteger(amount)) {
      return `$${amount.toLocaleString('en-US')}`;
    } else {
      return `$${amount.toFixed(2).replace(/\.00$/, '')}`;
    }
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
  };

  const renderBalanceContent = () => {
    if (isLoadingBalance) {
      return (
        <div className="flex justify-center mt-1">
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }

    if (!showBalance) {
      return (
        <button
          onClick={handleShowBalance}
          className="flex items-center justify-center hover:opacity-80 transition-opacity"
        >
          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      );
    }

    return formatBalance(balance);
  };

  return (
    <div className="flex h-screen" style={{backgroundColor: '#1e293b'}}>
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Navbar */}
        <nav className="border-b border-slate-600/50 px-4 lg:px-10 py-2 relative" style={{backgroundColor: '#1e293b'}}>
          
          <div className="flex items-center justify-between lg:justify-end relative z-10">
            {/* Mobile Menu Button - Integrated in navbar */}
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
              className="lg:hidden text-white p-2 rounded-lg border border-slate-600 hover:border-blue-500 transition-all duration-300 hover:bg-slate-700/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Right side - Combined User Actions */}
            <div className="flex items-center">
              {/* Desktop Version - Full layout */}
              <div className="hidden md:block group bg-slate-700/50 hover:bg-slate-600/50 rounded-2xl p-2 border border-slate-600/50 hover:border-blue-500/50 backdrop-blur-sm transition-all duration-300 hover:scale-104">
                <div className="flex items-center space-x-4">
                  {/* Profile Section */}
                  <Link to="/profile" className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm group-hover:text-cyan-200 transition-colors duration-300">Profile</p>
                    </div>
                  </Link>

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
                      <div className="text-white font-bold text-sm group-hover:text-emerald-200 transition-colors duration-300 flex justify-center">{renderBalanceContent()}</div>
                    </div>
                  </div>

                  {/* Separator 2 */}
                  <div className="w-px h-12 bg-slate-600/50 group-hover:bg-emerald-500/30 transition-colors duration-300"></div>

                  {/* Add Funds Section */}
                  <Link to="/add-funds" className="flex items-center space-x-2 text-slate-300 group-hover:text-purple-300 transition-colors duration-300">
                    <div className="w-10 h-10 bg-slate-600/50 group-hover:bg-purple-500/20 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                      <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Add Funds</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Mobile/Tablet Version - Compact icons only */}
              <div className="md:hidden flex items-center space-x-2">
                {/* Profile Icon */}
                <Link to="/profile" className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl border border-slate-600/50 hover:border-blue-500/50 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </Link>

                {/* Balance Display */}
                <div className="p-2 bg-slate-700/50 rounded-xl border border-slate-600/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <span className="text-white text-sm font-semibold">{renderBalanceContent()}</span>
                  </div>
                </div>

                {/* Add Funds Icon */}
                <Link to="/add-funds" className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl border border-slate-600/50 hover:border-blue-500/50 transition-all duration-300">
                  <div className="w-8 h-8 bg-slate-600/50 hover:bg-slate-500/50 rounded-lg flex items-center justify-center transition-all duration-300">
                    <svg className="w-4 h-4 text-white hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                </Link>
              </div>
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

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Balance Error</h3>
              <p className="text-blue-200 mb-4">{balanceError}</p>
              <button
                onClick={handleErrorModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;