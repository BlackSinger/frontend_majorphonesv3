import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';

interface ResponseImage {
  url: string;
  fileName: string;
}

interface TicketResponse {
  message: string;
  isUser: boolean;
  timestamp?: any;
  images?: ResponseImage[];
}

interface TicketRecord {
  id: string;
  ticketId: string;
  date: string;
  lastUpdate: string;
  issue: string;
  subject: string;
  status: 'open' | 'closed';
  message: string;
  images: ResponseImage[];
  response: TicketResponse[];
  createdAt: any;
  updatedAt: any;
  type: string;
}

const Tickets: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab');
  const [user] = useAuthState(auth);

  const [activeTab, setActiveTab] = useState<'numbers'>('numbers');
  const [issueFilter, setIssueFilter] = useState<string>('All Issues');
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
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [checkingTicketId, setCheckingTicketId] = useState<string | null>(null);

  const [ticketData, setTicketData] = useState<TicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [openActionMenus, setOpenActionMenus] = useState<{[key: string]: boolean}>({});
  const issueDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const issueTypeDropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const itemsPerPage = 10;

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-';

    try {
      let date: Date;

      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      else {
        return '-';
      }

      return date.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '-';
    }
  };

  const mapTypeToDisplayName = (type: string): string => {
    const typeValue = String(type || '').toLowerCase();

    switch (typeValue) {
      case 'number':
        return 'Number';
      case 'payment':
        return 'Payment';
      case 'vcc':
        return 'Virtual Debit Card';
      case 'proxy':
        return 'Proxy';
      case 'general':
        return 'Other';
      default:
        return 'Other';
    }
  };

  useEffect(() => {
    if (activeTab !== 'numbers') {
      setIsLoading(false);
      return;
    }

    if (!user) {
      setIsLoading(false);
      setTicketData([]);
      return;
    }

    setIsLoading(true);
    let isSubscribed = true;

    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, where('uid', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (!isSubscribed) return;

        const tickets: TicketRecord[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();

          tickets.push({
            id: doc.id,
            ticketId: data.ticketId || doc.id,
            date: formatDate(data.createdAt),
            lastUpdate: formatDate(data.updatedAt),
            issue: mapTypeToDisplayName(String(data.type || '')),
            subject: data.subject || '',
            status: (String(data.status || 'open').toLowerCase() === 'closed' ? 'closed' : 'open') as 'open' | 'closed',
            message: data.message || '',
            images: data.images || [],
            response: data.response || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            type: String(data.type || '').toLowerCase()
          });
        });

        tickets.sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bTime - aTime;
        });

        setTicketData(tickets);
        setIsLoading(false);
      },
      (error: any) => {
        if (!isSubscribed) return;

        let errorMsg = 'An error occurred while loading tickets, please contact support';

        if (error.code === 'permission-denied') {
          errorMsg = 'You do not have permission to access tickets';
        } else if (error.code === 'unavailable') {
          errorMsg = 'Tickets are temporarily unavailable, please try again later';
        } else if (error.message?.includes('network')) {
          errorMsg = 'Network connection error, please check your internet connection';
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        setIsLoading(false);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [user, activeTab]);

  const issueOptions = [
    'All Issues',
    'Payment',
    'Number',
    'Virtual Debit Card',
    'Proxy',
    'Other'
  ];

  const issueTypeOptions = [
    'Payment',
    'Number',
    'Virtual Debit Card',
    'Proxy',
    'Other'
  ];

  const statusOptions = [
    'All',
    'Open',
    'Closed'
  ];


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

  const filteredData = useMemo(() => {
    let filtered = ticketData;

    if (issueFilter !== 'All Issues') {
      filtered = filtered.filter(record => record.issue === issueFilter);
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(record => record.status === statusFilter.toLowerCase());
    }

    return filtered;
  }, [ticketData, issueFilter, statusFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [issueFilter, statusFilter]);

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

  const handleInfoClick = (record: TicketRecord) => {
    setSelectedRecord(record);
    setShowInfoModal(true);
    setIsInfoIdCopied(false);
  };

  const handleCopyInfoId = async () => {
    if (selectedRecord) {
      try {
        await navigator.clipboard.writeText(selectedRecord.ticketId);
        setIsInfoIdCopied(true);
        setTimeout(() => setIsInfoIdCopied(false), 2000);
      } catch (err) {
      }
    }
  };

  const handleActionMenuToggle = (recordId: string) => {
    setOpenActionMenus(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  const handleCheckClick = async (record: TicketRecord) => {
    if (!user) return;

    setCheckingTicketId(record.ticketId);

    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        setCheckingTicketId(null);
        setErrorMessage("You are not authenticated");
        setShowErrorModal(true);
        return;
      }
      const idToken = await currentUser.getIdToken();

      const response = await fetch('https://readticket-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticketId: record.ticketId
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.message === "readTicket successful") {
        setSelectedTicket(record);
        setShowTicketChat(true);

        const mockAdminResponse = {
          id: 'admin-response-1',
          text: "Thank you for contacting us. We have reviewed your issue and our technical team is currently investigating the problem. We will provide you with an update in 2-24 hours.",
          timestamp: new Date(),
          isAdmin: true
        };

        setChatMessages([mockAdminResponse]);
        setChatInput('');
        setChatImages([]);
        setCheckingTicketId(null);
      } else {
        if (data.message === "Unauthorized") {
          setErrorMessage("You are not authenticated or your token is invalid");
          setShowErrorModal(true);
          return;
        }

        setCheckingTicketId(null);

        if (data.message === "ticketId is required") {
          setErrorMessage("Please refresh the page and try again");
          setShowErrorModal(true);
        } else if (data.message === "Ticket not found") {
          setErrorMessage("When trying to check this message, please contact our customer support");
          setShowErrorModal(true);
        } else if (data.message === "Internal Server Error") {
          setErrorMessage("Please contact our customer support");
          setShowErrorModal(true);
        } else {
          setErrorMessage("An unexpected error occurred, please try again");
          setShowErrorModal(true);
        }
      }

    } catch (error) {
      setCheckingTicketId(null);
      setErrorMessage("Network error, please check your connection and try again");
      setShowErrorModal(true);
    }
  };

  const handleIssueTypeChange = (issueType: string) => {
    setSelectedIssueType(issueType);
    setIsIssueTypeDropdownOpen(false);
    setTicketSubject('');
    setTicketId('');
    setIssueDescription('');
    setUploadedImages([]);
  };

  const getIdPlaceholder = (issueType: string) => {
    switch (issueType) {
      case 'Payment':
        return 'ID';
      case 'Number':
        return 'ID';
      case 'Virtual Debit Card':
        return 'ID';
      case 'Proxy':
        return 'ID';
      default:
        return 'ID';
    }
  };

  const isValidImageFormat = (file: File) => {
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validFormats.includes(file.type.toLowerCase());
  };

  const getTotalImageSize = (images: File[]) => {
    return images.reduce((total, file) => total + file.size, 0);
  };

  const bytesToMB = (bytes: number) => {
    return bytes / (1024 * 1024);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!isValidImageFormat(file)) {
        showError('You can only upload images in JPEG, JPG, PNG and WEBP format');
        return;
      }

      if (bytesToMB(file.size) > 3) {
        showError('Each image cannot weigh more than 3MB');
        return;
      }

      const currentTotal = uploadedImages.length + validFiles.length;
      if (currentTotal >= 5) {
        showError('You can only upload 5 images');
        return;
      }

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

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleChatImageUpload = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!isValidImageFormat(file)) {
        showError('You can only upload images in JPEG, JPG, PNG and WEBP format');
        return;
      }

      if (bytesToMB(file.size) > 3) {
        showError('Each image cannot weigh more than 3MB');
        return;
      }

      const currentTotal = chatImages.length + validFiles.length;
      if (currentTotal >= 5) {
        showError('You can only upload 5 images');
        return;
      }

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

  const removeChatImage = (index: number) => {
    setChatImages(prev => prev.filter((_, i) => i !== index));
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() && chatImages.length === 0) return;
    if (!selectedTicket || !user) return;

    setIsSendingMessage(true);

    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        setIsSendingMessage(false);
        setErrorMessage("You are not authenticated");
        setShowErrorModal(true);
        return;
      }
      const idToken = await currentUser.getIdToken();

      const formData = new FormData();

      formData.append('ticketId', selectedTicket.ticketId);
      formData.append('message', chatInput.trim());

      if (chatImages.length > 0) {
        chatImages.forEach((image) => {
          formData.append('files', image);
        });
      }

      const response = await fetch('https://userresponseticket-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.message === "Ticket updated successfully") {
        const newMessage = {
          id: Date.now().toString(),
          text: chatInput.trim(),
          timestamp: new Date(),
          images: chatImages.length > 0 ? [...chatImages] : undefined
        };

        setChatMessages(prev => [...prev, newMessage]);
        setChatInput('');
        setChatImages([]);
        setIsSendingMessage(false);
      } else {
        if (data.message === "Unauthorized") {
          setErrorMessage("You are not authenticated or your token is invalid");
          setShowErrorModal(true);
          setChatInput('');
          setChatImages([]);
          return;
        }

        setIsSendingMessage(false);

        if (data.message === "Ticket ID is required") {
          setErrorMessage("Please refresh the page and try again");
          setShowErrorModal(true);
        } else if (data.message === "Message is required") {
          setErrorMessage("Your message must contain text, not just images");
          setShowErrorModal(true);
        } else if (data.message === "Ticket not found") {
          setErrorMessage("When trying to send this message, please contact our customer support");
          setShowErrorModal(true);
        } else if (data.message === "Error processing form data") {
          setErrorMessage("Please refresh the page and try again");
          setShowErrorModal(true);
        } else if (data.message === "Internal Server Error") {
          setErrorMessage("Please contact our customer support");
          setShowErrorModal(true);
        } else {
          setErrorMessage("An unexpected error occurred, please try again");
          setShowErrorModal(true);
        }
      }

    } catch (error) {
      setIsSendingMessage(false);
      setErrorMessage("Network error, please check your connection and try again");
      setShowErrorModal(true);
    }
  };

  const mapIssueTypeToApiType = (issueType: string): string => {
    switch (issueType) {
      case 'Payment':
        return 'payment';
      case 'Number':
        return 'number';
      case 'Virtual Debit Card':
        return 'vcc';
      case 'Proxy':
        return 'proxy';
      case 'Other':
        return 'general';
      default:
        return 'general';
    }
  };

  const handleCreateTicket = async () => {
    if (!user) return;

    setIsCreatingTicket(true);

    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        setIsCreatingTicket(false);
        setErrorMessage("You are not authenticated");
        setShowErrorModal(true);
        return;
      }
      const idToken = await currentUser.getIdToken();

      const formData = new FormData();

      formData.append('subject', ticketSubject.trim());
      formData.append('message', issueDescription.trim());

      if (selectedIssueType) {
        formData.append('type', mapIssueTypeToApiType(selectedIssueType));
      }

      if (ticketId.trim()) {
        formData.append('orderId', ticketId.trim());
      }

      if (uploadedImages.length > 0) {
        uploadedImages.forEach((image) => {
          formData.append('files', image);
        });
      }

      const response = await fetch('https://createticket-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.message === "Ticket created successfully") {
        window.location.reload();
      } else {
        if (data.message === "Unauthorized") {
          setErrorMessage("You are not authenticated or your token is invalid");
          setShowErrorModal(true);
          return;
        }

        setIsCreatingTicket(false);

        if (data.message === "Order ID, subject, and message are required") {
          setErrorMessage("You have not completed the form");
          setShowErrorModal(true);
        } else if (data.message === "Subject and message are required") {
          setErrorMessage("You have not completed the form");
          setShowErrorModal(true);
        } else if (data.message === "Error processing form data") {
          setErrorMessage("Please refresh the page and try again");
          setShowErrorModal(true);
        } else if (data.message === "Internal Server Error") {
          setErrorMessage("Please contact our customer support");
          setShowErrorModal(true);
        } else {
          setErrorMessage("An unexpected error occurred, please try again");
          setShowErrorModal(true);
        }
      }

    } catch (error) {
      setIsCreatingTicket(false);
      setErrorMessage("Network error, please check your connection and try again");
      setShowErrorModal(true);
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
                      disabled={checkingTicketId !== null}
                      className="py-3 px-5 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
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
                          <span>{issueFilter}</span>
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
                                <span className="text-white">{issue}</span>
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
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-slate-400 mt-4">Loading tickets...</p>
                </div>
              ) : filteredData.length > 0 ? (
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
                        <td className="py-4 px-6 text-white text-center">{record.subject.charAt(0).toUpperCase() + record.subject.slice(1)}</td>
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
                              disabled={checkingTicketId !== null}
                              className="w-20 h-9 flex items-center justify-center bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                              {checkingTicketId === record.ticketId ? (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                'Check'
                              )}
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
                    onClick={() => {
                      window.location.reload();
                    }}
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
                      onClick={() => !isCreatingTicket && setIsIssueTypeDropdownOpen(!isIssueTypeDropdownOpen)}
                      className={`w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between ${
                        isCreatingTicket
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:border-slate-500/50'
                      }`}
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
                    {/* Subject and ID inputs (for Payment, , Virtual Debit Card, Proxy) */}
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
                            disabled={isCreatingTicket}
                            className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 text-sm shadow-inner hover:border-slate-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Subject"
                            maxLength={50}
                          />
                          <div className="text-right text-xs text-slate-400 mt-1">
                            {ticketSubject.length}/50
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                            {selectedIssueType === 'Number' && 'Enter Order ID'}
                            {selectedIssueType === 'Virtual Debit Card' && 'Enter Order ID'}
                            {selectedIssueType === 'Proxy' && 'Enter Order ID'}
                            {selectedIssueType === 'Payment' && 'Enter Payment ID'}
                            {selectedIssueType === 'Other' && 'Enter ID'}
                          </label>
                          <input
                            type="text"
                            value={ticketId}
                            onChange={(e) => setTicketId(e.target.value)}
                            disabled={isCreatingTicket}
                            className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 text-sm shadow-inner hover:border-slate-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          disabled={isCreatingTicket}
                          className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 text-sm shadow-inner hover:border-slate-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Subject"
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
                        disabled={isCreatingTicket}
                        className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 text-sm shadow-inner hover:border-slate-500/50 min-h-[120px] resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Issue"
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
                        onDragOver={!isCreatingTicket ? handleDragOver : undefined}
                        onDragLeave={!isCreatingTicket ? handleDragLeave : undefined}
                        onDrop={!isCreatingTicket ? handleDrop : undefined}
                        onClick={!isCreatingTicket ? handleClickUpload : undefined}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center bg-slate-800/30 transition-all duration-300 ${
                          isCreatingTicket
                            ? 'opacity-50 cursor-not-allowed'
                            : isDragOver
                            ? 'border-emerald-400 bg-emerald-500/10 cursor-pointer'
                            : 'border-slate-600/50 hover:border-emerald-500/50 cursor-pointer'
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
                                      disabled={isCreatingTicket}
                                      className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 leading-none flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500"
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
                        onClick={handleCreateTicket}
                        disabled={isCreatingTicket}
                        className="py-3 px-8 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-[1.03] border border-emerald-500/30 hover:border-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {isCreatingTicket ? (
                          <svg className="animate-spin h-5 w-5 text-white mx-auto" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          'Open ticket'
                        )}
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
                    onClick={() => {
                      window.location.reload();
                    }}
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
                    {/* Initial user message (message from Firestore) */}
                    <div className="flex justify-end mb-3">
                      <div className="relative bg-emerald-600/80 rounded-lg px-4 py-2 max-w-[85%] sm:max-w-sm md:max-w-md">
                        {selectedTicket.message && (
                          <p className="text-white text-sm break-words" style={{ textAlign: 'justify' }}>{selectedTicket.message}</p>
                        )}
                        {/* Images from initial ticket */}
                        {selectedTicket.images && selectedTicket.images.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs mb-1 text-emerald-200">
                              Attachments ({selectedTicket.images.length}):
                            </div>
                            {selectedTicket.images.map((image, imgIndex) => (
                              <div
                                key={imgIndex}
                                onClick={() => {
                                  window.open(image.url, '_blank');
                                }}
                                className="flex items-center space-x-2 rounded px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity bg-emerald-700/30"
                              >
                                <svg className="w-3 h-3 flex-shrink-0 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs truncate text-emerald-200">{image.fileName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Chat bubble tail for sent messages */}
                        <div className="absolute right-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-emerald-600/80 border-b-8 border-b-transparent translate-x-2"></div>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto mb-4 space-y-3 px-3">
                      {/* Admin initial response - only the first message which is always admin */}
                      {chatMessages.filter(msg => msg.isAdmin).map((message) => (
                        <div key={message.id} className="flex justify-start">
                          <div className="relative bg-slate-700/50 rounded-lg px-4 py-2 max-w-[85%] sm:max-w-sm md:max-w-md">
                            <p className="text-white text-sm break-words" style={{ textAlign: 'justify' }}>{message.text}</p>
                            {/* Chat bubble tail */}
                            <div className="absolute left-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-slate-700/50 border-b-8 border-b-transparent -translate-x-2"></div>
                          </div>
                        </div>
                      ))}

                      {/* Additional responses from Firestore */}
                      {selectedTicket.response && selectedTicket.response.length > 0 && selectedTicket.response.map((response, index) => (
                        <div key={`response-${index}`} className={`flex ${response.isUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`relative rounded-lg px-4 py-2 max-w-[85%] sm:max-w-sm md:max-w-md ${
                            response.isUser
                              ? 'bg-emerald-600/80'
                              : 'bg-slate-700/50'
                          }`}>
                            {response.message && (
                              <p className="text-white text-sm break-words" style={{ textAlign: 'justify' }}>{response.message}</p>
                            )}
                            {/* Images from Firestore response */}
                            {response.images && response.images.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className={`text-xs mb-1 ${response.isUser ? 'text-emerald-200' : 'text-slate-200'}`}>
                                  Attachments ({response.images.length}):
                                </div>
                                {response.images.map((image, imgIndex) => (
                                  <div
                                    key={imgIndex}
                                    onClick={() => {
                                      window.open(image.url, '_blank');
                                    }}
                                    className={`flex items-center space-x-2 rounded px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity ${
                                      response.isUser ? 'bg-emerald-700/30' : 'bg-slate-600/30'
                                    }`}
                                  >
                                    <svg className={`w-3 h-3 flex-shrink-0 ${response.isUser ? 'text-emerald-200' : 'text-slate-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className={`text-xs truncate ${response.isUser ? 'text-emerald-200' : 'text-slate-200'}`}>{image.fileName}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Chat bubble tail */}
                            {response.isUser ? (
                              <div className="absolute right-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-emerald-600/80 border-b-8 border-b-transparent translate-x-2"></div>
                            ) : (
                              <div className="absolute left-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-slate-700/50 border-b-8 border-b-transparent -translate-x-2"></div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* New messages from user (sent during this session) */}
                      {chatMessages.filter(msg => !msg.isAdmin).map((message) => (
                        <div key={message.id} className="flex justify-end">
                          <div className="relative bg-emerald-600/80 rounded-lg px-4 py-2 max-w-[85%] sm:max-w-sm md:max-w-md">
                            {message.text && (
                              <p className="text-white text-sm break-words" style={{ textAlign: 'justify' }}>{message.text}</p>
                            )}
                            {message.images && message.images.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className="text-xs mb-1 text-emerald-200">
                                  Attachments ({message.images.length}):
                                </div>
                                {message.images.map((image, index) => (
                                  <div
                                    key={index}
                                    onClick={() => {
                                      const imageUrl = URL.createObjectURL(image);
                                      window.open(imageUrl, '_blank');
                                    }}
                                    className="flex items-center space-x-2 rounded px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity bg-emerald-700/30"
                                  >
                                    <svg className="w-3 h-3 flex-shrink-0 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs truncate text-emerald-200">{image.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Chat bubble tail */}
                            <div className="absolute right-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-emerald-600/80 border-b-8 border-b-transparent translate-x-2"></div>
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
                                    disabled={isSendingMessage}
                                    className="w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 flex-shrink-0 ml-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500"
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
                              if (e.key === 'Enter' && !e.shiftKey && !isSendingMessage) {
                                e.preventDefault();
                                sendChatMessage();
                              }
                            }}
                            disabled={isSendingMessage}
                            className="flex-1 min-w-0 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 resize-none h-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            rows={2}
                          />

                          {/* Image upload button */}
                          <button
                            onClick={handleChatClickUpload}
                            disabled={chatImages.length >= 5 || isSendingMessage}
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
                            disabled={(!chatInput.trim() && chatImages.length === 0) || isSendingMessage}
                            className="px-2 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          >
                            {isSendingMessage ? (
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                              </svg>
                            )}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center">
                    <img src={MajorPhonesFavIc} alt="Major Phones" className="w-12 h-10" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Information</h3>
                <div className="space-y-4 text-left">
                  <div>
                    <span className="text-slate-300">Ticket ID: </span>
                    <span className="text-emerald-400 break-all">{selectedRecord.ticketId}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Error</h3>
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