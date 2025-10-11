import React, { useState, useMemo, useEffect, useRef } from 'react';
import DashboardLayout from './DashboardLayout';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

interface TransactionRecord {
  id: string;
  option: 'Cryptomus' | 'Amazon Pay' | 'Admin Update' | 'Payeer' | 'USDT Tether' | 'USDC' | 'Matic' | 'Tron';
  date: string;
  status: 'Created' | 'Pending' | 'Completed' | 'Cancelled' | 'Expired' | 'Overpayment' | 'Underpayment';
  amount: number;
  transactionId: string;
}

const Transactions: React.FC = () => {
  const { currentUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('All');
  // const [staticWalletFilter, setStaticWalletFilter] = useState<string>('All');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPaymentMethodDropdownOpen, setIsPaymentMethodDropdownOpen] = useState(false);
  // const [isStaticWalletDropdownOpen, setIsStaticWalletDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionData, setTransactionData] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const paymentMethodDropdownRef = useRef<HTMLDivElement>(null);
  // const staticWalletDropdownRef = useRef<HTMLDivElement>(null);
  
  const itemsPerPage = 10;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (paymentMethodDropdownRef.current && !paymentMethodDropdownRef.current.contains(event.target as Node)) {
        setIsPaymentMethodDropdownOpen(false);
      }
      // if (staticWalletDropdownRef.current && !staticWalletDropdownRef.current.contains(event.target as Node)) {
      //   setIsStaticWalletDropdownOpen(false);
      // }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const rechargesRef = collection(db, 'recharges');
    const q = query(
      rechargesRef,
      where('uid', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const transactions: TransactionRecord[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();

          let formattedDate = '';
          if (data.createdAt) {
            const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            formattedDate = date.toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            }).replace(',', ', ');
          }

          let displayPaymentMethod = data.paymentMethod || 'Unknown';
          if (data.paymentMethod === 'Static Wallet') {
            displayPaymentMethod = 'Static Wallet';
          }

          transactions.push({
            id: doc.id,
            option: displayPaymentMethod,
            date: formattedDate,
            status: data.status || 'Pending',
            amount: data.amount || 0,
            transactionId: doc.id
          });
        });

        setTransactionData(transactions);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const filteredData = useMemo(() => {
    let filtered = transactionData;

    if (statusFilter !== 'All') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    if (paymentMethodFilter !== 'All') {
      if (paymentMethodFilter === 'Static Wallets') {
        const staticWalletMethods = ['USDT Tether', 'USDC Polygon', 'Pol Polygon', 'TRX Tron', 'LTC', 'ETH', 'BTC', 'Static Wallet'];
        filtered = filtered.filter(record => staticWalletMethods.includes(record.option));

        // Apply static wallet sub-filter if selected
        // if (staticWalletFilter !== 'All') {
        //   filtered = filtered.filter(record => record.option === staticWalletFilter);
        // }
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

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, paymentMethodFilter]);

  // Reset static wallet filter when payment method changes
  // useEffect(() => {
  //   if (paymentMethodFilter !== 'Static Wallets') {
  //     setStaticWalletFilter('All');
  //   }
  // }, [paymentMethodFilter]);

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
    <DashboardLayout currentPath="/transactions">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Transactions
                </h1>
                <p className="text-slate-300 text-md text-left">View and manage all your financial transactions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Table */}
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
                        {['All', 'Admin Update', 'Amazon Pay', 'Cryptomus', 'Payeer', 'Static Wallets'].map((method) => (
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

                {/* Static Wallets Filter - Only show when Static Wallets is selected */}
                {/* {paymentMethodFilter === 'Static Wallets' && (
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                      Static Wallets
                    </label>
                    <div className="relative group" ref={staticWalletDropdownRef}>
                      <div
                        onClick={() => setIsStaticWalletDropdownOpen(!isStaticWalletDropdownOpen)}
                        className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                      >
                        <span>{staticWalletFilter === 'All' ? 'All Wallets' : staticWalletFilter}</span>
                      </div>

                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isStaticWalletDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-[60] max-h-60 overflow-y-auto text-sm">
                        {['All', 'BTC', 'ETH', 'LTC', 'Pol Polygon', 'TRX Tron', 'USDT Tether', 'USDC Polygon'].map((wallet) => (
                          <div
                            key={wallet}
                            onClick={() => {
                              setStaticWalletFilter(wallet);
                              setIsStaticWalletDropdownOpen(false);
                            }}
                            className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                          >
                            <span className="text-white">{wallet === 'All' ? 'All Wallets' : wallet}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )} */}

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
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-slate-400 mt-4">Loading transactions...</p>
                </div>
              ) : filteredData.length > 0 ? (
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
                        className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'
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
                        <td className="py-4 px-6">
                          <span className="font-mono text-blue-500 font-semibold">{record.transactionId}</span>
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
                  <h3 className="text-xl font-bold text-slate-300 mb-3">No Transactions Found</h3>
                  <p className="text-slate-400 text-lg">No transactions match your current filters</p>
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

                  {/* Page Numbers */}
                  <div className="flex space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
      </div>
    </DashboardLayout>
  );
};

export default Transactions;