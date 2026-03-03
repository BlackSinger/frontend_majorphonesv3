import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, getAuth } from 'firebase/auth';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

interface TransactionRecord {
  id: string;
  option: string;
  date: string;
  status: string;
  amount: number;
  transactionId: string;
  isVcc?: boolean;
  cardNumber?: string;
  expirationDate?: string;
  cvv?: string;
  cardHolderName?: string;
  initialFunds?: number;
}

const renderExpirationDate = (exp: string | undefined) => {
  if (!exp) return '';
  if (exp.length === 4 && !exp.includes('/')) return `${exp.substring(0, 2)}/${exp.substring(2, 4)}`;
  if (exp.includes('/')) {
    const [m, y] = exp.split('/');
    if (y && y.length === 4) return `${m}/${y.substring(2, 4)}`;
  }
  return exp;
};

const MajorTransactionsUser: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [selectedType, setSelectedType] = useState('numbers');
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchedEmail, setSearchedEmail] = useState('');
  const [transactionData, setTransactionData] = useState<TransactionRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('All');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPaymentMethodDropdownOpen, setIsPaymentMethodDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const paymentMethodDropdownRef = useRef<HTMLDivElement>(null);

  const [showVccInfoModal, setShowVccInfoModal] = useState(false);
  const [selectedVccInfo, setSelectedVccInfo] = useState<TransactionRecord | null>(null);
  const [isInfoIdCopied, setIsInfoIdCopied] = useState(false);
  const [isCardNumberCopied, setIsCardNumberCopied] = useState(false);

  const handleCopyOrderId = async () => {
    if (!selectedVccInfo?.transactionId) return;
    try {
      await navigator.clipboard.writeText(selectedVccInfo.transactionId);
      setIsInfoIdCopied(true);
      setTimeout(() => setIsInfoIdCopied(false), 2000);
    } catch (err) { }
  };

  const handleCopyCardNumber = async () => {
    if (!selectedVccInfo?.cardNumber) return;
    try {
      await navigator.clipboard.writeText(selectedVccInfo.cardNumber.replace(/\s/g, ''));
      setIsCardNumberCopied(true);
      setTimeout(() => setIsCardNumberCopied(false), 2000);
    } catch (err) { }
  };

  const itemsPerPage = 10;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (paymentMethodDropdownRef.current && !paymentMethodDropdownRef.current.contains(event.target as Node)) {
        setIsPaymentMethodDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, paymentMethodFilter]);

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

      const [rechargesResponse, vccResponse] = await Promise.all([
        fetch('https://getuserrecharges-ezeznlhr5a-uc.a.run.app', {
          method: 'POST',
          headers: {
            'authorization': `${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: email.trim() })
        }),
        fetch('https://getUserVCCTransactions-ezeznlhr5a-uc.a.run.app', {
          method: 'POST',
          headers: {
            'authorization': `${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: email.trim() })
        })
      ]);

      const rechargesData = await rechargesResponse.json();
      const vccData = await vccResponse.json();

      console.log('getuserrecharges response:', rechargesData);
      console.log('getUserVCCTransactions response:', vccData);

      if (!rechargesResponse.ok || !vccResponse.ok) {
        if (rechargesData.message === 'Forbidden' || vccData.message === 'Forbidden') {
          // Sign out user immediately
          const auth = getAuth();
          await signOut(auth);
          navigate('/signin');
          return;
        } else if (rechargesData.message === 'User not found' || vccData.message === 'User not found') {
          setErrorMessage('User not found');
          setShowErrorModal(true);
          setLoading(false);
          return;
        } else {
          setErrorMessage("There was a problem getting all user's transactions");
          setShowErrorModal(true);
          setLoading(false);
          return;
        }
      }

      // Parse Recharges
      let formattedRecharges: any[] = [];
      if (rechargesData.message !== 'No recharges found') {
        const rechargesArray = rechargesData.recharges || rechargesData;
        if (Array.isArray(rechargesArray)) {
          formattedRecharges = rechargesArray.map((item: any) => {
            let formattedDate = 'N/A';
            if (item.createdAt && item.createdAt._seconds) {
              const date = new Date(item.createdAt._seconds * 1000);
              formattedDate = date.toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              });
            }

            return {
              id: item.orderId || Math.random().toString(),
              option: item.paymentMethod || 'N/A',
              date: formattedDate,
              status: item.status || 'N/A',
              amount: item.amount || 0,
              transactionId: item.orderId || 'N/A'
            };
          });
        }
      }

      // Parse VCC
      let formattedVCC: any[] = [];
      if (vccData.message === "VCC transactions found" && Array.isArray(vccData.transactions)) {
        formattedVCC = vccData.transactions.map((item: any) => {
          let formattedDate = 'N/A';
          if (item.createdAt && item.createdAt._seconds) {
            const date = new Date(item.createdAt._seconds * 1000);
            formattedDate = date.toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            });
          }

          const optionVal = item.type === 'Load Funds' ? 'Load Funds to VCC' : (item.type || 'N/A');

          let initialFundsVal = typeof item.initialFunds === 'number' ? item.initialFunds : parseFloat(item.initialFunds);
          if (isNaN(initialFundsVal)) {
            initialFundsVal = typeof item.balance === 'number' ? item.balance : parseFloat(item.balance);
            if (isNaN(initialFundsVal)) initialFundsVal = 0;
          }

          return {
            id: item.orderId || item.cardId || Math.random().toString(),
            option: optionVal,
            date: formattedDate,
            status: item.status || 'N/A',
            amount: item.totalPrice || item.initialFunds || 0,
            transactionId: item.orderId || 'N/A',
            isVcc: true,
            cardNumber: item.cardNumber || '',
            expirationDate: item.expirationDate || '',
            cvv: item.cvv || '',
            cardHolderName: item.cardHolderName || 'N/A',
            initialFunds: initialFundsVal
          };
        });
      }

      const combinedData = [...formattedRecharges, ...formattedVCC];
      setTransactionData(combinedData);
      setSearchedEmail(email.trim());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      setErrorMessage("There was a problem getting all user's transactions");
      setShowErrorModal(true);
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    let filtered = transactionData;

    if (statusFilter !== 'All') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    if (paymentMethodFilter !== 'All') {
      if (paymentMethodFilter === 'Static Wallets') {
        const staticWalletMethods = ['USDT Tether', 'USDC Polygon', 'Pol Polygon', 'TRX Tron', 'LTC', 'ETH', 'BTC', 'Static Wallet'];
        filtered = filtered.filter(record => staticWalletMethods.includes(record.option));
      } else {
        filtered = filtered.filter(record => record.option === paymentMethodFilter);
      }
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [statusFilter, paymentMethodFilter, transactionData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Created':
        return 'text-cyan-400 border-cyan-500/30';
      case 'Pending':
        return 'text-yellow-400 border-yellow-500/30';
      case 'Completed':
        return 'text-green-400 border-green-500/30';
      case 'Cancelled':
        return 'text-red-400 border-red-500/30';
      case 'Expired':
        return 'text-gray-400 border-gray-500/30';
      case 'Overpayment':
        return 'text-blue-400 border-blue-500/30';
      case 'Underpayment':
        return 'text-orange-400 border-orange-500/30';
      default:
        return 'text-gray-400 border-gray-500/30';
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
                User Transactions
              </h1>
              <p className="text-slate-300 text-md text-left">View the user's transactions</p>
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

      {/* User Email Display - Show only if we have searched */}
      {searchedEmail && (
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left">
              <span className="text-slate-300 font-semibold">Viewing transactions for:</span>
              <span className="text-emerald-400 font-bold break-words max-w-full">{searchedEmail}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              Go back
            </button>
          </div>
        </div>
      )}

      {/* Filters and Table - Show only if we have searched */}
      {searchedEmail && (
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
          <div className="p-6">
            {/* Filters */}
            <div className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Method Filter */}
                <div>
                  <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                    Payment Method
                  </label>
                  <div className="relative group" ref={paymentMethodDropdownRef}>
                    <div
                      onClick={() => setIsPaymentMethodDropdownOpen(!isPaymentMethodDropdownOpen)}
                      className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                    >
                      <span>{paymentMethodFilter === 'All' ? 'All Methods' : paymentMethodFilter}</span>
                    </div>

                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isPaymentMethodDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Custom Dropdown Options */}
                    {isPaymentMethodDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-[60] max-h-60 overflow-y-auto text-sm">
                        {['All', 'Admin Update', 'Amazon Pay', 'Cryptomus', 'Static Wallets', 'Load Funds to VCC', 'Alipay (China)', 'PayNow (Singapore)', 'VietQR (Vietnam)', 'Credit Card (South Africa)', 'Bank Card (Nigeria)', 'Bank Transfer (Nigeria)', 'Airtel Money (Kenya)', 'MTN Mobile Money (Rwanda)', 'Airtel Money (Rwanda)', 'Tigo Pesa (Tanzania)', 'MTN Mobile Money (Uganda)', 'Airtel Money (Uganda)', 'Credit Card (South Korea)', 'PAYCO (South Korea)', 'Samsung Pay (South Korea)', 'KakaoPay (South Korea)'].map((method) => (
                          <div
                            key={method}
                            onClick={() => {
                              setPaymentMethodFilter(method);
                              setIsPaymentMethodDropdownOpen(false);
                            }}
                            className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                          >
                            <span className="text-white">{method === 'All' ? 'All Methods' : method}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                    Transaction Status
                  </label>
                  <div className="relative group" ref={statusDropdownRef}>
                    <div
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                    >
                      <span>{statusFilter === 'All' ? 'All Statuses' : statusFilter}</span>
                    </div>

                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Custom Dropdown Options */}
                    {isStatusDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-[60] max-h-60 overflow-y-auto text-sm">
                        {['All', 'Created', 'Pending', 'Completed', 'Cancelled', 'Expired', 'Overpayment', 'Underpayment'].map((status) => (
                          <div
                            key={status}
                            onClick={() => {
                              setStatusFilter(status);
                              setIsStatusDropdownOpen(false);
                            }}
                            className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                          >
                            <span className="text-white">{status === 'All' ? 'All Statuses' : status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-y-visible">
              {filteredData.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Option</th>
                      <th className="text-center py-4 px-6 text-slate-300 font-semibold">Date</th>
                      <th className="text-center py-4 px-5 text-slate-300 font-semibold">Status</th>
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Amount</th>
                      <th className="text-center py-4 px-6 text-slate-300 font-semibold">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((record, index) => (
                      <tr
                        key={record.id}
                        className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200 ${index % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'
                          }`}
                      >
                        <td className="py-4 px-6 text-white">{record.option}</td>
                        <td className="py-4 px-6 text-white">{record.date}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold border w-32 ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-emerald-400 font-semibold">${record.amount.toFixed(2)}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {record.isVcc ? (
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => {
                                  setSelectedVccInfo(record);
                                  setShowVccInfoModal(true);
                                }}
                                className="p-2 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded-lg hover:bg-slate-700/30"
                                title="View VCC Info"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono text-blue-500 font-semibold">{record.transactionId}</span>
                          )}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  {transactionData.length === 0 && (statusFilter !== 'All' || paymentMethodFilter !== 'All') ? (
                    <>
                      <h3 className="text-xl font-bold text-slate-300 mb-3">No Transactions Found</h3>
                      <p className="text-slate-400 text-lg">No transactions match your current filters</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-slate-300 mb-3">No Transactions Found</h3>
                      <p className="text-slate-400 text-lg">This user has not made recharges</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredData.length > 0 && totalPages > 1 && (
              <div className="mt-6">
                {/* Results info - shown above pagination on small screens */}
                <div className="text-sm text-slate-400 text-center mb-4 md:hidden">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} results
                </div>

                <div className="flex items-center justify-between">
                  {/* Results info - shown on left side on larger screens */}
                  <div className="hidden md:block text-sm text-slate-400">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} results
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
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${currentPage === page
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

      {/* VCC Info Modal */}
      {showVccInfoModal && selectedVccInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto flex items-center justify-center mb-2">
                <img src={MajorPhonesFavIc} alt="Major Phones" className="w-12 h-10" />
              </div>
              <h3 className="text-lg font-semibold text-white">VCC Info</h3>
            </div>
            <div className="space-y-3 text-left">
              <div>
                <span className="text-slate-300">Transaction ID: </span>
                <span className="text-emerald-400 break-all">{selectedVccInfo.transactionId}
                  <button
                    onClick={handleCopyOrderId}
                    className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                    title={isInfoIdCopied ? "Copied!" : "Copy Transaction ID"}
                  >
                    {isInfoIdCopied ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </span>
              </div>
              <div>
                <span className="text-slate-300">Card Number: </span>
                <span className="text-emerald-400 font-mono">{(selectedVccInfo.cardNumber?.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ')) || selectedVccInfo.cardNumber}
                  <button
                    onClick={handleCopyCardNumber}
                    className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                    title={isCardNumberCopied ? "Copied!" : "Copy Card Number"}
                  >
                    {isCardNumberCopied ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </span>
              </div>
              <div>
                <span className="text-slate-300">Expiration Date: </span>
                <span className="text-emerald-400">{renderExpirationDate(selectedVccInfo.expirationDate)}</span>
              </div>
              <div>
                <span className="text-slate-300">CVV: </span>
                <span className="text-emerald-400 font-mono">{selectedVccInfo.cvv}</span>
              </div>
              <div>
                <span className="text-slate-300">Cardholder name: </span>
                <span className="text-emerald-400">{selectedVccInfo.cardHolderName}</span>
              </div>
              <div>
                <span className="text-slate-300">Initial Funds: </span>
                <span className="text-emerald-400 font-semibold">${(selectedVccInfo.initialFunds || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => {
                  setShowVccInfoModal(false);
                  setSelectedVccInfo(null);
                }}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-6 rounded-xl transition-all duration-300 shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MajorTransactionsUser;