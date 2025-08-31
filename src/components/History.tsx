import React, { useState, useMemo } from 'react';
import DashboardLayout from './DashboardLayout';

interface HistoryRecord {
  id: string;
  number: string;
  serviceType: 'Short Numbers' | 'Middle Numbers' | 'Long Numbers' | 'Empty Simcard';
  status: 'Pending' | 'Cancelled' | 'Completed' | 'Inactive' | 'Active' | 'Expired';
  service: string;
  price: number;
  duration: string;
  code: string;
}

const History: React.FC = () => {
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Mock history data
  const historyData: HistoryRecord[] = [
    {
      id: '1',
      number: '+1-555-0123',
      serviceType: 'Short Numbers',
      status: 'Completed',
      service: 'WhatsApp',
      price: 0.15,
      duration: 'Single Use',
      code: '123456'
    },
    {
      id: '2',
      number: '+1-555-0456',
      serviceType: 'Short Numbers',
      status: 'Pending',
      service: 'Telegram',
      price: 0.12,
      duration: 'Single Use',
      code: 'Waiting...'
    },
    {
      id: '3',
      number: '+1-555-0789',
      serviceType: 'Middle Numbers',
      status: 'Active',
      service: 'Instagram',
      price: 2.50,
      duration: '7 days',
      code: '789012'
    },
    {
      id: '4',
      number: '+1-555-0321',
      serviceType: 'Middle Numbers',
      status: 'Expired',
      service: 'Twitter',
      price: 1.80,
      duration: '1 day',
      code: '345678'
    },
    {
      id: '5',
      number: '+1-555-0654',
      serviceType: 'Long Numbers',
      status: 'Active',
      service: 'Facebook',
      price: 15.50,
      duration: '30 days',
      code: '901234'
    },
    {
      id: '6',
      number: '+1-555-0987',
      serviceType: 'Empty Simcard',
      status: 'Active',
      service: 'Empty Simcard',
      price: 25.00,
      duration: '30 days',
      code: '567890'
    },
    {
      id: '7',
      number: '+1-555-0111',
      serviceType: 'Short Numbers',
      status: 'Cancelled',
      service: 'Discord',
      price: 0.18,
      duration: 'Single Use',
      code: 'Cancelled'
    },
    {
      id: '8',
      number: '+1-555-0222',
      serviceType: 'Long Numbers',
      status: 'Inactive',
      service: 'LinkedIn',
      price: 12.80,
      duration: '30 days',
      code: 'N/A'
    }
  ];

  // Get available statuses based on service type
  const getAvailableStatuses = (serviceType: string) => {
    switch (serviceType) {
      case 'Short Numbers':
        return ['Pending', 'Cancelled', 'Completed'];
      case 'Middle Numbers':
      case 'Long Numbers':
      case 'Empty Simcard':
        return ['Inactive', 'Active', 'Expired'];
      default:
        return ['Pending', 'Cancelled', 'Completed', 'Inactive', 'Active', 'Expired'];
    }
  };

  // Filter the data based on selected filters
  const filteredData = useMemo(() => {
    let filtered = historyData;

    if (serviceTypeFilter !== 'All') {
      filtered = filtered.filter(record => record.serviceType === serviceTypeFilter);
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    return filtered;
  }, [serviceTypeFilter, statusFilter]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'Completed':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'Inactive':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      case 'Expired':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'Cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  // Get service type color
  const getServiceTypeColor = (serviceType: string) => {
    switch (serviceType) {
      case 'Short Numbers':
        return 'bg-emerald-500/10 text-emerald-400';
      case 'Middle Numbers':
        return 'bg-orange-500/10 text-orange-400';
      case 'Long Numbers':
        return 'bg-purple-500/10 text-purple-400';
      case 'Empty Simcard':
        return 'bg-cyan-500/10 text-cyan-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <DashboardLayout currentPath="/history">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-pink-600/10"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-indigo-100 to-purple-100 bg-clip-text text-transparent">
                  Purchase History
                </h1>
                <p className="text-slate-300 text-lg">View and manage all your number purchases</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Table */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-pink-600/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10 p-8">
            {/* Filters */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Service Type Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-3">
                    Service Type
                  </label>
                  <select
                    value={serviceTypeFilter}
                    onChange={(e) => {
                      setServiceTypeFilter(e.target.value);
                      setStatusFilter('All'); // Reset status filter when service type changes
                    }}
                    className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500/50 transition-all duration-300 backdrop-blur-sm appearance-none cursor-pointer"
                  >
                    <option value="All" className="bg-slate-800">All Services</option>
                    <option value="Short Numbers" className="bg-slate-800">Short Numbers</option>
                    <option value="Middle Numbers" className="bg-slate-800">Middle Numbers</option>
                    <option value="Long Numbers" className="bg-slate-800">Long Numbers</option>
                    <option value="Empty Simcard" className="bg-slate-800">Empty Simcard</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-3">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500/50 transition-all duration-300 backdrop-blur-sm appearance-none cursor-pointer"
                  >
                    <option value="All" className="bg-slate-800">All Statuses</option>
                    {getAvailableStatuses(serviceTypeFilter).map(status => (
                      <option key={status} value={status} className="bg-slate-800">{status}</option>
                    ))}
                  </select>
                </div>

                {/* Results Count */}
                <div className="flex items-end">
                  <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{filteredData.length}</div>
                      <div className="text-sm text-slate-400">Records</div>
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
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Number</th>
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Service Type</th>
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Status</th>
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Service</th>
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Price</th>
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Duration</th>
                      <th className="text-left py-4 px-6 text-slate-300 font-semibold">Code</th>
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
                          <div className="font-mono text-white font-semibold">{record.number}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getServiceTypeColor(record.serviceType)}`}>
                            {record.serviceType}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-300">{record.service}</td>
                        <td className="py-4 px-6">
                          <span className="text-emerald-400 font-semibold">${record.price.toFixed(2)}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-300">{record.duration}</td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-cyan-400 font-semibold">{record.code}</span>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-300 mb-3">No Records Found</h3>
                  <p className="text-slate-400 text-lg">No purchase history matches your current filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default History;