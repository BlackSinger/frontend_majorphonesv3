import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';

const Profile: React.FC = () => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isPasswordChangeRequested, setIsPasswordChangeRequested] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [show2FAConfirmation, setShow2FAConfirmation] = useState(false);

  // Mock user data - in real app would come from context/API
  const userEmail = 'user@example.com';

  const handlePasswordChangeRequest = () => {
    setIsPasswordChangeRequested(true);
    setShowPasswordConfirmation(true);
    
    // Simulate API call
    setTimeout(() => {
      setShowPasswordConfirmation(false);
    }, 3000);
  };

  const handle2FAToggle = () => {
    setIs2FAEnabled(!is2FAEnabled);
    setShow2FAConfirmation(true);
    
    // Simulate API call
    setTimeout(() => {
      setShow2FAConfirmation(false);
    }, 3000);
  };

  return (
    <DashboardLayout currentPath="/profile">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 via-gray-600/5 to-zinc-600/10"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-slate-400/20 to-gray-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-500 to-gray-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-100 to-gray-100 bg-clip-text text-transparent">
                  Profile Settings
                </h1>
                <p className="text-slate-300 text-lg">Manage your account settings and security preferences</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 via-gray-600/5 to-zinc-600/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-slate-400/20 to-gray-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              
              {/* Account Information Section */}
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-600/30">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Account Information</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <div className="flex items-center space-x-3 p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-white font-mono text-lg">{userEmail}</span>
                      <div className="ml-auto">
                        <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg text-sm font-semibold">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-600/30">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Security Settings</h2>
                </div>
                
                <div className="space-y-6">
                  {/* Password Change */}
                  <div className="p-6 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Password Change</h3>
                          <p className="text-slate-400">Request a password reset via email</p>
                        </div>
                      </div>
                      <button
                        onClick={handlePasswordChangeRequest}
                        disabled={isPasswordChangeRequested}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                          isPasswordChangeRequested
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed'
                            : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white shadow-lg hover:shadow-yellow-500/25 hover:scale-105'
                        }`}
                      >
                        {isPasswordChangeRequested ? 'Email Sent!' : 'Request Change'}
                      </button>
                    </div>
                    
                    {showPasswordConfirmation && (
                      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-green-400 font-semibold">Password reset email sent to {userEmail}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="p-6 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Two-Factor Authentication</h3>
                          <p className="text-slate-400">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`text-sm font-semibold ${is2FAEnabled ? 'text-green-400' : 'text-slate-400'}`}>
                          {is2FAEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                          onClick={handle2FAToggle}
                          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 shadow-lg ${
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
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-blue-400 font-semibold">
                            Two-Factor Authentication has been {is2FAEnabled ? 'enabled' : 'disabled'}
                          </span>
                        </div>
                      </div>
                    )}

                    {is2FAEnabled && !show2FAConfirmation && (
                      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <svg className="w-5 h-5 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-purple-400 font-semibold mb-1">2FA is currently enabled</p>
                            <p className="text-slate-400 text-sm">You'll be prompted for a verification code when signing in.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-600/30">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-slate-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Account Actions</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 text-left group">
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
                  
                  <button className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-red-500/50 transition-all duration-300 text-left group">
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
    </DashboardLayout>
  );
};

export default Profile;