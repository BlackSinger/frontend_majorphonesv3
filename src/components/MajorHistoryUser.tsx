import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, getAuth } from 'firebase/auth';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

import {
  getShortDisplayStatus,
  getShortStatusColor,
  calculateShortDuration,
} from './ShortLogic';

import {
  getMiddleDisplayStatus,
  getMiddleStatusColor,
  calculateMiddleDuration,
  getMiddleCountdownTime,
} from './MiddleLogic';

import {
  getLongDisplayStatus,
  getLongStatusColor,
  calculateLongDuration,
  getLongCountdownTime,
} from './LongLogic';

import {
  getEmptySimDisplayStatus,
  getEmptySimStatusColor,
  calculateEmptySimDuration,
  getEmptySimCountdownTime,
} from './EmptySimLogic';

import {
  type ProxyRecord,
  handleCopyProxyField,
  formatProxyPrice,
  convertProxyDocumentToRecord,
  handleCopyProxyId
} from './ProxyLogic';

interface HistoryRecord {
  id: string;
  date: string;
  expirationDate: string;
  number: string;
  serviceType: string; // Normalized to lowercase: 'short' | 'middle' | 'long' | 'empty simcard'
  status: 'Pending' | 'Cancelled' | 'Completed' | 'Inactive' | 'Active' | 'Expired' | 'Timed out';
  service: string;
  price: number;
  duration: string;
  code: string;
  country: string;
  reuse?: boolean;
  maySend?: boolean;
  asleep?: boolean;
  createdAt?: Date;
  expiry?: Date;
  awakeIn?: Date;
  codeAwakeAt?: Date;
  orderId?: string;
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

const MajorHistoryUser: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [searchedEmail, setSearchedEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'numbers' | 'vcc' | 'proxies'>('numbers');
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [numberTypeFilter, setNumberTypeFilter] = useState<string>('All types');
  const [isServiceTypeDropdownOpen, setIsServiceTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isNumberTypeDropdownOpen, setIsNumberTypeDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [isInfoIdCopied, setIsInfoIdCopied] = useState(false);
  const serviceTypeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const numberTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Cache states for each tab
  const [numbersDataFetched, setNumbersDataFetched] = useState(false);
  const [vccDataFetched, setVccDataFetched] = useState(false);
  const [proxiesDataFetched, setProxiesDataFetched] = useState(false);
  const [cachedNumbersData, setCachedNumbersData] = useState<HistoryRecord[]>([]);
  const [cachedVccData, setCachedVccData] = useState<VirtualCardRecord[]>([]);
  const [cachedProxiesData, setCachedProxiesData] = useState<any>(null);

  // VCC states
  const [showUuidModal, setShowUuidModal] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedCardNumbers, setCopiedCardNumbers] = useState<{[key: string]: boolean}>({});

  // Proxy states
  const [copiedProxyFields, setCopiedProxyFields] = useState<{[key: string]: boolean}>({});
  const [showProxyInfoModal, setShowProxyInfoModal] = useState(false);
  const [selectedProxyRecord, setSelectedProxyRecord] = useState<ProxyRecord | null>(null);
  const [isProxyIdCopied, setIsProxyIdCopied] = useState(false);

  const itemsPerPage = 10;

  const handleSearch = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter an email address');
      setShowErrorModal(true);
      return;
    }

    // Reset cache when searching for a new user
    setNumbersDataFetched(false);
    setVccDataFetched(false);
    setProxiesDataFetched(false);
    setCachedNumbersData([]);
    setCachedVccData([]);
    setCachedProxiesData(null);
    setActiveTab('numbers');

    setLoading(true);

