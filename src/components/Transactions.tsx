import React, { useState, useMemo, useEffect, useRef } from 'react';
import DashboardLayout from './DashboardLayout';

interface TransactionRecord {
  id: string;
  option: 'Cryptomus' | 'Amazon Pay' | 'Admin Update' | 'Payeer' | 'USDT Tether' | 'USDC' | 'Matic' | 'Tron';
  date: string;
  status: 'Completed' | 'Pending' | 'Cancelled' | 'Overpayment' | 'Underpayment';
  amount: number;
  transactionId: string;
}

const Transactions: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('All');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPaymentMethodDropdownOpen, setIsPaymentMethodDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const paymentMethodDropdownRef = useRef<HTMLDivElement>(null);
  
  const itemsPerPage = 10;

  // Close dropdowns when clicking outside
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

  // Mock transaction data
  const transactionData: TransactionRecord[] = [
    {
      id: '1',
      option: 'Cryptomus',
      date: '2024-01-16 14:30',
      status: 'Completed',
      amount: 25.00,
      transactionId: '3bbf097f-d4cb-4257-a3da-2dcc4a35cd05'
    },
    {
      id: '2',
      option: 'Amazon Pay',
      date: '2024-01-16 10:15',
      status: 'Pending',
      amount: 50.00,
      transactionId: '2775a296-2104-4b6e-84ba-cb8019c794bc'
    },
    {
      id: '3',
      option: 'Admin Update',
      date: '2024-01-15 16:45',
      status: 'Completed',
      amount: 100.00,
      transactionId: 'ddff38cf-885b-46ea-80e9-43786a639be9'
    },
    {
      id: '4',
      option: 'Payeer',
      date: '2024-01-14 09:20',
      status: 'Overpayment',
      amount: 75.25,
      transactionId: '12ac2d54-7dbd-4278-8b77-4df9dfe63f21'
    },
    {
      id: '5',
      option: 'Cryptomus',
      date: '2024-01-13 11:30',
      status: 'Completed',
      amount: 15.50,
      transactionId: '8df45a40-addb-4456-82dd-29dae51054f3	'
    },
    {
      id: '6',
      option: 'Amazon Pay',
      date: '2024-01-12 13:45',
      status: 'Cancelled',
      amount: 200.00,
      transactionId: '5313b2de-1762-4650-975c-15c026abec2a	'
    },
    {
      id: '7',
      option: 'Admin Update',
      date: '2024-01-11 15:20',
      status: 'Underpayment',
      amount: 45.80,
      transactionId: 'd9e55079-d080-484c-87a3-494472e00923'
    },
    {
      id: '8',
      option: 'Payeer',
      date: '2024-01-10 08:15',
      status: 'Completed',
      amount: 35.00,
      transactionId: 'b5d01a1a-4340-4f8a-b472-f2958a019f72'
    },
    {
      id: '9',
      option: 'Cryptomus',
      date: '2024-01-09 17:30',
      status: 'Completed',
      amount: 80.00,
      transactionId: 'a94a22e5-6779-48cf-a95c-adadd81ec180'
    },
    {
      id: '10',
      option: 'Amazon Pay',
      date: '2024-01-08 12:10',
      status: 'Pending',
      amount: 30.50,
      transactionId: '3cc7fa95-207f-4571-9c8c-b889e0f5ef0e'
    },
    {
      id: '11',
      option: 'Amazon Pay',
      date: '2024-01-08 12:10',
      status: 'Pending',
      amount: 30.50,
      transactionId: '3cc7fa95-207f-4571-9c8c-b889e0f5ef0e'
    },
    {
      id: '12',
      option: 'USDT Tether',
      date: '2024-01-07 09:25',
      status: 'Completed',
      amount: 150.00,
      transactionId: 'b7f9c3d2-8e41-4a92-b654-7c8d9e1f2a3b'
    },
    {
      id: '13',
      option: 'USDC',
      date: '2024-01-06 16:30',
      status: 'Pending',
      amount: 85.75,
      transactionId: 'f4a2b8c7-1d3e-4f5g-6h7i-8j9k0l1m2n3o'
    },
    {
      id: '14',
      option: 'Matic',
      date: '2024-01-05 11:45',
      status: 'Completed',
      amount: 65.20,
      transactionId: 'c9e5d8a1-2b4f-3c6e-7d9a-1e2f3c4d5e6f'
    },
    {
      id: '15',
      option: 'Tron',
      date: '2024-01-04 14:15',
      status: 'Overpayment',
      amount: 95.40,
      transactionId: 'a3f7b2c8-5d9e-4a1b-6c2d-3e4f5a6b7c8d'
    }
  ];

  // Filter the data based on selected filters
  const filteredData = useMemo(() => {
    let filtered = transactionData;

    if (statusFilter !== 'All') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    if (paymentMethodFilter !== 'All') {
      filtered = filtered.filter(record => record.option === paymentMethodFilter);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [statusFilter, paymentMethodFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, paymentMethodFilter]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-green-400 border-green-500/30';
      case 'Pending':
        return 'text-yellow-400 border-yellow-500/30';
      case 'Cancelled':
        return 'text-red-400 border-red-500/30';
      case 'Overpayment':
        return 'text-blue-400 border-blue-500/30';
      case 'Underpayment':
        return 'text-orange-400 border-orange-500/30';
      default:
        return 'text-gray-400 border-gray-500/30';
    }
  };

  // Get transaction option color
  const getOptionColor = (option: string) => {
    switch (option) {
      case 'Cryptomus':
        return 'bg-orange-500/10 text-orange-400';
      case 'Amazon Pay':
        return 'bg-blue-500/10 text-blue-400';
      case 'Admin Update':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'Payeer':
        return 'bg-purple-500/10 text-purple-400';
      case 'USDT Tether':
        return 'bg-green-500/10 text-green-400';
      case 'USDC':
        return 'bg-cyan-500/10 text-cyan-400';
      case 'Matic':
        return 'bg-indigo-500/10 text-indigo-400';
      case 'Tron':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
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
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Payment Method Filter */}
                <div className="flex-1">
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
                        {['All', 'Cryptomus', 'Amazon Pay', 'Admin Update', 'Payeer', 'USDT Tether', 'USDC', 'Matic', 'Tron'].map((method) => (
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
                <div className="flex-1">
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
                        {['All', 'Completed', 'Pending', 'Cancelled', 'Overpayment', 'Underpayment'].map((status) => (
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