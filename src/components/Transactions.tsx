import React, { useState, useMemo } from 'react';
import DashboardLayout from './DashboardLayout';

interface TransactionRecord {
  id: string;
  type: 'Cryptomus' | 'Amazon Pay' | 'Binance Pay' | 'Payeer';
  date: string;
  status: 'Completed' | 'Pending' | 'Cancelled' | 'Overpayment' | 'Underpayment';
  amount: number;
  transactionId: string;
}

const Transactions: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Mock transaction data
  const transactionData: TransactionRecord[] = [
    {
      id: '1',
      type: 'Cryptomus',
      date: '2024-01-16 14:30',
      status: 'Completed',
      amount: 25.00,
      transactionId: 'TXN-2024-001234'
    },
    {
      id: '2',
      type: 'Amazon Pay',
      date: '2024-01-16 10:15',
      status: 'Pending',
      amount: 50.00,
      transactionId: 'TXN-2024-001235'
    },
    {
      id: '3',
      type: 'Binance Pay',
      date: '2024-01-15 16:45',
      status: 'Completed',
      amount: 100.00,
      transactionId: 'TXN-2024-001236'
    },
    {
      id: '4',
      type: 'Payeer',
      date: '2024-01-14 09:20',
      status: 'Overpayment',
      amount: 75.25,
      transactionId: 'TXN-2024-001237'
    },
    {
      id: '5',
      type: 'Cryptomus',
      date: '2024-01-13 11:30',
      status: 'Completed',
      amount: 15.50,
      transactionId: 'TXN-2024-001238'
    },
    {
      id: '6',
      type: 'Amazon Pay',
      date: '2024-01-12 13:45',
      status: 'Cancelled',
      amount: 200.00,
      transactionId: 'TXN-2024-001239'
    },
    {
      id: '7',
      type: 'Binance Pay',
      date: '2024-01-11 15:20',
      status: 'Underpayment',
      amount: 45.80,
      transactionId: 'TXN-2024-001240'
    },
    {
      id: '8',
      type: 'Payeer',
      date: '2024-01-10 08:15',
      status: 'Completed',
      amount: 35.00,
      transactionId: 'TXN-2024-001241'
    },
    {
      id: '9',
      type: 'Cryptomus',
      date: '2024-01-09 17:30',
      status: 'Completed',
      amount: 80.00,
      transactionId: 'TXN-2024-001242'
    },
    {
      id: '10',
      type: 'Amazon Pay',
      date: '2024-01-08 12:10',
      status: 'Pending',
      amount: 30.50,
      transactionId: 'TXN-2024-001243'
    }
  ];

  // Filter the data based on selected filters
  const filteredData = useMemo(() => {
    let filtered = transactionData;

    if (statusFilter !== 'All') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [statusFilter]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'Pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'Cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'Overpayment':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Underpayment':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  // Get transaction type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Cryptomus':
        return 'bg-orange-500/10 text-orange-400';
      case 'Amazon Pay':
        return 'bg-blue-500/10 text-blue-400';
      case 'Binance Pay':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'Payeer':
        return 'bg-purple-500/10 text-purple-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <DashboardLayout currentPath="/transactions">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 via-emerald-600/5 to-teal-600/10"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-green-100 to-emerald-100 bg-clip-text text-transparent">
                  Transactions
                </h1>
                <p className="text-slate-300 text-lg">View and manage all your financial transactions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Table */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 via-emerald-600/5 to-teal-600/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10 p-8">
            {/* Filters */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Status Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-green-300 uppercase tracking-wider mb-3">
                    Transaction Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm appearance-none cursor-pointer"
                  >
                    <option value="All" className="bg-slate-800">All Statuses</option>
                    <option value="Completed" className="bg-slate-800">Completed</option>
                    <option value="Pending" className="bg-slate-800">Pending</option>
                    <option value="Cancelled" className="bg-slate-800">Cancelled</option>
                    <option value="Overpayment" className="bg-slate-800">Overpayment</option>
                    <option value="Underpayment" className="bg-slate-800">Underpayment</option>
                  </select>
                </div>

                {/* Results Count */}
                <div className="flex items-end">
                  <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{filteredData.length}</div>
                      <div className="text-sm text-slate-400">Transactions</div>
                    </div>
                  </div>
                </div>

                {/* Balance Summary */}
                <div className="flex items-end">
                  <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400">
                        ${filteredData.reduce((sum, transaction) => sum + transaction.amount, 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-slate-400">Total</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {filteredData.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Type</th>
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Date</th>
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Status</th>
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Amount</th>
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((record, index) => (
                      <tr 
                        key={record.id} 
                        className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getTypeColor(record.type)}`}>
                            {record.type}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-300">{record.date}</td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`font-semibold text-lg ${record.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {record.amount >= 0 ? '+' : ''}${record.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-cyan-400 font-semibold text-sm">{record.transactionId}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* Empty State */
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700 rounded-2xl mb-6">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-300 mb-3">No Transactions Found</h3>
                  <p className="text-slate-400 text-lg">No transactions match your current filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;