    try {
      const currentUser = getAuth().currentUser;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const idToken = await currentUser.getIdToken();

      const response = await fetch('https://getusersmsorders-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message === 'Forbidden') {
          // Sign out user immediately
          const auth = getAuth();
          await signOut(auth);
          navigate('/signin');
          return;
        } else if (data.message === 'User not found') {
          setErrorMessage('User not found');
          setShowErrorModal(true);
          setLoading(false);
          return;
        } else if (data.message === 'Internal Server Error') {
          setErrorMessage('Please refresh');
          setShowErrorModal(true);
          setLoading(false);
          return;
        } else if (data.message === 'No SMS orders found') {
          // Don't show error modal, just set empty data and show the message in the table area
          setHistoryData([]);
          setCachedNumbersData([]);
          setNumbersDataFetched(true);
          setSearchedEmail(email.trim());
          setLoading(false);
          return;
        }
      }

      // Log response for debugging
      console.log('Backend response:', data);

      // Check if data has a smsOrders property (array)
      let smsOrdersArray = [];

      if (Array.isArray(data)) {
        smsOrdersArray = data;
      } else if (data.smsOrders && Array.isArray(data.smsOrders)) {
        smsOrdersArray = data.smsOrders;
      } else if (data.orders && Array.isArray(data.orders)) {
        smsOrdersArray = data.orders;
      } else {
        console.error('Expected array but got:', data);
        setHistoryData([]);
        setLoading(false);
        return;
      }

      // Format the data
      const formattedData = smsOrdersArray.map((item: any) => {
        // Format purchase date
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

        // Format expiration date
        let formattedExpirationDate = 'N/A';
        if (item.expiry && item.expiry._seconds) {
          const expiryDate = new Date(item.expiry._seconds * 1000);
          formattedExpirationDate = expiryDate.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        }

        // Convert timestamps to Date objects
        const createdAtDate = item.createdAt && item.createdAt._seconds
          ? new Date(item.createdAt._seconds * 1000)
          : undefined;

        const expiryDate = item.expiry && item.expiry._seconds
          ? new Date(item.expiry._seconds * 1000)
          : undefined;

        const awakeInDate = item.awakeIn && item.awakeIn._seconds
          ? new Date(item.awakeIn._seconds * 1000)
          : undefined;

        const codeAwakeAtDate = item.codeAwakeAt && item.codeAwakeAt._seconds
          ? new Date(item.codeAwakeAt._seconds * 1000)
          : undefined;

        // Normalize serviceType to lowercase for consistent filtering
        const normalizedServiceType = item.type ? String(item.type).toLowerCase() : '';

        // Calculate duration
        let duration = 'N/A';
        if (createdAtDate && expiryDate && normalizedServiceType) {
          duration = calculateDuration(
            normalizedServiceType,
            createdAtDate,
            expiryDate,
            item.reuse,
            item.maySend
          );
        }

        return {
          id: item.orderId || 'N/A',
          date: formattedDate,
          expirationDate: formattedExpirationDate,
          number: item.number ? String(item.number) : 'N/A',
          serviceType: normalizedServiceType,
          status: item.status || 'N/A',
          service: item.serviceName || 'N/A',
          price: item.price || 0,
          duration: duration,
          code: item.sms || '',
          country: item.country || 'N/A',
          reuse: item.reuse,
          maySend: item.maySend,
          asleep: item.asleep,
          createdAt: createdAtDate,
          expiry: expiryDate,
          awakeIn: awakeInDate,
          codeAwakeAt: codeAwakeAtDate,
          orderId: item.orderId || 'N/A'
        };
      });

