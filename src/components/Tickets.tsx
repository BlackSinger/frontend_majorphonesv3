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
  issueDescription: string;
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
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showTicketChat, setShowTicketChat] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{id: string; text: string; timestamp: Date; images?: File[]; isAdmin?: boolean}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatImages, setChatImages] = useState<File[]>([]);
  const [isChatDragOver, setIsChatDragOver] = useState(false);

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
      status: 'open',
      issueDescription: "I made a payment yesterday but my balance hasn't been updated yet. I used my credit card and the transaction shows as completed on my bank statement, but the balance on my account is still the same. Can you please check what happened?"
    },
    {
      id: 'allf097f-d4cb-4257-a3da-2dcc4a35cd05',
      date: '2024-10-12 8:15',
      lastUpdate: '2024-10-12 14:30',
      issue: 'Numbers',
      subject: 'I did not receive my code',
      status: 'closed',
      issueDescription: "I purchased a number for Google verification but it's been 30 minutes and I still haven't received any SMS code. The number shows as active in my account but no messages are appearing. I need this urgently for my business account setup."
    },
    {
      id: '9fk1l09q-d4cb-4257-a3da-2dcc4a35cd05',
      date: '2024-10-11 16:45',
      lastUpdate: '2024-10-12 9:20',
      issue: 'Numbers',
      subject: 'SMS code not received for verification',
      status: 'open',
      issueDescription: "I'm trying to verify my WhatsApp account using the number I purchased, but the SMS verification code is not arriving. I've tried multiple times but still no success. The number appears to be active but not receiving messages."
    },
    {
      id: 'f7c8d921-4b3a-4e5f-8c9d-1a2b3c4d5e6f',
      date: '2024-10-10 12:30',
      lastUpdate: '2024-10-11 10:15',
      issue: 'Virtual Debit Cards',
      subject: 'My card does not work',
      status: 'closed',
      issueDescription: "My virtual debit card was declined when trying to make an online purchase. I tried on multiple websites and the same error occurs. The card has sufficient balance and is within the validity period. Please help me understand what might be wrong."
    },
    {
      id: '1f2e3d4c-5b6a-4e7f-8c9d-0a1b2c3d4e5f',
      date: '2024-10-09 9:20',
      lastUpdate: '2024-10-10 15:45',
      issue: 'Proxies',
      subject: 'Refund request for not working proxies',
      status: 'open',
      issueDescription: "I purchased 5 proxy addresses yesterday but none of them are working properly. They keep timing out and I can't establish a stable connection. I've tested them on multiple devices and networks. I would like a refund or replacement proxies that actually work."
    },
    {
      id: '2a5c9e9f-7d6b-4c3a-918f-5b4c3d2e1f0a',
      date: '2024-10-08 14:10',
      lastUpdate: '2024-10-09 11:30',
      issue: 'Other',
      subject: 'Need to change email address',
      status: 'closed',
      issueDescription: "I need to update my account email address as I no longer have access to my old email. I can provide verification through my phone number and other account details. Please let me know what information you need to process this change."
    },
    {
      id: '2a5c8e9f-7d6b-4c3a-9e8f-5b4c3d2e1f0a',
      date: '2024-10-07 11:55',
      lastUpdate: '2024-10-08 8:40',
      issue: 'Numbers',
      subject: 'Phone number not working for specific service',
      status: 'open',
      issueDescription: "The number I purchased is supposed to work with Instagram but when I try to use it for verification, it says the number is not supported. I specifically selected a number that was listed as compatible with Instagram. Can you help me get a working number?"
    },
    {
      id: 'alñq8e9f-7d6b-4c3a-9e8f-5b4c3d2e1f0a',
      date: '2024-10-06 7:30',
      lastUpdate: '2024-10-07 13:20',
      issue: 'Payment',
      subject: 'Error 500 when trying to deposit',
      status: 'closed',
      issueDescription: "Every time I try to make a deposit, I get an Error 500 message and the transaction fails. I've tried different payment methods and browsers but the same error persists. This is preventing me from adding funds to my account."
    },
    {
      id: '8f3e5c7d-2b1a-4e6f-9c8d-7a5b3c1e2f4d',
      date: '2024-10-05 18:45',
      lastUpdate: '2024-10-06 16:25',
      issue: 'Payment',
      subject: 'Duplicate charge on my credit card',
      status: 'open',
      issueDescription: "I was charged twice for the same transaction yesterday. I only made one purchase but my credit card shows two identical charges. I have the transaction IDs for both charges. Please refund the duplicate charge as soon as possible."
    },
    {
      id: '443e5c7d-2b1a-4e6f-9c8d-7a5b3c102f4d',
      date: '2024-10-04 13:15',
      lastUpdate: '2024-10-05 12:50',
      issue: 'Virtual Debit Cards',
      subject: 'My card is not working for all services',
      status: 'closed',
      issueDescription: "My virtual debit card works for some online services but not others. It works fine for Amazon and eBay but gets declined on Netflix and Spotify. Is there a restriction on certain types of services? I need it to work for subscription services."
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
    setSelectedTicket(record);
    setShowTicketChat(true);

    // Add a mock admin response for demonstration
    const mockAdminResponse = {
      id: 'admin-response-1',
      text: "Thank you for contacting us. We have reviewed your issue and our technical team is currently investigating the problem. We will provide you with an update in 2-24 hours.",
      timestamp: new Date(),
      isAdmin: true
    };

    setChatMessages([mockAdminResponse]);
    setChatInput('');
    setChatImages([]);
  };

  // Handle issue type change
  const handleIssueTypeChange = (issueType: string) => {
    setSelectedIssueType(issueType);
    setIsIssueTypeDropdownOpen(false);
    // Clear form fields when issue type changes
    setTicketSubject('');
    setTicketId('');
    setIssueDescription('');
    setUploadedImages([]);
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

  // Validate file format
  const isValidImageFormat = (file: File) => {
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validFormats.includes(file.type.toLowerCase());
  };

  // Calculate total size of uploaded images
  const getTotalImageSize = (images: File[]) => {
    return images.reduce((total, file) => total + file.size, 0);
  };

  // Convert bytes to MB
  const bytesToMB = (bytes: number) => {
    return bytes / (1024 * 1024);
  };

  // Show error modal
  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      // Check format
      if (!isValidImageFormat(file)) {
        showError('You can only upload images in JPEG, JPG, PNG and WEBP format');
        return;
      }

      // Check if adding this file would exceed count limit
      const currentTotal = uploadedImages.length + validFiles.length;
      if (currentTotal >= 5) {
        showError('You can only upload 5 images');
        return;
      }

      // Check if adding this file would exceed size limit
      const newTotalSize = getTotalImageSize([...uploadedImages, ...validFiles, file]);
      if (bytesToMB(newTotalSize) > 15) {
        showError('You can only upload a total of 15MB');
        return;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setUploadedImages(prev => [...prev, ...validFiles]);
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Handle click upload
  const handleClickUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      handleFileUpload(target.files);
    };
    input.click();
  };

  // Remove image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Chat image functions
  const handleChatImageUpload = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      // Check format
      if (!isValidImageFormat(file)) {
        showError('You can only upload images in JPEG, JPG, PNG and WEBP format');
        return;
      }

      // Check if adding this file would exceed count limit
      const currentTotal = chatImages.length + validFiles.length;
      if (currentTotal >= 5) {
        showError('You can only upload 5 images');
        return;
      }

      // Check if adding this file would exceed size limit
      const newTotalSize = getTotalImageSize([...chatImages, ...validFiles, file]);
      if (bytesToMB(newTotalSize) > 15) {
        showError('You can only upload a total of 15MB');
        return;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setChatImages(prev => [...prev, ...validFiles]);
    }
  };

  // Handle chat drag events
  const handleChatDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsChatDragOver(true);
  };

  const handleChatDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsChatDragOver(false);
  };

  const handleChatDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsChatDragOver(false);
    handleChatImageUpload(e.dataTransfer.files);
  };

  // Handle chat click upload
  const handleChatClickUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      handleChatImageUpload(target.files);
    };
    input.click();
  };

  // Remove chat image
  const removeChatImage = (index: number) => {
    setChatImages(prev => prev.filter((_, i) => i !== index));
  };

  // Send chat message
  const sendChatMessage = () => {
    if (!chatInput.trim() && chatImages.length === 0) return;

    const newMessage = {
      id: Date.now().toString(),
      text: chatInput.trim(),
      timestamp: new Date(),
      images: chatImages.length > 0 ? [...chatImages] : undefined
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
    setChatImages([]);
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

        {/* Information Section - Always on top */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 mb-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-blue-300 text-sm font-semibold mb-3">Important information about tickets:</p>
              <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                <li>• Our response time is 2-24 hours for all types of  issues</li>
                <li>• The information you provide must be correct so we can assist you faster</li>
                <li>• Attach screenshots or images when possible to better describe your issue</li>
                <li>• You must check this section regularly to see if we have replied, we will not let you know once we have</li>
                <li>• The Open status of your ticket will change to Closed once we reply to you and consider the case has been solved</li>
                <li>• You can't write again on a Closed ticket as it can't be reopened</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tabs and Table */}
        {!showCreateTicket && !showTicketChat && (
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
        {showCreateTicket && !showTicketChat && (
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

                      {/* Upload area */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleClickUpload}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center bg-slate-800/30 transition-all duration-300 cursor-pointer ${
                          isDragOver
                            ? 'border-emerald-400 bg-emerald-500/10'
                            : 'border-slate-600/50 hover:border-emerald-500/50'
                        }`}
                      >
                        {uploadedImages.length === 0 ? (
                          <>
                            <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-slate-300 font-medium mb-2">Drop or click to upload images</p>
                            <p className="text-slate-400 text-sm">Max 5 images, 15MB total</p>
                            <p className="text-slate-400 text-sm">Only in JPEG, JPG, PNG, WEBP format</p>
                          </>
                        ) : (
                          <>
                            <div className="mb-4">
                              <svg className="w-8 h-8 text-emerald-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="text-emerald-400 text-sm font-medium">
                                {uploadedImages.length}/5 images uploaded ({bytesToMB(getTotalImageSize(uploadedImages)).toFixed(1)}MB)
                              </p>
                            </div>

                            {/* File list */}
                            <div className="space-y-2 mb-4">
                              {uploadedImages.map((image, index) => (
                                <div key={index} className="flex items-center bg-slate-700/30 rounded-lg px-2 sm:px-3 py-2 min-w-0">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-slate-300 text-sm truncate flex-1 min-w-0 text-left">{image.name}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-2">
                                    <span className="text-slate-400 text-xs whitespace-nowrap">{bytesToMB(image.size).toFixed(1)}MB</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeImage(index);
                                      }}
                                      className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 leading-none flex-shrink-0"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <p className="text-slate-400 text-sm">Drop or click to add more images</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Open Ticket button */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => console.log('Open ticket clicked')}
                        className="py-3 px-8 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-[1.03] border border-emerald-500/30 hover:border-emerald-400/50"
                      >
                        Open ticket
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ticket Chat Interface */}
        {showTicketChat && selectedTicket && (
          <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
            <div className="p-6">
              <div className="relative z-10">
                {/* Back Button */}
                <div className="mb-5">
                  <button
                    onClick={() => setShowTicketChat(false)}
                    className="group flex items-center space-x-3 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
                  >
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-slate-400 group-hover:text-white font-medium transition-colors duration-300">
                      Back to tickets
                    </span>
                  </button>
                </div>

                {/* Chat Header */}
                <div className="text-left mb-7">
                  <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                      Issue with {selectedTicket.issue}
                    </h1>
                    <span className={`inline-block px-3 py-2 rounded-xl text-sm font-semibold border ${
                      selectedTicket.status === 'open'
                        ? 'text-green-400 border-green-500/30'
                        : 'text-red-400 border-red-500/30'
                    }`}>
                      {selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-slate-300 text-md mb-1">
                    {selectedTicket.subject}
                  </p>
                  <p className="text-slate-400 text-sm">
                    Created at: {selectedTicket.date}
                    {selectedTicket.lastUpdate && selectedTicket.lastUpdate !== selectedTicket.date && (
                      <span> / Updated at: {selectedTicket.lastUpdate}</span>
                    )}
                  </p>
                </div>

                {/* Chat Container */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 border-blue-500/50 transition-all duration-300 shadow-lg shadow-blue-500/25" style={{ boxShadow: '0 0 24px rgba(59, 130, 246, 0.25)' }}>
                  {/* Chat Interface */}
                  <div className="flex flex-col h-[500px] sm:h-96">
                    {/* Initial user message (issue description) */}
                    <div className="flex justify-end mb-3">
                      <div className="relative bg-emerald-600/80 rounded-lg px-4 py-2 max-w-[85%] sm:max-w-sm md:max-w-md">
                        <p className="text-white text-sm break-words" style={{ textAlign: 'justify' }}>{selectedTicket.issueDescription}</p>
                        {/* Chat bubble tail for sent messages */}
                        <div className="absolute right-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-emerald-600/80 border-b-8 border-b-transparent translate-x-2"></div>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto mb-4 space-y-3 px-3">
                      {chatMessages.map((message) => (
                        <div key={message.id} className={`flex ${message.isAdmin ? 'justify-start' : 'justify-end'}`}>
                          <div className={`relative rounded-lg px-4 py-2 max-w-[85%] sm:max-w-sm md:max-w-md ${
                            message.isAdmin
                              ? 'bg-slate-700/50'
                              : 'bg-emerald-600/80'
                          }`}>
                            {message.text && (
                              <p className="text-white text-sm break-words mb-2" style={{ textAlign: 'justify' }}>{message.text}</p>
                            )}
                            {message.images && message.images.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className={`text-xs mb-1 ${message.isAdmin ? 'text-slate-200' : 'text-emerald-200'}`}>
                                  Attachments ({message.images.length}):
                                </div>
                                {message.images.map((image, index) => (
                                  <div key={index} className={`flex items-center space-x-2 rounded px-2 py-1 ${
                                    message.isAdmin ? 'bg-slate-600/30' : 'bg-emerald-700/30'
                                  }`}>
                                    <svg className={`w-3 h-3 flex-shrink-0 ${message.isAdmin ? 'text-slate-200' : 'text-emerald-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className={`text-xs truncate ${message.isAdmin ? 'text-slate-200' : 'text-emerald-200'}`}>{image.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Chat bubble tail */}
                            {message.isAdmin ? (
                              <div className="absolute left-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-slate-700/50 border-b-8 border-b-transparent -translate-x-2"></div>
                            ) : (
                              <div className="absolute right-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-emerald-600/80 border-b-8 border-b-transparent translate-x-2"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input Area with Image Upload */}
                    <div className="space-y-3">
                      {/* Message input and buttons */}
                      <div className="space-y-2">
                        {/* Image files list (if any) */}
                        {chatImages.length > 0 && (
                          <div className="bg-slate-700/30 rounded-lg p-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-slate-300 text-xs">Images ({chatImages.length}/5)</span>
                              <span className="text-slate-400 text-xs">{bytesToMB(getTotalImageSize(chatImages)).toFixed(1)}MB</span>
                            </div>
                            <div className="space-y-1 max-h-20 sm:max-h-20 overflow-y-auto">
                              {chatImages.map((image, index) => (
                                <div key={index} className="flex items-center justify-between bg-slate-600/30 rounded px-2 py-1">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-slate-300 text-xs truncate flex-1 min-w-0 text-left">{image.name}</span>
                                  </div>
                                  <button
                                    onClick={() => removeChatImage(index)}
                                    className="w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 flex-shrink-0 ml-2"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex space-x-2 min-w-0">
                          <textarea
                            placeholder="Type your message"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendChatMessage();
                              }
                            }}
                            className="flex-1 min-w-0 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 resize-none h-10 text-sm"
                            rows={2}
                          />

                          {/* Image upload button */}
                          <button
                            onClick={handleChatClickUpload}
                            disabled={chatImages.length >= 5}
                            className="px-2 py-2 bg-slate-600/50 hover:bg-slate-500/50 text-white rounded-xl transition-all duration-300 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            title="Upload images"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>

                          {/* Send button */}
                          <button
                            onClick={sendChatMessage}
                            disabled={!chatInput.trim() && chatImages.length === 0}
                            className="px-2 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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

        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-6">Error</h3>
                <div className="text-center mb-6">
                  <p className="text-slate-300">{errorMessage}</p>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowErrorModal(false)}
                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-6 rounded-xl transition-all duration-300 shadow-lg"
                  >
                    Ok
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