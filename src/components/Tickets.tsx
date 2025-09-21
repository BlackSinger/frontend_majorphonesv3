import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

interface TicketRecord {
  id: string;
  date: string;
  lastUpdate: string;
  issue: string;
  subject: string;
  status: 'open' | 'closed';
}

const Tickets: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState<'numbers'>('numbers');
  const [issueFilter, setIssueFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isIssueDropdownOpen, setIsIssueDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TicketRecord | null>(null);
  const [isInfoIdCopied, setIsInfoIdCopied] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState<string>('');
  const [isIssueTypeDropdownOpen, setIsIssueTypeDropdownOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketId, setTicketId] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState<string>('');

  const [openActionMenus, setOpenActionMenus] = useState<{[key: string]: boolean}>({});
  const issueDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const issueTypeDropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  const itemsPerPage = 10;

  // Mock ticket data for tickets
  const ticketData: TicketRecord[] = [
    {
      id: '3bbf097f-d4cb-4257-a3da-2dcc4a35cd05',
      date: '2024-10-13 2:28',
      lastUpdate: '2024-10-13 5:28',
      issue: 'Payment',
      subject: "I don't have my balance",
      status: 'open'
    },
    {
      id: 'allf097f-d4cb-4257-a3da-2dcc4a35cd05',
      date: '2024-10-12 8:15',
      lastUpdate: '2024-10-12 14:30',
      issue: 'Numbers',
      subject: 'I did not receive my code',
      status: 'closed'
    },
    {
      id: '9fk1l09q-d4cb-4257-a3da-2dcc4a35cd05',
      date: '2024-10-11 16:45',
      lastUpdate: '2024-10-12 9:20',
      issue: 'Numbers',
      subject: 'SMS code not received for verification',
      status: 'open'
    },
    {
      id: 'f7c8d921-4b3a-4e5f-8c9d-1a2b3c4d5e6f',
      date: '2024-10-10 12:30',
      lastUpdate: '2024-10-11 10:15',
      issue: 'Virtual Debit Cards',
      subject: 'My card does not work',
      status: 'closed'
    },
    {
      id: '1f2e3d4c-5b6a-4e7f-8c9d-0a1b2c3d4e5f',
      date: '2024-10-09 9:20',
      lastUpdate: '2024-10-10 15:45',
      issue: 'Proxies',
      subject: 'Refund request for not working proxies',
      status: 'open'
    },
    {
      id: '2a5c9e9f-7d6b-4c3a-918f-5b4c3d2e1f0a',
      date: '2024-10-08 14:10',
      lastUpdate: '2024-10-09 11:30',
      issue: 'Other',
      subject: 'Need to change email address',
      status: 'closed'
    },
    {
      id: '2a5c8e9f-7d6b-4c3a-9e8f-5b4c3d2e1f0a',
      date: '2024-10-07 11:55',
      lastUpdate: '2024-10-08 8:40',
      issue: 'Numbers',
      subject: 'Phone number not working for specific service',
      status: 'open'
    },
    {
      id: 'alñq8e9f-7d6b-4c3a-9e8f-5b4c3d2e1f0a',
      date: '2024-10-06 7:30',
      lastUpdate: '2024-10-07 13:20',
      issue: 'Payment',
      subject: 'Error 500 when trying to deposit',
      status: 'closed'
    },
    {
      id: '8f3e5c7d-2b1a-4e6f-9c8d-7a5b3c1e2f4d',
      date: '2024-10-05 18:45',
      lastUpdate: '2024-10-06 16:25',
      issue: 'Payment',
      subject: 'Duplicate charge on my credit card',
      status: 'open'
    },
    {
      id: '443e5c7d-2b1a-4e6f-9c8d-7a5b3c102f4d',
      date: '2024-10-04 13:15',
      lastUpdate: '2024-10-05 12:50',
      issue: 'Virtual Debit Cards',
      subject: 'My card is not working for all services',
      status: 'closed'
    }
  ];

  const issueOptions = [
    'All',
    'Payment',
    'Numbers',
    'Virtual Debit Cards',
    'Proxies',
    'Other'
  ];

  const issueTypeOptions = [
    'Payment',
    'Numbers',
    'Virtual Debit Cards',
    'Proxies',
    'Others'
  ];

  const statusOptions = [
    'All',
    'Open',
    'Closed'
  ];


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (issueDropdownRef.current && !issueDropdownRef.current.contains(event.target as Node)) {
        setIsIssueDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (issueTypeDropdownRef.current && !issueTypeDropdownRef.current.contains(event.target as Node)) {
        setIsIssueTypeDropdownOpen(false);
      }

      // Close action menus when clicking outside
      Object.keys(openActionMenus).forEach(recordId => {
        const ref = actionMenuRefs.current[recordId];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenActionMenus(prev => ({ ...prev, [recordId]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openActionMenus]);


  // Filter the data based on selected filters
  const filteredData = useMemo(() => {
    let filtered = ticketData;

    if (issueFilter !== 'All') {
      filtered = filtered.filter(record => record.issue === issueFilter);
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(record => record.status === statusFilter.toLowerCase());
    }

    return filtered;
  }, [issueFilter, statusFilter]);


  // Calculate pagination for numbers table
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);


  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [issueFilter, statusFilter]);


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


  // Handle Info modal
  const handleInfoClick = (record: TicketRecord) => {
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
        console.error('Failed to copy Ticket ID:', err);
      }
    }
  };

  // Handle action menu toggle
  const handleActionMenuToggle = (recordId: string) => {
    setOpenActionMenus(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // Handle check action
  const handleCheckClick = (record: TicketRecord) => {
    console.log(`Check clicked for ticket:`, record.id);
    // TODO: Implement check functionality
  };

  // Handle issue type change
  const handleIssueTypeChange = (issueType: string) => {
    setSelectedIssueType(issueType);
    setIsIssueTypeDropdownOpen(false);
    // Clear form fields when issue type changes
    setTicketSubject('');
    setTicketId('');
    setIssueDescription('');
  };

  // Get ID input placeholder based on issue type
  const getIdPlaceholder = (issueType: string) => {
    switch (issueType) {
      case 'Payment':
        return 'Payment ID';
      case 'Numbers':
        return 'Number ID';
      case 'Virtual Debit Cards':
        return 'Virtual Debit Card ID';
      case 'Proxies':
        return 'Proxy ID';
      default:
        return 'Enter ID';
    }
  };

  return (
    <DashboardLayout currentPath="/tickets">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Open a Ticket
                </h1>
                <p className="text-slate-300 text-md text-left">Get in touch with us directly</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Table */}
        {!showCreateTicket && (
          <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
            <div className="p-6">
              {/* Tab Navigation */}
              <div className="mb-6">
                <div className="flex items-center justify-between border-b border-slate-700/50">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {setActiveTab('numbers'); setCurrentPage(1);}}
                      className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                        activeTab === 'numbers'
                          ? 'text-emerald-400 border-emerald-400'
                          : 'text-slate-400 border-transparent hover:text-slate-300'
                      }`}
                    >
                      Tickets
                    </button>
                  </div>
                  <div className="pb-3">
                    <button
                      onClick={() => setShowCreateTicket(true)}
                      className="py-3 px-5 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50">
                      Create new ticket
                    </button>
                  </div>
                </div>
              </div>

              {/* Tickets Tab Content */}
              {activeTab === 'numbers' && (
              <>
                {/* Filters */}
                <div className="mb-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Issue Filter */}
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                        Issue with
                      </label>
                      <div className="relative group" ref={issueDropdownRef}>
                        <div
                          onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                          className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                        >
                          <span>{issueFilter === 'All' ? 'All Issues' : issueFilter}</span>
                        </div>

                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isIssueDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Custom Dropdown Options */}
                        {isIssueDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-[60] max-h-60 overflow-y-auto text-sm">
                            {issueOptions.map((issue) => (
                              <div
                                key={issue}
                                onClick={() => {
                                  setIssueFilter(issue);
                                  setIsIssueDropdownOpen(false);
                                }}
                                className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                              >
                                <span className="text-white">{issue === 'All' ? 'All Issues' : issue}</span>
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
                            {statusOptions.map((status) => (
                              <div
                                key={status}
                                onClick={() => {
                                  setStatusFilter(status);
                                  setIsStatusDropdownOpen(false);
                                }}
                                className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                              >
                                <span className="text-white">{status === 'All' ? 'All Status' : status}</span>
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
                      <th className="text-center py-4 px-6 text-slate-300 font-semibold">Issue with</th>
                      <th className="text-center py-4 px-8 text-slate-300 font-semibold w-1/4">Subject</th>
                      <th className="text-center py-4 px-5 text-slate-300 font-semibold">Status</th>
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Action</th>
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
                        <td className="py-4 px-6 text-white text-center">{record.issue}</td>
                        <td className="py-4 px-6 text-white text-left">{record.subject}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-block px-3 py-2 rounded-xl text-sm font-semibold border w-24 text-center ${
                            record.status === 'open'
                              ? 'text-green-400 border-green-500/30'
                              : 'text-red-400 border-red-500/30'
                          }`}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleCheckClick(record)}
                              className="py-2 px-6 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50"
                            >
                              Check
                            </button>
                          </div>
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
                  <p className="text-slate-400 text-lg">No ticket matches your current filter</p>
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
            </div>
          </div>
        )}

        {/* Create Ticket Content */}
        {showCreateTicket && (
          <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
            <div className="p-6">
              <div className="relative z-10">
                {/* Back Button */}
                <div className="mb-5">
                  <button
                    onClick={() => setShowCreateTicket(false)}
                    className="group flex items-center space-x-3 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
                  >
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-slate-400 group-hover:text-white font-medium transition-colors duration-300">
                      Back to Tickets
                    </span>
                  </button>
                </div>

                {/* Create Ticket Header */}
                <div className="text-left mb-7">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    Create new ticket
                  </h1>
                  <p className="text-slate-300 text-md">
                    Provide all the information needed
                  </p>
                </div>

                {/* Issue Type Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                    Choose the type of issue
                  </label>
                  <div className="relative group" ref={issueTypeDropdownRef}>
                    <div
                      onClick={() => setIsIssueTypeDropdownOpen(!isIssueTypeDropdownOpen)}
                      className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                    >
                      <span className={selectedIssueType ? 'text-white' : 'text-slate-400'}>
                        {selectedIssueType || 'Issue with'}
                      </span>
                    </div>

                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isIssueTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Custom Dropdown Options */}
                    {isIssueTypeDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-[60] max-h-60 overflow-y-auto text-sm">
                        {issueTypeOptions.map((issueType) => (
                          <div
                            key={issueType}
                            onClick={() => handleIssueTypeChange(issueType)}
                            className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                          >
                            <span className="text-white">{issueType}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Fields Based on Selected Issue Type */}
                {selectedIssueType && (
                  <div className="mt-8 space-y-6">
                    {/* Subject and ID inputs (for Payment, Numbers, Virtual Debit Cards, Proxies) */}
                    {selectedIssueType !== 'Others' && (
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                            Enter Ticket Subject
                          </label>
                          <input
                            type="text"
                            value={ticketSubject}
                            onChange={(e) => {
                              if (e.target.value.length <= 50) {
                                setTicketSubject(e.target.value);
                              }
                            }}
                            className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 text-sm shadow-inner hover:border-slate-500/50"
                            placeholder="Ticket Subject"
                            maxLength={50}
                          />
                          <div className="text-right text-xs text-slate-400 mt-1">
                            {ticketSubject.length}/50
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                            {selectedIssueType === 'Numbers' && 'Enter Number ID'}
                            {selectedIssueType === 'Virtual Debit Cards' && 'Enter Card ID'}
                            {selectedIssueType === 'Proxies' && 'Enter Proxy ID'}
                            {selectedIssueType === 'Payment' && 'Enter Payment ID'}
                          </label>
                          <input
                            type="text"
                            value={ticketId}
                            onChange={(e) => setTicketId(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 text-sm shadow-inner hover:border-slate-500/50"
                            placeholder={getIdPlaceholder(selectedIssueType)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Subject input only (for Others) */}
                    {selectedIssueType === 'Others' && (
                      <div>
                        <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                          Enter Ticket Subject
                        </label>
                        <input
                          type="text"
                          value={ticketSubject}
                          onChange={(e) => {
                            if (e.target.value.length <= 50) {
                              setTicketSubject(e.target.value);
                            }
                          }}
                          className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 text-sm shadow-inner hover:border-slate-500/50"
                          placeholder="Ticket Subject"
                          maxLength={50}
                        />
                        <div className="text-right text-xs text-slate-400 mt-1">
                          {ticketSubject.length}/50
                        </div>
                      </div>
                    )}

                    {/* Description textarea */}
                    <div>
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                        Describe your issue
                      </label>
                      <textarea
                        value={issueDescription}
                        onChange={(e) => {
                          if (e.target.value.length <= 300) {
                            setIssueDescription(e.target.value);
                          }
                        }}
                        className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 text-sm shadow-inner hover:border-slate-500/50 min-h-[120px] resize-y"
                        placeholder="Description of the issue"
                        maxLength={300}
                      />
                      <div className="text-right text-xs text-slate-400 mt-1">
                        {issueDescription.length}/300
                      </div>
                    </div>

                    {/* File upload area */}
                    <div>
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                        Attach images (optional)
                      </label>
                      <div className="border-2 border-dashed border-slate-600/50 rounded-2xl p-8 text-center bg-slate-800/30 hover:border-emerald-500/50 transition-all duration-300">
                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-slate-300 font-medium mb-2">Drop or Upload Images</p>
                        <p className="text-slate-400 text-sm">Max 5 images, 15MB total</p>
                      </div>
                    </div>

                    {/* Open Ticket button */}
                    <div className="pt-4">
                      <button
                        onClick={() => console.log('Open ticket clicked')}
                        className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50"
                      >
                        Open Ticket
                      </button>
                    </div>
                  </div>
                )}
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
                    <span className="text-slate-300">Ticket ID: </span>
                    <span className="text-emerald-400 break-all">{selectedRecord.id}
                      <button
                        onClick={handleCopyInfoId}
                        className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                        title={isInfoIdCopied ? "Copied!" : "Copy Ticket ID"}
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
                    <span className="text-slate-300">Created at: </span>
                    <span className="text-emerald-400">{selectedRecord.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Updated at: </span>
                    <span className="text-emerald-400">{selectedRecord.lastUpdate}</span>
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

export default Tickets;