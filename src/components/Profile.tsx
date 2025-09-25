import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from './DashboardLayout';

const Profile: React.FC = () => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isPasswordChangeRequested, setIsPasswordChangeRequested] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [show2FAConfirmation, setShow2FAConfirmation] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const { currentUser } = useAuth();

  // Fetch user email from Firestore
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!currentUser) {
        setUserEmail(null);
        setIsLoadingEmail(false);
        return;
      }

      try {
        setIsLoadingEmail(true);
        setEmailError(null);

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserEmail(userData.email || 'No email found');
        } else {
          setUserEmail('No email found');
        }
      } catch (error: any) {
        console.error('Error fetching user email:', error);
        let errorMessage = 'Failed to load email';

        if (error.code === 'permission-denied') {
          errorMessage = 'Access denied to email information';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Service temporarily unavailable, try again later';
        } else if (error.code === 'unauthenticated') {
          errorMessage = 'Authentication required';
        }

        setEmailError(errorMessage);
        setShowEmailModal(true);
        setUserEmail(null);
      } finally {
        setIsLoadingEmail(false);
      }
    };

    fetchUserEmail();
  }, [currentUser]);

  // Page load animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePasswordChangeRequest = () => {
    setIsPasswordChangeRequested(true);
    setShowPasswordConfirmation(true);
  };

  const handle2FAToggle = () => {
    setIs2FAEnabled(!is2FAEnabled);
    setShow2FAConfirmation(true);

    setTimeout(() => {
      setShow2FAConfirmation(false);
    }, 3000);
  };

  const handleEmailModalClose = () => {
    setShowEmailModal(false);
  };

  const renderEmailContent = () => {
    if (isLoadingEmail) {
      return (
        <div className="flex justify-center">
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }

    if (emailError) {
      return '-';
    }

    return userEmail || '-';
  };

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style>{`
        .dashboard-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .dashboard-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 10px;
        }
        .dashboard-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.6);
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        .dashboard-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.8);
        }
      `}</style>
      
    <DashboardLayout currentPath="/profile">
      
      <div className={`space-y-6 transition-all duration-1000 ${isLoaded ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
        {/* Header */}
        <div 
          className="group rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden hover:shadow-3xl transition-all duration-500 hover:scale-[1.01] cursor-pointer"
          style={{
            backgroundColor: '#1e293b',
            animationDelay: '200ms',
            animation: isLoaded ? 'slideInFromTop 0.8s ease-out forwards' : 'none'
          }}
        >
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 group-hover:transform group-hover:translate-x-2 transition-transform duration-500">
              
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-blue-300 transition-all duration-500">
                  Profile Settings
                </h1>
                <p className="text-left text-slate-300 text-md group-hover:text-slate-200 transition-colors duration-300">Manage your account settings and security preferences</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div 
          className="group rounded-3xl shadow-2xl border border-slate-600/50 p-6 relative overflow-hidden hover:shadow-3xl transition-all duration-500"
          style={{
            backgroundColor: '#1e293b',
            animationDelay: '800ms',
            animation: isLoaded ? 'slideInFromBottom 0.8s ease-out forwards' : 'none'
          }}
        >
          
          <div className="relative z-10 p-2">
            <div className="justify-center space-y-8">
              
              {/* Account Information Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/section">
                <div className="flex items-center space-x-3 mb-4 group-hover/section:transform group-hover/section:translate-y-1 transition-transform duration-300">
                  <p className="font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover/section:from-cyan-300 group-hover/section:to-blue-300 transition-all duration-500" style={{ fontSize: '1.2rem' }}>Email Address</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl border border-slate-600/50 hover:bg-slate-600/50 hover:border-slate-500/50 transition-all duration-300 group/email">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <svg className="w-5 h-5 text-slate-400 group-hover/email:text-blue-400 transition-colors duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-white font-mono text-md group-hover/email:text-blue-100 transition-colors duration-300 truncate">{renderEmailContent()}</span>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg text-sm font-semibold group-hover/email:bg-green-500/20 group-hover/email:border-green-500/40 transition-all duration-300">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/section">
                <div className="flex items-center space-x-3 mb-4 group-hover/section:transform group-hover/section:translate-y-1 transition-transform duration-300">
                  <h2 className="font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover/section:from-cyan-300 group-hover/section:to-blue-300 transition-all duration-500" style={{ fontSize: '1.2rem' }}>Security Settings</h2>
                </div>
                
                <div className="space-y-6">
                  {/* Password Change */}
                  <div className="p-6 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/item">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 group-hover/item:transform group-hover/item:translate-x-2 transition-transform duration-500 flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-left font-bold text-white group-hover/item:text-yellow-100 transition-colors duration-300" style={{ fontSize: '1rem' }}>Password Change</h3>
                          <p className="text-left text-slate-400 group-hover/item:text-slate-300 transition-colors duration-300">Request a password reset via email</p>
                        </div>
                      </div>
                      {!showPasswordConfirmation && (
                        <div className="flex-shrink-0">
                          <button
                            onClick={handlePasswordChangeRequest}
                            disabled={isPasswordChangeRequested}
                            className={`p-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 w-full sm:w-auto ${
                              isPasswordChangeRequested
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg'
                            }`}
                          >
                            {isPasswordChangeRequested ? 'Send Email' : 'Request Change'}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {showPasswordConfirmation && (
                      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center sm:space-x-2">
                          <svg className="hidden sm:block w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-green-400 font-semibold text-sm sm:text-base">Password reset email sent</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="p-6 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/item">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 group-hover/item:transform group-hover/item:translate-x-2 transition-transform duration-500 flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-left font-bold text-white group-hover/item:text-purple-100 transition-colors duration-300" style={{ fontSize: '1rem' }}>Two-Factor Authentication</h3>
                          <p className="text-left text-slate-400 group-hover/item:text-slate-300 transition-colors duration-300">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 flex-shrink-0 min-w-0">
                        <span className={`text-sm font-semibold flex-shrink-0 ${is2FAEnabled ? 'text-green-400' : 'text-slate-400'}`}>
                          {is2FAEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                          onClick={handle2FAToggle}
                          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 shadow-lg flex-shrink-0 ${
                            is2FAEnabled ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
                              is2FAEnabled ? 'translate-x-9 shadow-green-500/50' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    {show2FAConfirmation && (
                      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-start sm:space-x-2">
                          <svg className="hidden sm:block w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-blue-400 font-semibold break-words text-sm sm:text-base">
                            Two-Factor Authentication has been {is2FAEnabled ? 'enabled' : 'disabled'}
                          </span>
                        </div>
                      </div>
                    )}

                    {is2FAEnabled && !show2FAConfirmation && (
                      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <div className="flex items-start sm:space-x-3">
                          <svg className="hidden sm:block w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-purple-400 font-semibold mb-1 break-words text-sm sm:text-base">Two-Factor Authentication is already enabled</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/section">
                <div className="flex items-center space-x-3 mb-4 group-hover/section:transform group-hover/section:translate-y-1 transition-transform duration-300">
                  <h2 className="font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover/section:from-cyan-300 group-hover/section:to-blue-300 transition-all duration-500" style={{ fontSize: '1.2rem' }}>Account Actions</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="p-3 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 text-left group">
                    <div className="flex items-center space-x-3">
                      <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors duration-300">Export Data</h3>
                        <p className="text-sm text-slate-400">Download your account data</p>
                      </div>
                    </div>
                  </button>
                  
                  <button className="p-3 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-red-500/50 transition-all duration-300 text-left group">
                    <div className="flex items-center space-x-3">
                      <svg className="w-6 h-6 text-slate-400 group-hover:text-red-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors duration-300">Delete Account</h3>
                        <p className="text-sm text-slate-400">Permanently remove your account</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Error Modal */}
      {showEmailModal && (
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
              <h3 className="text-lg font-medium text-white mb-2">Email Error</h3>
              <p className="text-blue-200 mb-4">{emailError}</p>
              <button
                onClick={handleEmailModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    </>
  );
};

export default Profile;