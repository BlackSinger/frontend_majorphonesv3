import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

interface HistoryRecord {
  id: string;
  date: string;
  expirationDate: string;
  number: string;
  serviceType: 'Short Numbers' | 'Middle Numbers' | 'Long Numbers' | 'Empty SIM card';
  status: 'Pending' | 'Cancelled' | 'Completed' | 'Inactive' | 'Active' | 'Expired';
  service: string;
  price: number;
  duration: string;
  code: string;
  country: string;
}

interface VirtualCardRecord {
  id: string;
  purchaseDate: string;
  price: number;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  funds: number;
}

const History: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState<'numbers' | 'virtualCards'>(
    tabFromUrl === 'virtualCards' ? 'virtualCards' : 'numbers'
  );
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isServiceTypeDropdownOpen, setIsServiceTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentVirtualCardPage, setCurrentVirtualCardPage] = useState(1);
  const [showUuidModal, setShowUuidModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isInfoIdCopied, setIsInfoIdCopied] = useState(false);
  const [copiedCardNumbers, setCopiedCardNumbers] = useState<{[key: string]: boolean}>({});
  const serviceTypeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  
  const itemsPerPage = 10;

  // Mock history data for numbers
  const historyData: HistoryRecord[] = [
    {
      id: '3bbf097f-d4cb-4257-a3da-2dcc4a35cd05',
      date: '2024-10-13 2:28',
      expirationDate: '2024-10-13 14:28',
      number: '+14157358371',
      serviceType: 'Short Numbers',
      status: 'Completed',
      service: 'WhatsApp',
      price: 0.15,
      duration: 'Reusable',
      code: '123456',
      country: 'United States'
    },
    {
      id: 'f7c8d921-4b3a-4e5f-8c9d-1a2b3c4d5e6f',
      date: '2024-10-12 14:45',
      expirationDate: '2024-10-12 15:00',
      number: '+14157358371',
      serviceType: 'Short Numbers',
      status: 'Pending',
      service: 'Service Not Listed',
      price: 0.12,
      duration: 'Single Use',
      code: 'Waiting...',
      country: 'United States'
    },
    {
      id: '2a5c8e9f-7d6b-4c3a-9e8f-5b4c3d2e1f0a',
      date: '2024-10-11 9:15',
      expirationDate: '2024-10-18 9:15',
      number: '+447453011917',
      serviceType: 'Middle Numbers',
      status: 'Active',
      service: 'Instagram',
      price: 2.50,
      duration: '7 days',
      code: '789012',
      country: 'United Kingdom'
    },
    {
      id: '8f3e5c7d-2b1a-4e6f-9c8d-7a5b3c1e2f4d',
      date: '2024-10-10 18:30',
      expirationDate: '2024-10-11 18:30',
      number: '+4915511292487',
      serviceType: 'Middle Numbers',
      status: 'Expired',
      service: 'Google Voice',
      price: 1.80,
      duration: '1 day',
      code: '345678',
      country: 'Germany'
    },
    {
      id: '4d7b2e5c-8f9a-4c3d-7e6f-9a8b7c6d5e4f',
      date: '2024-10-09 7:22',
      expirationDate: '2024-11-08 7:22',
      number: '+33614271382',
      serviceType: 'Long Numbers',
      status: 'Active',
      service: 'Facebook',
      price: 15.50,
      duration: '30 days',
      code: '901234',
      country: 'France'
    },
    {
      id: '9e8f7c6d-5b4a-4e3c-8d7f-6e5d4c3b2a1f',
      date: '2024-10-08 11:45',
      expirationDate: '2024-11-07 11:45',
      number: '+918090943120',
      serviceType: 'Empty SIM card',
      status: 'Active',
      service: 'Empty SIM card',
      price: 25.00,
      duration: '30 days',
      code: '567890',
      country: 'India'
    },
    {
      id: '1f2e3d4c-5b6a-4e7f-8c9d-0a1b2c3d4e5f',
      date: '2024-10-07 16:12',
      expirationDate: '2024-10-07 16:27',
      number: '+14157358371',
      serviceType: 'Short Numbers',
      status: 'Cancelled',
      service: 'Discord',
      price: 0.18,
      duration: 'Single Use',
      code: 'Cancelled',
      country: 'United States'
    },
    {
      id: '6c5b4a3d-2e1f-4c7d-8e9f-5a4b3c2d1e0f',
      date: '2024-10-06 13:33',
      expirationDate: '2024-11-05 13:33',
      number: '+447453011917',
      serviceType: 'Long Numbers',
      status: 'Inactive',
      service: 'LinkedIn',
      price: 12.80,
      duration: '30 days',
      code: 'N/A',
      country: 'United Kingdom'
    },
    {
      id: 'a7d8e9f0-3c4b-4e5d-9f8e-7c6b5a4d3e2f',
      date: '2024-10-05 20:18',
      expirationDate: '2024-11-04 20:18',
      number: '+447453011917',
      serviceType: 'Long Numbers',
      status: 'Inactive',
      service: 'LinkedIn',
      price: 12.80,
      duration: '30 days',
      code: 'N/A',
      country: 'United Kingdom'
    },
    {
      id: '5e4d3c2b-1a9f-4e6d-8c7f-9e8d7c6b5a4d',
      date: '2024-10-04 5:07',
      expirationDate: '2024-10-04 5:22',
      number: '+14157358371',
      serviceType: 'Short Numbers',
      status: 'Cancelled',
      service: 'Discord',
      price: 0.18,
      duration: 'Single Use',
      code: 'Cancelled',
      country: 'United States'
    },
    {
      id: 'b8c9d0e1-4f5a-4e3c-7d8e-0f9e8d7c6b5a',
      date: '2024-10-03 12:54',
      expirationDate: '2024-11-02 12:54',
      number: '+33614271382',
      serviceType: 'Long Numbers',
      status: 'Active',
      service: 'Facebook',
      price: 15.50,
      duration: '30 days',
      code: '901234',
      country: 'France'
    }
  ];

  // Mock history data for virtual debit cards
  const virtualCardData: VirtualCardRecord[] = [
    {
      id: 'vc-1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
      purchaseDate: '2024-01-15 13:56',
      price: 4.50,
      cardNumber: '4532 1234 5678 9012',
      expirationDate: '12/27',
      cvv: '123',
      funds: 0
    },
    {
      id: 'vc-2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
      purchaseDate: '2024-01-14 5:43',
      price: 7.00,
      cardNumber: '5555 4444 3333 2222',
      expirationDate: '08/26',
      cvv: '456',
      funds: 3
    },
    {
      id: 'vc-3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
      purchaseDate: '2024-01-12 12:00',
      price: 4.50,
      cardNumber: '4111 1111 1111 1111',
      expirationDate: '05/28',
      cvv: '789',
      funds: 0
    },
    {
      id: 'vc-4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s',
      purchaseDate: '2024-01-10 8:19',
      price: 7.00,
      cardNumber: '5105 1051 0510 5100',
      expirationDate: '11/25',
      cvv: '012',
      funds: 3
    },
    {
      id: 'vc-5e6f7g8h-9i0j-1k2l-3m4n-5o6p7q8r9s0t',
      purchaseDate: '2024-01-08 1:00',
      price: 4.50,
      cardNumber: '4000 0000 0000 0002',
      expirationDate: '03/29',
      cvv: '345',
      funds: 0
    },
    {
      id: 'vc-6f7g8h9i-0j1k-2l3m-4n5o6p7q8r9s0t1u',
      purchaseDate: '2024-01-05 5:46',
      price: 7.00,
      cardNumber: '5200 8282 8282 8210',
      expirationDate: '07/26',
      cvv: '678',
      funds: 3
    },
    {
      id: 'vc-7g8h9i0j-1k2l-3m4n-5o6p-7q8r9s0t1u2v',
      purchaseDate: '2024-01-04 11:22',
      price: 4.50,
      cardNumber: '4242 4242 4242 4242',
      expirationDate: '09/27',
      cvv: '321',
      funds: 0
    },
    {
      id: 'vc-8h9i0j1k-2l3m-4n5o-6p7q-8r9s0t1u2v3w',
      purchaseDate: '2024-01-03 16:15',
      price: 7.00,
      cardNumber: '5555 5555 5555 4444',
      expirationDate: '10/25',
      cvv: '987',
      funds: 3
    },
    {
      id: 'vc-9i0j1k2l-3m4n-5o6p-7q8r-9s0t1u2v3w4x',
      purchaseDate: '2024-01-02 9:30',
      price: 4.50,
      cardNumber: '4000 0000 0000 0069',
      expirationDate: '04/28',
      cvv: '654',
      funds: 0
    },
    {
      id: 'vc-0j1k2l3m-4n5o-6p7q-8r9s-0t1u2v3w4x5y',
      purchaseDate: '2024-01-01 14:45',
      price: 7.00,
      cardNumber: '6011 0000 0000 0004',
      expirationDate: '06/26',
      cvv: '147',
      funds: 3
    },
    {
      id: 'vc-1k2l3m4n-5o6p-7q8r-9s0t-1u2v3w4x5y6z',
      purchaseDate: '2023-12-31 20:00',
      price: 4.50,
      cardNumber: '3782 822463 10005',
      expirationDate: '12/27',
      cvv: '258',
      funds: 0
    }
  ];

  const serviceTypeOptions = [
    'All',
    'Short Numbers',
    'Middle Numbers', 
    'Long Numbers',
    'Empty SIM card'
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceTypeDropdownRef.current && !serviceTypeDropdownRef.current.contains(event.target as Node)) {
        setIsServiceTypeDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get available statuses based on service type
  const getAvailableStatuses = (serviceType: string) => {
    switch (serviceType) {
      case 'Short Numbers':
        return ['Pending', 'Cancelled', 'Completed'];
      case 'Middle Numbers':
      case 'Long Numbers':
      case 'Empty SIM card':
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

  // Calculate pagination for numbers table
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Calculate pagination for virtual cards table
  const totalVirtualCardPages = Math.ceil(virtualCardData.length / itemsPerPage);
  const virtualCardStartIndex = (currentVirtualCardPage - 1) * itemsPerPage;
  const virtualCardEndIndex = virtualCardStartIndex + itemsPerPage;
  const paginatedVirtualCardData = virtualCardData.slice(virtualCardStartIndex, virtualCardEndIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [serviceTypeFilter, statusFilter]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'text-green-400 border-green-500/30';
      case 'Completed':
        return 'text-blue-400 border-blue-500/30';
      case 'Pending':
        return 'text-yellow-400 border-yellow-500/30';
      case 'Inactive':
        return 'text-gray-400 border-gray-500/30';
      case 'Expired':
        return 'text-red-400 border-red-500/30';
      case 'Cancelled':
        return 'text-red-400 border-red-500/30';
      default:
        return 'text-gray-400 border-gray-500/30';
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
      case 'Empty SIM card':
        return 'bg-cyan-500/10 text-cyan-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  // Get country initials
  const getCountryInitials = (countryName: string) => {
    switch (countryName) {
      case 'United States':
        return 'US';
      case 'United Kingdom':
        return 'GB';
      case 'Germany':
        return 'DE';
      case 'France':
        return 'FR';
      case 'India':
        return 'IN';
      default:
        return countryName.substring(0, 2).toUpperCase();
    }
  };

  // Get short number type name
  const getShortNumberType = (serviceType: string) => {
    switch (serviceType) {
      case 'Short Numbers':
        return 'Short';
      case 'Middle Numbers':
        return 'Middle';
      case 'Long Numbers':
        return 'Long';
      case 'Empty SIM card':
        return 'Empty SIM card';
      default:
        return serviceType;
    }
  };

  // Handle UUID modal
  const handleUuidClick = (uuid: string) => {
    setSelectedUuid(uuid);
    setShowUuidModal(true);
    setIsCopied(false);
  };

  // Handle Info modal
  const handleInfoClick = (record: HistoryRecord) => {
    setSelectedRecord(record);
    setShowInfoModal(true);
    setIsInfoIdCopied(false);
  };

  const handleCopyInfoId = async () => {
    if (selectedRecord) {
      try {
        await navigator.clipboard.writeText(selectedRecord.id);
        setIsInfoIdCopied(true);
        setTimeout(() => setIsInfoIdCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy Number ID:', err);
      }
    }
  };

  const handleCopyCardNumber = async (cardNumber: string, cardId: string) => {
    try {
      await navigator.clipboard.writeText(cardNumber);
      setCopiedCardNumbers(prev => ({ ...prev, [cardId]: true }));
      setTimeout(() => {
        setCopiedCardNumbers(prev => ({ ...prev, [cardId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy card number:', err);
    }
  };

  const handleCopyUuid = async () => {
    try {
      await navigator.clipboard.writeText(selectedUuid);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy UUID:', err);
    }
  };

  return (
    <DashboardLayout currentPath="/history">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Purchase History
                </h1>
                <p className="text-slate-300 text-md text-left">View and manage all your purchases</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Table */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
          <div className="p-6">
            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="flex space-x-4 border-b border-slate-700/50">
                <button
                  onClick={() => {setActiveTab('numbers'); setCurrentPage(1);}}
                  className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                    activeTab === 'numbers'
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  Numbers
                </button>
                <button
                  onClick={() => {setActiveTab('virtualCards'); setCurrentVirtualCardPage(1);}}
                  className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                    activeTab === 'virtualCards'
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  Virtual Debit Cards
                </button>
              </div>
            </div>

            {/* Numbers Tab Content */}
            {activeTab === 'numbers' && (
              <>
                {/* Filters */}
                <div className="mb-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Service Type Filter */}
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                        Service Type
                      </label>
                      <div className="relative group" ref={serviceTypeDropdownRef}>
                        <div
                          onClick={() => setIsServiceTypeDropdownOpen(!isServiceTypeDropdownOpen)}
                          className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                        >
                          <span>{serviceTypeFilter === 'All' ? 'All Services' : serviceTypeFilter}</span>
                        </div>
                        
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isServiceTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Custom Dropdown Options */}
                        {isServiceTypeDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-[60] max-h-60 overflow-y-auto text-sm">
                            {serviceTypeOptions.map((option) => (
                              <div
                                key={option}
                                onClick={() => {
                                  setServiceTypeFilter(option);
                                  setStatusFilter('All'); // Reset status filter when service type changes
                                  setIsServiceTypeDropdownOpen(false);
                                }}
                                className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                              >
                                <span className="text-white">{option === 'All' ? 'All Services' : option}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                </div>

                    {/* Status Filter */}
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                        Status
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
                            <div
                              key="All"
                              onClick={() => {
                                setStatusFilter('All');
                                setIsStatusDropdownOpen(false);
                              }}
                              className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                            >
                              <span className="text-white">All Status</span>
                            </div>
                            {getAvailableStatuses(serviceTypeFilter).map((status) => (
                              <div
                                key={status}
                                onClick={() => {
                                  setStatusFilter(status);
                                  setIsStatusDropdownOpen(false);
                                }}
                                className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                              >
                                <span className="text-white">{status}</span>
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
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Info</th>
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Country</th>
                      <th className="text-center py-4 px-6 text-slate-300 font-semibold">Number</th>
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Type</th>
                      <th className="text-center py-4 px-5 text-slate-300 font-semibold">Status</th>
                      <th className="text-center py-4 px-10 text-slate-300 font-semibold">Service</th>
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Price</th>
                      <th className="text-center py-4 px-6 text-slate-300 font-semibold">Code</th>
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
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleInfoClick(record)}
                              className="p-2 text-slate-400 hover:text-green-500 transition-colors duration-200 rounded-lg hover:bg-slate-700/30"
                              title="View Information"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-center">
                            <span className="inline-block bg-slate-700/50 text-white font-normal text-sm px-3 py-1 rounded-lg border border-slate-600/50">
                              {getCountryInitials(record.country)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-mono text-white">{record.number}</div>
                        </td>
                        <td className="py-4 px-6 text-white">{getShortNumberType(record.serviceType)}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold border w-24 ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-white">{record.service}</td>
                        <td className="py-4 px-6">
                          <span className="text-emerald-400 font-semibold">${record.price.toFixed(2)}</span>
                        </td>
                        <td className="py-4 px-6">
                          {record.code === 'Waiting...' ? (
                            <div className="flex justify-center">
                              <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </div>
                          ) : (
                            <span className="font-mono text-blue-500 font-semibold">{record.code}</span>
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
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold text-slate-300 mb-3">No Records Found</h1>
                  <p className="text-slate-400 text-lg">No purchase history matches your current filters</p>
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
            </>
          )}

            {/* Virtual Cards Tab Content */}
            {activeTab === 'virtualCards' && (
              <>
                {/* Virtual Cards Table */}
                <div className="overflow-x-auto overflow-y-visible">
                  {virtualCardData.length > 0 ? (
                    <>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">ID</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Purchase Date</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Price</th>
                            <th className="text-center py-4 px-6 text-slate-300 font-semibold">Card Number</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Expiration Date</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">CVV</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Card Funds</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedVirtualCardData.map((record, index) => (
                            <tr 
                              key={record.id} 
                              className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200 ${
                                index % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'
                              }`}
                            >
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={() => handleUuidClick(record.id)}
                                    className="p-2 text-slate-400 hover:text-blue-500 transition-colors duration-200 rounded-lg hover:bg-slate-700/30"
                                    title="View UUID"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-white text-center">{record.purchaseDate}</td>
                              <td className="py-4 px-6 text-center">
                                <span className="text-emerald-400 font-semibold">${record.price.toFixed(2)}</span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="font-mono text-white text-center">
                                  {record.cardNumber}
                                  <button
                                    onClick={() => handleCopyCardNumber(record.cardNumber, record.id)}
                                    className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                                    title={copiedCardNumbers[record.id] ? "Copied!" : "Copy Card Number"}
                                  >
                                    {copiedCardNumbers[record.id] ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-white text-center">{record.expirationDate}</td>
                              <td className="py-4 px-6 text-white text-center font-mono">{record.cvv}</td>
                              <td className="py-4 px-6 text-center">
                                <span className="text-emerald-400 font-semibold">${record.funds}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Virtual Cards Pagination */}
                      {totalVirtualCardPages > 1 && (
                        <div className="mt-6">
                          {/* Results info - shown above pagination on small screens */}
                          <div className="text-sm text-slate-400 text-center mb-4 md:hidden">
                            Showing {virtualCardStartIndex + 1} to {Math.min(virtualCardEndIndex, virtualCardData.length)} of {virtualCardData.length} results
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {/* Results info - shown on left side on larger screens */}
                            <div className="hidden md:block text-sm text-slate-400">
                              Showing {virtualCardStartIndex + 1} to {Math.min(virtualCardEndIndex, virtualCardData.length)} of {virtualCardData.length} results
                            </div>
                            
                            <div className="flex items-center space-x-2 mx-auto md:mx-0">
                              {/* Previous Button */}
                              <button
                                onClick={() => setCurrentVirtualCardPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentVirtualCardPage === 1}
                                className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>

                              {/* Page Numbers */}
                              <div className="flex space-x-1">
                                {Array.from({ length: totalVirtualCardPages }, (_, i) => i + 1).map((page) => (
                                  <button
                                    key={page}
                                    onClick={() => setCurrentVirtualCardPage(page)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                      currentVirtualCardPage === page
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
                                onClick={() => setCurrentVirtualCardPage(prev => Math.min(prev + 1, totalVirtualCardPages))}
                                disabled={currentVirtualCardPage === totalVirtualCardPages}
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
                    </>
                  ) : (
                    /* Empty State for Virtual Cards */
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-5">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h1 className="text-xl font-bold text-slate-300 mb-3">No Virtual Cards Found</h1>
                      <p className="text-slate-400 text-lg">You haven't purchased any virtual debit cards yet</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* UUID Modal */}
        {showUuidModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-70 h-58">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center">
                    <img src={MajorPhonesFavIc} alt="Major Phones" className="w-12 h-10" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Number ID</h3>
                <p className="text-blue-200 mb-4 break-all">{selectedUuid}</p>
                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={handleCopyUuid}
                    style={{ width: '5.5rem' }}
                    className={`font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center ${
                      isCopied 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600' 
                        : 'bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600'
                    } text-white`}
                  >
                    {isCopied ? (
                      <span>Copied</span>
                    ) : (
                      <span>Copy</span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowUuidModal(false)}
                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Information Modal */}
        {showInfoModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center">
                    <img src={MajorPhonesFavIc} alt="Major Phones" className="w-12 h-10" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-6">Information</h3>
                <div className="space-y-4 text-left">
                  <div>
                    <span className="text-slate-300">Number ID: </span>
                    <span className="text-emerald-400 break-all">{selectedRecord.id}
                      <button
                        onClick={handleCopyInfoId}
                        className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                        title={isInfoIdCopied ? "Copied!" : "Copy Number ID"}
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
                    <span className="text-slate-300">Purchase Date: </span>
                    <span className="text-emerald-400">{selectedRecord.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Duration: </span>
                    <span className="text-emerald-400">{selectedRecord.duration}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Expiration Date: </span>
                    <span className="text-emerald-400">{selectedRecord.expirationDate}</span>
                  </div>
                </div>
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setShowInfoModal(false)}
                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-6 rounded-xl transition-all duration-300 shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default History;