      setHistoryData(formattedData);
      setCachedNumbersData(formattedData);
      setNumbersDataFetched(true);
      setSearchedEmail(email.trim());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user SMS orders:', error);
      setErrorMessage('Please refresh');
      setShowErrorModal(true);
      setLoading(false);
    }
  };

  const handleTabChange = async (tab: 'numbers' | 'vcc' | 'proxies') => {
    setActiveTab(tab);

    if (tab === 'numbers') {
      // If we already have numbers data cached, use it
      if (numbersDataFetched) {
        setHistoryData(cachedNumbersData);
        return;
      }
      // Otherwise data is already loaded from handleSearch
    } else if (tab === 'vcc') {
      // If we already fetched VCC data, use cached data
      if (vccDataFetched) {
        console.log('Using cached VCC data:', cachedVccData);
        return;
      }

      // Fetch VCC data for the first time
      setLoading(true);

      try {
        const currentUser = getAuth().currentUser;

        if (!currentUser) {
          setLoading(false);
          return;
        }

        const idToken = await currentUser.getIdToken();

        const response = await fetch('https://getuservccorders-ezeznlhr5a-uc.a.run.app', {
          method: 'POST',
          headers: {
            'authorization': `${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: searchedEmail })
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.message === 'Forbidden') {
            const auth = getAuth();
            await signOut(auth);
            navigate('/signin');
            return;
          } else if (data.message === 'User not found') {
            setErrorMessage('User not found');
            setShowErrorModal(true);
            setLoading(false);
            return;
          } else if (data.message === 'Internal Server Error') {
            setErrorMessage('Please refresh');
            setShowErrorModal(true);
            setLoading(false);
            return;
          }
        }

        // Check for "No VCC orders found" message (can come with 200 OK)
        if (data.message === 'No VCC orders found') {
          setCachedVccData([]);
          setVccDataFetched(true);
          setLoading(false);
          return;
        }

        console.log('Backend response (VCC):', data);

        // Format VCC data
        let vccOrdersArray = [];
        if (Array.isArray(data)) {
          vccOrdersArray = data;
        } else if (data.vccOrders && Array.isArray(data.vccOrders)) {
          vccOrdersArray = data.vccOrders;
        } else if (data.orders && Array.isArray(data.orders)) {
          vccOrdersArray = data.orders;
        }

        const formattedVccData: VirtualCardRecord[] = vccOrdersArray.map((item: any) => {
          // Format purchase date
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

          // Calculate funds based on price
          let funds = 0;
          if (item.price === 4) {
            funds = 0;
          } else if (item.price === 9) {
            funds = 3;
          }

          return {
            id: item.orderId || 'N/A',
            purchaseDate: formattedDate,
            price: item.price || 0,
            cardNumber: item.cardNumber || 'N/A',
            expirationDate: item.expirationDate || 'N/A',
            cvv: item.cvv || 'N/A',
            funds: funds
          };
        });

        setCachedVccData(formattedVccData);
        setVccDataFetched(true);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user VCC orders:', error);
        setErrorMessage('Please refresh');
        setShowErrorModal(true);
        setLoading(false);
      }
    } else if (tab === 'proxies') {
      // If we already fetched Proxies data, use cached data
      if (proxiesDataFetched) {
        // Only log if we have actual data (not empty state)
        if (!cachedProxiesData?.isEmpty) {
          console.log('Using cached Proxies data:', cachedProxiesData);
        }
        return;
      }

      // Fetch Proxies data for the first time
      setLoading(true);

      try {
        const currentUser = getAuth().currentUser;

        if (!currentUser) {
          setLoading(false);
          return;
        }

        const idToken = await currentUser.getIdToken();

        const response = await fetch('https://getuserproxyorders-ezeznlhr5a-uc.a.run.app', {
          method: 'POST',
          headers: {
            'authorization': `${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: searchedEmail })
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.message === 'Forbidden') {
            const auth = getAuth();
            await signOut(auth);
            navigate('/signin');
            return;
          } else if (data.message === 'Internal Server Error') {
            setErrorMessage('Please refresh');
            setShowErrorModal(true);
            setLoading(false);
            return;
          }
        }

        // Check for "No proxy orders found" message (can come with 200 OK)
        if (data.message === 'No proxy orders found') {
          setCachedProxiesData({ isEmpty: true });
          setProxiesDataFetched(true);
          setLoading(false);
          return;
        }

        console.log('Backend response (Proxies):', data);

        // Convert proxy documents to ProxyRecords
        const proxyRecords = (data.orders || []).map((doc: any) => convertProxyDocumentToRecord(doc));

        setCachedProxiesData(proxyRecords);
        setProxiesDataFetched(true);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user Proxy orders:', error);
        setErrorMessage('Please refresh');
        setShowErrorModal(true);
        setLoading(false);
      }
    }
  };

  const calculateDuration = (type: string, createdAt: Date, expiry: Date, reuse?: boolean, maySend?: boolean): string => {
    const normalizedType = type.toLowerCase();
    if (normalizedType === 'short') {
      return calculateShortDuration(createdAt, expiry, reuse, maySend);
    } else if (normalizedType === 'middle') {
      return calculateMiddleDuration(createdAt, expiry);
    } else if (normalizedType === 'long') {
      return calculateLongDuration(createdAt, expiry);
    } else if (normalizedType === 'empty simcard') {
      return calculateEmptySimDuration(createdAt, expiry);
    }
    return '';
  };

  const serviceTypeOptions = [
    'All',
    'Short Numbers',
    'Middle Numbers',
    'Long Numbers',
    'Empty SIM cards'
  ];

  const getNumberTypeOptions = (serviceType: string) => {
    switch (serviceType) {
      case 'Short Numbers':
        return ['All types', 'Single use', 'Receive/Send'];
      case 'Middle Numbers':
        return ['All types', '1 day', '7 days', '14 days'];
      case 'Long Numbers':
        return ['All types', '30 days', '365 days'];
      default:
        return ['All types'];
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceTypeDropdownRef.current && !serviceTypeDropdownRef.current.contains(event.target as Node)) {
        setIsServiceTypeDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (numberTypeDropdownRef.current && !numberTypeDropdownRef.current.contains(event.target as Node)) {
        setIsNumberTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [serviceTypeFilter, statusFilter, numberTypeFilter]);

  const getAvailableStatuses = (serviceType: string) => {
    switch (serviceType) {
      case 'Short Numbers':
        return ['Pending', 'Cancelled', 'Completed', 'Timed out'];
      case 'Middle Numbers':
        return ['Inactive', 'Active', 'Cancelled', 'Expired'];
      case 'Long Numbers':
        return ['Inactive', 'Active', 'Cancelled', 'Expired'];
      case 'Empty SIM cards':
        return ['Inactive', 'Active', 'Cancelled', 'Expired'];
      default:
        return ['Pending', 'Cancelled', 'Completed', 'Timed out', 'Inactive', 'Active', 'Expired'];
    }
  };

  const mapServiceTypeToFirestore = (uiServiceType: string) => {
    switch (uiServiceType) {
      case 'Short Numbers': return 'short';
      case 'Middle Numbers': return 'middle';
      case 'Long Numbers': return 'long';
      case 'Empty SIM cards': return 'empty simcard';
      default: return null;
    }
  };

  const getShortNumberType = (record: HistoryRecord) => {
    const { reuse, maySend } = record;
    if (reuse === false && maySend === false) return 'Single use';
    if (reuse === false && maySend === true) return 'Receive/Send';
    return 'Unknown';
  };

  const filteredData = useMemo(() => {
    let filtered = historyData;

    if (serviceTypeFilter !== 'All') {
      const firestoreServiceType = mapServiceTypeToFirestore(serviceTypeFilter);
      if (firestoreServiceType) {
        filtered = filtered.filter(record => record.serviceType === firestoreServiceType);
      }
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    if (numberTypeFilter !== 'All types') {
      if (serviceTypeFilter === 'Short Numbers') {
        filtered = filtered.filter(record => {
          const shortType = getShortNumberType(record);
          return shortType === numberTypeFilter;
        });
      } else if (serviceTypeFilter === 'Middle Numbers') {
        filtered = filtered.filter(record => record.duration === numberTypeFilter);
      } else if (serviceTypeFilter === 'Long Numbers') {
        filtered = filtered.filter(record => record.duration === numberTypeFilter);
      }
    }

    return filtered;
  }, [serviceTypeFilter, statusFilter, numberTypeFilter, historyData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const getDisplayStatus = (record: HistoryRecord): string => {
    const normalizedType = record.serviceType.toLowerCase();
    if (normalizedType === 'short') {
      return getShortDisplayStatus(record);
    } else if (normalizedType === 'middle') {
      return getMiddleDisplayStatus(record);
    } else if (normalizedType === 'long') {
      return getLongDisplayStatus(record);
    } else if (normalizedType === 'empty simcard') {
      return getEmptySimDisplayStatus(record);
    }
    return record.status;
  };

  const formatPrice = (price: number): string => {
    return price % 1 === 0 ? price.toString() : price.toFixed(2);
  };

  const getStatusColor = (status: string, serviceType: string) => {
    const normalizedType = serviceType.toLowerCase();
    if (normalizedType === 'short' || normalizedType === 'short numbers') {
      return getShortStatusColor(status);
    } else if (normalizedType === 'middle' || normalizedType === 'middle numbers') {
      return getMiddleStatusColor(status);
    } else if (normalizedType === 'long' || normalizedType === 'long numbers') {
      return getLongStatusColor(status);
    } else if (normalizedType === 'empty simcard' || normalizedType === 'empty sim card' || normalizedType === 'empty sim cards') {
      return getEmptySimStatusColor(status);
    }
    return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
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

  const getServiceTypeDisplayName = (serviceType: string) => {
    const normalizedType = serviceType.toLowerCase();
    switch (normalizedType) {
      case 'short':
        return 'Short';
      case 'middle':
        return 'Middle';
      case 'long':
        return 'Long';
      case 'empty simcard':
        return 'Empty SIM card';
      default:
        return serviceType;
    }
  };

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
      }
    }
  };

  const handleUuidClick = (uuid: string) => {
    setSelectedUuid(uuid);
    setShowUuidModal(true);
    setIsCopied(false);
  };

  const handleCopyUuid = async () => {
    try {
      await navigator.clipboard.writeText(selectedUuid);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
    }
  };

  const handleCopyCardNumber = async (cardNumber: string, cardId: string) => {
    try {
      await navigator.clipboard.writeText(cardNumber.replace(/\s/g, ''));
      setCopiedCardNumbers(prev => ({ ...prev, [cardId]: true }));
      setTimeout(() => {
        setCopiedCardNumbers(prev => ({ ...prev, [cardId]: false }));
      }, 2000);
    } catch (err) {
    }
  };

  const handleProxyInfoClick = (record: ProxyRecord) => {
    setSelectedProxyRecord(record);
    setShowProxyInfoModal(true);
    setIsProxyIdCopied(false);
  };

  const handleCopyProxyIdWrapper = async () => {
    await handleCopyProxyId(selectedProxyRecord, setIsProxyIdCopied);
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  User History
                </h1>
                <p className="text-slate-300 text-md text-left">View the user's purchases</p>
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
        {searchedEmail && (numbersDataFetched || vccDataFetched || proxiesDataFetched) && (
          <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left">
                <span className="text-slate-300 font-semibold">Viewing purchases for:</span>
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

        {/* Filters and Table - Show only if we have searched and got data (either numbers or attempted VCC or proxies) */}
        {(searchedEmail && (historyData.length > 0 || numbersDataFetched || vccDataFetched || proxiesDataFetched)) && (
          <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
            <div className="p-6">
              {/* Tab Navigation */}
              <div className="mb-6">
                <div className="flex space-x-4 border-b border-slate-700/50">
                  <button
                    onClick={() => handleTabChange('numbers')}
                    className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                      activeTab === 'numbers'
                        ? 'text-emerald-400 border-emerald-400'
                        : 'text-slate-400 border-transparent hover:text-slate-300'
                    }`}
                  >
                    Numbers
                  </button>
                  <button
                    onClick={() => handleTabChange('vcc')}
                    className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                      activeTab === 'vcc'
                        ? 'text-emerald-400 border-emerald-400'
                        : 'text-slate-400 border-transparent hover:text-slate-300'
                    }`}
                  >
                    Virtual Debit Cards
                  </button>
                  <button
                    onClick={() => handleTabChange('proxies')}
                    className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                      activeTab === 'proxies'
                        ? 'text-emerald-400 border-emerald-400'
                        : 'text-slate-400 border-transparent hover:text-slate-300'
                    }`}
                  >
                    Proxies
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
                                setStatusFilter('All');
                                setNumberTypeFilter('All types');
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

                  {/* Number Type Filter - Conditional for Short, Middle, Long Numbers */}
                  {(serviceTypeFilter === 'Short Numbers' || serviceTypeFilter === 'Middle Numbers' || serviceTypeFilter === 'Long Numbers') && (
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                        Number Type
                      </label>
                      <div className="relative group" ref={numberTypeDropdownRef}>
                        <div
                          onClick={() => setIsNumberTypeDropdownOpen(!isNumberTypeDropdownOpen)}
                          className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                        >
                          <span>{numberTypeFilter === 'All types' ? 'All Types' : numberTypeFilter}</span>
                        </div>

                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isNumberTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Custom Dropdown Options */}
                        {isNumberTypeDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-[60] max-h-60 overflow-y-auto text-sm">
                            {getNumberTypeOptions(serviceTypeFilter).map((option) => (
                              <div
                                key={option}
                                onClick={() => {
                                  setNumberTypeFilter(option);
                                  setIsNumberTypeDropdownOpen(false);
                                }}
                                className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                              >
                                <span className="text-white">{option === 'All types' ? 'All Types' : option}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                            <span className="text-white">All Statuses</span>
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
                            <div className="font-mono text-white">{record.number.startsWith('+') ? record.number : '+' + record.number}</div>
                          </td>
                          <td className="py-4 px-6 text-white">{getServiceTypeDisplayName(record.serviceType)}</td>
                          <td className="py-4 px-6">
                            <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold border w-24 ${getStatusColor(getDisplayStatus(record), record.serviceType)}`}>
                              {getDisplayStatus(record)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-white">{record.service}</td>
                          <td className="py-4 px-6">
                            <span className="text-emerald-400 font-semibold">${formatPrice(record.price)}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono text-blue-500 font-semibold">{record.code || '-'}</span>
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
                    {historyData.length === 0 && (serviceTypeFilter !== 'All' || statusFilter !== 'All' || numberTypeFilter !== 'All types') ? (
                      <>
                        <h1 className="text-xl font-bold text-slate-300 mb-3">No Records Found</h1>
                        <p className="text-slate-400 text-lg">No purchase history matches your current filters</p>
                      </>
                    ) : (
                      <>
                        <h1 className="text-xl font-bold text-slate-300 mb-3">No Numbers Found</h1>
                        <p className="text-slate-400 text-lg">This user has not purchased numbers</p>
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

              {/* VCC Tab Content */}
              {activeTab === 'vcc' && (
                <>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-slate-400 mt-4">Loading Virtual Debit Cards...</p>
                    </div>
                  ) : cachedVccData.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-5">
                        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h1 className="text-xl font-bold text-slate-300 mb-3">No Virtual Debit Cards Found</h1>
                      <p className="text-slate-400 text-lg">This user has not purchased VCCs</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto overflow-y-visible">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">ID</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Purchase Date</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Price</th>
                            <th className="text-center py-4 px-6 text-slate-300 font-semibold">Card Number</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Expiration Date</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">CVV</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Initial Funds</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cachedVccData.map((record, index) => (
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
                                <span className="text-emerald-400 font-semibold">${formatPrice(record.price)}</span>
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
                    </div>
                  )}
                </>
              )}

              {/* Proxies Tab Content */}
              {activeTab === 'proxies' && (
                <>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-slate-400 mt-4">Loading Proxies...</p>
                    </div>
                  ) : cachedProxiesData?.isEmpty ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-5">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>
                      <h1 className="text-xl font-bold text-slate-300 mb-3">No Proxies Found</h1>
                      <p className="text-slate-400 text-lg">This user has not purchased proxies</p>
                    </div>
                  ) : cachedProxiesData && cachedProxiesData.length > 0 ? (
                    <div className="overflow-x-auto overflow-y-visible">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Info</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Price</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Duration</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">IP</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">HTTPS/Port</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">SOCKS5/Port</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">User</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Password</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cachedProxiesData.map((record: ProxyRecord, index: number) => (
                            <tr
                              key={record.id}
                              className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200 ${
                                index % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'
                              }`}
                            >
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={() => handleProxyInfoClick(record)}
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
                              <td className="py-4 px-6 text-center">
                                <span className="text-emerald-400 font-semibold">${formatProxyPrice(record.price)}</span>
                              </td>
                              <td className="py-4 px-6 text-white text-center">{record.duration}</td>
                              <td className="py-4 px-6">
                                <div className="font-mono text-white text-center">
                                  {record.ip}
                                  <button
                                    onClick={() => handleCopyProxyField(record.ip, `ip-${record.id}`, setCopiedProxyFields)}
                                    className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                                    title={copiedProxyFields[`ip-${record.id}`] ? "Copied!" : "Copy IP"}
                                  >
                                    {copiedProxyFields[`ip-${record.id}`] ? (
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
                              <td className="py-4 px-6">
                                <div className="font-mono text-white text-center">
                                  {record.httpsPort}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="font-mono text-white text-center">
                                  {record.socks5Port}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="font-mono text-white text-center">
                                  {record.user}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="font-mono text-white text-center">
                                  {record.password}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-5">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>
                      <h1 className="text-xl font-bold text-slate-300 mb-3">No Proxies Found</h1>
                      <p className="text-slate-400 text-lg">This user has not purchased proxies</p>
                    </div>
                  )}
                </>
              )}
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
                    <span className="text-slate-300">Order ID: </span>
                    <span className="text-emerald-400 break-all">{selectedRecord.id}
                      <button
                        onClick={handleCopyInfoId}
                        className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                        title={isInfoIdCopied ? "Copied!" : "Copy Order ID"}
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
                  {selectedRecord.reuse === false && selectedRecord.maySend === true && (
                    <div>
                      <span className="text-slate-300">Each sending: </span>
                      <span className="text-emerald-400">$0.50</span>
                    </div>
                  )}
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

        {/* UUID Modal */}
        {showUuidModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-70 h-58">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center">
                    <img src={MajorPhonesFavIc} alt="Major Phones" className="w-12 h-10" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Order ID</h3>
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

        {/* Proxy Information Modal */}
        {showProxyInfoModal && selectedProxyRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center">
                    <img src={MajorPhonesFavIc} alt="Major Phones" className="w-12 h-10" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Proxy Information</h3>
                <div className="space-y-4 text-left">
                  <div>
                    <span className="text-slate-300">Order ID: </span>
                    <span className="text-emerald-400 break-all">{selectedProxyRecord.id}
                      <button
                        onClick={handleCopyProxyIdWrapper}
                        className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                        title={isProxyIdCopied ? "Copied!" : "Copy Order ID"}
                      >
                        {isProxyIdCopied ? (
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
                    <span className="text-emerald-400">{selectedProxyRecord.purchaseDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Expiration Date: </span>
                    <span className="text-emerald-400">{selectedProxyRecord.expirationDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Duration: </span>
                    <span className="text-emerald-400">{selectedProxyRecord.duration}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">USA State: </span>
                    <span className="text-emerald-400">Random State</span>
                  </div>
                </div>
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setShowProxyInfoModal(false)}
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

export default MajorHistoryUser;
