import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, getAuth } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';

interface UserRecord {
  uid: string;
  email: string;
  balance: number;
}

const MajorExtra: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [userData, setUserData] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchHighBalanceUsers = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          setLoading(false);
          return;
        }

        const idToken = await user.getIdToken();

        const response = await fetch('https://gethighbalanceusers-ezeznlhr5a-uc.a.run.app', {
          method: 'GET',
          headers: {
            'authorization': `${idToken}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.message === 'Forbidden') {
            // Sign out user immediately
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

        // Extract users array from response
        const usersArray = data.users || [];

        // Format the data
        const formattedUsers = usersArray.map((user: any) => ({
          uid: user.uid || '',
          email: user.email || '',
          balance: user.balance || 0
        }));

        setUserData(formattedUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching high balance users:', error);
        setErrorMessage('Error');
        setShowErrorModal(true);
        setLoading(false);
      }
    };

    fetchHighBalanceUsers();
  }, [currentUser, navigate]);

  const totalPages = Math.ceil(userData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = userData.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Extra
                </h1>
                <p className="text-slate-300 text-md text-left">View high-balance users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
          <div className='pb-6 px-6 pt-2'>
            {/* Table */}
            <div className="overflow-x-auto overflow-y-visible">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-slate-400 mt-4">Loading Users...</p>
                </div>
              ) : userData.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">ID</th>
                      <th className="text-center py-4 px-6 text-slate-300 font-semibold">Email</th>
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((user, index) => (
                      <tr
                        key={user.uid}
                        className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <span className="font-mono text-blue-500 font-semibold">{user.uid}</span>
                        </td>
                        <td className="py-4 px-6 text-white">{user.email}</td>
                        <td className="py-4 px-6">
                          <span className="text-emerald-400 font-semibold">${user.balance.toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* Empty State */
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-5">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-300 mb-3">No Users Found</h3>
                  <p className="text-slate-400 text-lg">No high-balance users available</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {userData.length > 0 && totalPages > 1 && (
              <div className="mt-6">
                {/* Results info - shown above pagination on small screens */}
                <div className="text-sm text-slate-400 text-center mb-4 md:hidden">
                  Showing {startIndex + 1} to {Math.min(endIndex, userData.length)} of {userData.length} results
                </div>

                <div className="flex items-center justify-between">
                  {/* Results info - shown on left side on larger screens */}
                  <div className="hidden md:block text-sm text-slate-400">
                    Showing {startIndex + 1} to {Math.min(endIndex, userData.length)} of {userData.length} results
                  </div>
                  
                  <div className="flex items-center space-x-2 mx-auto md:mx-0">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Page Numbers - Show current and next page only */}
                  <div className="flex space-x-1">
                    {[currentPage, currentPage + 1].filter(page => page <= totalPages).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                          currentPage === page
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-800/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

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
      </div>
  );
};

export default MajorExtra;