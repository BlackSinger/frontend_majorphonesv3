import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, getAuth } from 'firebase/auth';

const MajorUser: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [selectedType, setSelectedType] = useState('numbers');
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchedEmail, setSearchedEmail] = useState('');
  const [balance, setBalance] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSearch = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter an email address');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);

    try {
      const currentUser = getAuth().currentUser;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const idToken = await currentUser.getIdToken();

      const response = await fetch('https://getuserbalance-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message === 'Forbidden') {
          // Sign out user immediately
          const auth = getAuth();
          await signOut(auth);
          navigate('/signin');
          return;
        } else if (data.message === 'Internal Server Error') {
          setErrorMessage('Error');
          setShowErrorModal(true);
          setLoading(false);
          return;
        }
      }

      // Log response for debugging
      console.log('Backend response:', data);

      // Set searched email and balance
      setSearchedEmail(email.trim());
      setBalance(data.balance?.toString() || '0');
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user balance:', error);
      setErrorMessage('Error');
      setShowErrorModal(true);
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!balance.trim()) {
      setErrorMessage('Please enter a balance amount');
      setShowErrorModal(true);
      return;
    }

    setUpdating(true);

    try {
      const currentUser = getAuth().currentUser;

      if (!currentUser) {
        console.log('No current user found');
        setUpdating(false);
        return;
      }

      const idToken = await currentUser.getIdToken();
      console.log('idToken obtained:', idToken ? 'Token exists' : 'Token is undefined');
      console.log('Sending request with email:', searchedEmail, 'amount:', parseFloat(balance));

      const response = await fetch('https://updatebalanceuser-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: searchedEmail,
          amount: parseFloat(balance)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message === 'Forbidden') {
          // Sign out user immediately
          const auth = getAuth();
          await signOut(auth);
          navigate('/signin');
          return;
        } else if (data.message === 'Internal Server Error') {
          setErrorMessage('Error');
          setShowErrorModal(true);
          setUpdating(false);
          return;
        }
      }

      // Show success modal
      setShowSuccessModal(true);
      setUpdating(false);
    } catch (error) {
      console.error('Error updating user balance:', error);
      setErrorMessage('Error');
      setShowErrorModal(true);
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  User
                </h1>
                <p className="text-slate-300 text-md text-left">View the user's info</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Form - Hide when we have searched */}
        {!searchedEmail && (
          <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6">
          <div className="space-y-6 flex flex-col items-center">
            {/* Email Search Bar */}
            <div className="w-full max-w-sm">
              <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user email"
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Search Button */}
            <div className="w-full max-w-sm">
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* User Balance Display - Show only if we have searched */}
        {searchedEmail && (
          <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6">
            <div className="flex flex-col items-center justify-center gap-6">
              {/* Viewing balance for section */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left">
                <span className="text-slate-300 font-semibold">Viewing balance for:</span>
                <span className="text-emerald-400 font-bold break-words max-w-full">{searchedEmail}</span>
              </div>

              {/* Balance Input */}
              <div className="w-full max-w-sm">
                <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3 text-center">
                  Balance
                </label>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0"
                  disabled={updating}
                  className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-center disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Action Buttons */}
              <div className="w-full max-w-sm flex gap-4">
                {/* Go Back Button */}
                <button
                  onClick={() => window.location.reload()}
                  disabled={updating}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Go back
                </button>

                {/* Update Button */}
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={updating}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                  {updating ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80 max-w-md">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center bg-red-500/20 rounded-full">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Error</h3>
                <p className="text-blue-200 mb-4">{errorMessage}</p>
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setShowErrorModal(false);
                      setErrorMessage('');
                    }}
                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                  >
                    Ok
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80 max-w-md">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center bg-green-500/20 rounded-full">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Success</h3>
                <p className="text-blue-200 mb-4">This user's balance has been updated</p>
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                    }}
                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                  >
                    Ok
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default MajorUser;