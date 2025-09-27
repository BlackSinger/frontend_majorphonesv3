import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

interface HistoryRecord {
  id: string;
  date: string;
  expirationDate: string;
  number: string;
  serviceType: 'Short' | 'Middle' | 'Long' | 'Empty simcard';
  status: 'Pending' | 'Cancelled' | 'Completed' | 'Inactive' | 'Active' | 'Expired' | 'Timed out';
  service: string;
  price: number;
  duration: string;
  code: string;
  country: string;
  reuse?: boolean;
  maySend?: boolean;
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

interface ProxyRecord {
  id: string;
  purchaseDate: string;
  expirationDate: string;
  usaState: string;
  price: number;
  duration: string;
  ip: string;
  httpsPort: string;
  socks5Port: string;
  user: string;
  password: string;
}

const History: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState<'numbers' | 'virtualCards' | 'proxies'>(
    tabFromUrl === 'virtualCards' ? 'virtualCards' : tabFromUrl === 'proxies' ? 'proxies' : 'numbers'
  );
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [numberTypeFilter, setNumberTypeFilter] = useState<string>('All');
  const [isServiceTypeDropdownOpen, setIsServiceTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isNumberTypeDropdownOpen, setIsNumberTypeDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentVirtualCardPage, setCurrentVirtualCardPage] = useState(1);
  const [showUuidModal, setShowUuidModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isInfoIdCopied, setIsInfoIdCopied] = useState(false);
  const [copiedCardNumbers, setCopiedCardNumbers] = useState<{[key: string]: boolean}>({});

  // Virtual card filters
  const [cardNumberSearch, setCardNumberSearch] = useState<string>('');
  const [fundsFilter, setFundsFilter] = useState<string>('All');
  const [isFundsDropdownOpen, setIsFundsDropdownOpen] = useState(false);

  // Proxy-specific state
  const [selectedProxyState, setSelectedProxyState] = useState('All States');
  const [selectedProxyDuration, setSelectedProxyDuration] = useState('All Durations');
  const [isProxyStateDropdownOpen, setIsProxyStateDropdownOpen] = useState(false);
  const [isProxyDurationDropdownOpen, setIsProxyDurationDropdownOpen] = useState(false);
  const [proxyStateSearchTerm, setProxyStateSearchTerm] = useState('');
  const [currentProxyPage, setCurrentProxyPage] = useState(1);
  const [showProxyInfoModal, setShowProxyInfoModal] = useState(false);
  const [selectedProxyRecord, setSelectedProxyRecord] = useState<ProxyRecord | null>(null);
  const [isProxyIdCopied, setIsProxyIdCopied] = useState(false);
  const [copiedProxyFields, setCopiedProxyFields] = useState<{[key: string]: boolean}>({});
  const proxyStateDropdownRef = useRef<HTMLDivElement>(null);
  const proxyDurationDropdownRef = useRef<HTMLDivElement>(null);
  const proxyStateInputRef = useRef<HTMLInputElement>(null);
  const [openActionMenus, setOpenActionMenus] = useState<{[key: string]: boolean}>({});
  const serviceTypeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const numberTypeDropdownRef = useRef<HTMLDivElement>(null);
  const fundsDropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Firestore states
  const [firestoreData, setFirestoreData] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  const itemsPerPage = 10;

  // Function to format price (show integers without decimals)
  const formatPrice = (price: number): string => {
    return price % 1 === 0 ? price.toString() : price.toFixed(2);
  };

  // Function to determine what to show in Code column
  const getCodeDisplay = (record: HistoryRecord) => {
    const { serviceType, status, code } = record;
    const smsValue = code || '';
    const hasSms = smsValue && smsValue.trim() !== '';

    if (serviceType === 'Short') {
      switch (status) {
        case 'Completed':
          return { type: 'text', value: smsValue };
        case 'Pending':
          return { type: 'spinner', value: null };
        case 'Cancelled':
          return { type: 'text', value: '-' };
        case 'Timed out':
          return { type: 'text', value: '-' };
        default:
          return { type: 'text', value: smsValue };
      }
    } else if (serviceType === 'Middle' || serviceType === 'Long' || serviceType === 'Empty simcard') {
      switch (status) {
        case 'Active':
          return hasSms ? { type: 'text', value: smsValue } : { type: 'spinner', value: null };
        case 'Inactive':
          return hasSms ? { type: 'text', value: smsValue } : { type: 'text', value: '-' };
        case 'Expired':
          return hasSms ? { type: 'text', value: smsValue } : { type: 'text', value: '-' };
        case 'Cancelled':
          return { type: 'text', value: '-' };
        default:
          return { type: 'text', value: smsValue };
      }
    }

    // Fallback
    return { type: 'text', value: smsValue };
  };

  // Function to calculate duration based on type and properties
  const calculateDuration = (type: string, createdAt: Date, expiry: Date, reuse?: boolean, maySend?: boolean): string => {
    const durationMs = expiry.getTime() - createdAt.getTime();

    if (type === 'Short') {
      if (reuse === true && maySend === false) {
        const durationHours = Math.round(durationMs / (1000 * 60 * 60));
        return `Reusable for ${durationHours} hours`;
      } else if (reuse === false && maySend === false) {
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        return `Single use for ${durationMinutes} minutes`;
      } else if (reuse === false && maySend === true) {
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        return `Receive/Respond for ${durationMinutes} minutes`;
      }
    } else if (type === 'Middle') {
      const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
      return `${durationDays} day${durationDays !== 1 ? 's' : ''}`;
    } else if (type === 'Long' || type === 'Empty simcard') {
      const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
      return `${durationDays} days`;
    }

    // Return empty string for unknown types
    return '';
  };

  // Function to fetch orders from Firestore
  const fetchUserOrders = async () => {
    if (!currentUser?.uid) {
      setErrorMessage('User not authenticated');
      setShowErrorModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('uid', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const orders: HistoryRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        const expiry = data.expiry?.toDate ? data.expiry.toDate() : new Date(data.expiry);

        // Calculate duration based on type and properties
        const durationText = calculateDuration(
          data.type || 'Short Numbers',
          createdAt,
          expiry,
          data.reuse,
          data.maySend
        );

        // Type validations and conversions
        const validatedNumber = typeof data.number === 'string' ? data.number : String(data.number || 'N/A');
        const validatedPrice = typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0;
        const validatedSms = typeof data.sms === 'string' ? data.sms : String(data.sms || '');

        // Validate status with allowed values
        const allowedStatuses = ['Pending', 'Cancelled', 'Completed', 'Inactive', 'Active', 'Expired', 'Timed out'] as const;
        const statusValue = typeof data.status === 'string' ? data.status : String(data.status || 'Pending');
        const validatedStatus = allowedStatuses.includes(statusValue as any) ? statusValue as typeof allowedStatuses[number] : 'Pending';

        // Validate type with allowed values
        const allowedTypes = ['Short', 'Middle', 'Long', 'Empty simcard'] as const;
        const typeValue = typeof data.type === 'string' ? data.type : String(data.type || 'Short');
        const validatedType = allowedTypes.includes(typeValue as any) ? typeValue as typeof allowedTypes[number] : 'Short';

        const order: HistoryRecord = {
          id: data.orderId || doc.id,
          date: createdAt.toLocaleString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
          expirationDate: expiry.toLocaleString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
          number: validatedNumber,
          serviceType: validatedType,
          status: validatedStatus,
          service: data.serviceName || 'N/A',
          price: parseFloat(validatedPrice.toFixed(2)),
          duration: durationText,
          code: validatedSms,
          country: data.country || 'N/A',
          reuse: data.reuse,
          maySend: data.maySend
        };

        orders.push(order);
      });

      setFirestoreData(orders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);

      // Handle specific Firebase errors
      let errorMsg = 'An error occurred when loading the orders, please try again';

      if (error?.code === 'permission-denied') {
        errorMsg = 'Access denied, you cannot check these orders';
      } else if (error?.code === 'unavailable') {
        errorMsg = 'Service temporarily unavailable, please try again';
      } else if (error?.code === 'unauthenticated') {
        errorMsg = 'You are not authenticated';
      } else if (error?.message) {
        errorMsg = `Error: ${error.message}`;
      }

      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

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

  // USA States list
  const usaStates = [
    { code: 'All States', name: 'All States' },
    { code: 'AL', name: 'Alabama (AL)' },
    { code: 'AK', name: 'Alaska (AK)' },
    { code: 'AZ', name: 'Arizona (AZ)' },
    { code: 'AR', name: 'Arkansas (AR)' },
    { code: 'CA', name: 'California (CA)' },
    { code: 'CO', name: 'Colorado (CO)' },
    { code: 'CT', name: 'Connecticut (CT)' },
    { code: 'DE', name: 'Delaware (DE)' },
    { code: 'FL', name: 'Florida (FL)' },
    { code: 'GA', name: 'Georgia (GA)' },
    { code: 'HI', name: 'Hawaii (HI)' },
    { code: 'ID', name: 'Idaho (ID)' },
    { code: 'IL', name: 'Illinois (IL)' },
    { code: 'IN', name: 'Indiana (IN)' },
    { code: 'IA', name: 'Iowa (IA)' },
    { code: 'KS', name: 'Kansas (KS)' },
    { code: 'KY', name: 'Kentucky (KY)' },
    { code: 'LA', name: 'Louisiana (LA)' },
    { code: 'ME', name: 'Maine (ME)' },
    { code: 'MD', name: 'Maryland (MD)' },
    { code: 'MA', name: 'Massachusetts (MA)' },
    { code: 'MI', name: 'Michigan (MI)' },
    { code: 'MN', name: 'Minnesota (MN)' },
    { code: 'MS', name: 'Mississippi (MS)' },
    { code: 'MO', name: 'Missouri (MO)' },
    { code: 'MT', name: 'Montana (MT)' },
    { code: 'NE', name: 'Nebraska (NE)' },
    { code: 'NV', name: 'Nevada (NV)' },
    { code: 'NH', name: 'New Hampshire (NH)' },
    { code: 'NJ', name: 'New Jersey (NJ)' },
    { code: 'NM', name: 'New Mexico (NM)' },
    { code: 'NY', name: 'New York (NY)' },
    { code: 'NC', name: 'North Carolina (NC)' },
    { code: 'ND', name: 'North Dakota (ND)' },
    { code: 'OH', name: 'Ohio (OH)' },
    { code: 'OK', name: 'Oklahoma (OK)' },
    { code: 'OR', name: 'Oregon (OR)' },
    { code: 'PA', name: 'Pennsylvania (PA)' },
    { code: 'RI', name: 'Rhode Island (RI)' },
    { code: 'SC', name: 'South Carolina (SC)' },
    { code: 'SD', name: 'South Dakota (SD)' },
    { code: 'TN', name: 'Tennessee (TN)' },
    { code: 'TX', name: 'Texas (TX)' },
    { code: 'UT', name: 'Utah (UT)' },
    { code: 'VT', name: 'Vermont (VT)' },
    { code: 'VA', name: 'Virginia (VA)' },
    { code: 'WA', name: 'Washington (WA)' },
    { code: 'WV', name: 'West Virginia (WV)' },
    { code: 'WI', name: 'Wisconsin (WI)' },
    { code: 'WY', name: 'Wyoming (WY)' }
  ];

  const proxyDurations = ['All Durations', '1 hour', '1 day', '7 days', '30 days'];

  // Mock proxy data
  const proxyData: ProxyRecord[] = [
    {
      id: '6b7ac1aa-192e-454e-aa92-b7885d701771',
      purchaseDate: '2024-10-13 2:28',
      expirationDate: '2024-10-13 3:28',
      usaState: 'Florida (FL)',
      price: 5,
      duration: '1 hour',
      ip: '85.239.54.237',
      httpsPort: '49999',
      socks5Port: '50000',
      user: 'b7z3kR9',
      password: 'm8t2YQouxI'
    },
    {
      id: 'a8c5d3bb-293f-565f-bb03-c8996e812882',
      purchaseDate: '2024-10-12 14:15',
      expirationDate: '2024-10-13 14:15',
      usaState: 'California (CA)',
      price: 12,
      duration: '1 day',
      ip: '192.168.45.123',
      httpsPort: '48888',
      socks5Port: '49000',
      user: 'b7z3kR9',
      password: 'n5r8TPlmxK'
    },
    {
      id: 'f2e9a1cc-384a-676a-cc14-d9aa7f923993',
      purchaseDate: '2024-10-11 9:30',
      expirationDate: '2024-10-18 9:30',
      usaState: 'Texas (TX)',
      price: 80,
      duration: '7 days',
      ip: '203.156.78.89',
      httpsPort: '47777',
      socks5Port: '48000',
      user: 'b7z3kR9',
      password: 'k6j9UMnpxL'
    },
    {
      id: 'b4f6c2dd-495b-787b-dd25-eabb8g034aa4',
      purchaseDate: '2024-10-10 16:45',
      expirationDate: '2024-11-09 16:45',
      usaState: 'New York (NY)',
      price: 120,
      duration: '30 days',
      ip: '172.244.91.156',
      httpsPort: '46666',
      socks5Port: '47000',
      user: 'b7z3kR9',
      password: 'h2g4VQrsnM'
    },
    {
      id: 'g7h3e4ee-5a6c-898c-ee36-fcc9i145bb5',
      purchaseDate: '2024-10-09 11:20',
      expirationDate: '2024-10-09 12:20',
      usaState: 'Nevada (NV)',
      price: 5,
      duration: '1 hour',
      ip: '98.234.67.201',
      httpsPort: '45555',
      socks5Port: '46000',
      user: 'b7z3kR9',
      password: 'p1m3WXtuvN'
    }
  ];

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
        return ['All types', 'Single use', 'Reusable', 'Receive/Respond'];
      case 'Middle Numbers':
        return ['All types', '1 day', '7 days', '14 days'];
      default:
        return ['All types'];
    }
  };

  // Filter states based on search term for proxies
  const filteredStates = usaStates.filter(state =>
    state.name.toLowerCase().includes(proxyStateSearchTerm.toLowerCase())
  );

  // Get state name without abbreviation for proxies
  const getStateName = (fullStateName: string) => {
    if (fullStateName.includes('(')) {
      return fullStateName.split(' (')[0];
    }
    return fullStateName;
  };

  // Close dropdowns when clicking outside
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
      if (proxyStateDropdownRef.current && !proxyStateDropdownRef.current.contains(event.target as Node)) {
        setIsProxyStateDropdownOpen(false);
        setProxyStateSearchTerm('');
      }
      if (proxyDurationDropdownRef.current && !proxyDurationDropdownRef.current.contains(event.target as Node)) {
        setIsProxyDurationDropdownOpen(false);
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
  }, [openActionMenus, selectedProxyState]);

  // Get available statuses based on service type
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

  // Helper function to map UI service type to Firestore service type
  const mapServiceTypeToFirestore = (uiServiceType: string) => {
    switch (uiServiceType) {
      case 'Short Numbers': return 'Short';
      case 'Middle Numbers': return 'Middle';
      case 'Long Numbers': return 'Long';
      case 'Empty SIM cards': return 'Empty simcard';
      default: return null;
    }
  };

  // Helper function to determine number type for Short numbers
  const getShortNumberType = (record: HistoryRecord) => {
    const { reuse, maySend } = record;
    if (reuse === true && maySend === false) return 'Reusable';
    if (reuse === false && maySend === false) return 'Single use';
    if (reuse === false && maySend === true) return 'Receive/Respond';
    return 'Unknown';
  };

  // Filter the data based on selected filters
  const filteredData = useMemo(() => {
    // Use only Firestore data
    let filtered = firestoreData;

    // Filter by Service Type
    if (serviceTypeFilter !== 'All') {
      const firestoreServiceType = mapServiceTypeToFirestore(serviceTypeFilter);
      if (firestoreServiceType) {
        filtered = filtered.filter(record => record.serviceType === firestoreServiceType);
      }
    }

    // Filter by Status
    if (statusFilter !== 'All') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Apply Number Type filter
    if (numberTypeFilter !== 'All types') {
      if (serviceTypeFilter === 'Short Numbers') {
        // For Short Numbers, filter by reuse/maySend combination
        filtered = filtered.filter(record => {
          const shortType = getShortNumberType(record);
          return shortType === numberTypeFilter;
        });
      } else if (serviceTypeFilter === 'Middle Numbers') {
        // For Middle Numbers, filter by duration
        filtered = filtered.filter(record => record.duration === numberTypeFilter);
      }
    }

    return filtered;
  }, [serviceTypeFilter, statusFilter, numberTypeFilter, firestoreData]);

  // Filter proxy data based on selected filters
  const filteredProxyData = useMemo(() => {
    let filtered = proxyData;

    if (selectedProxyState !== 'All States') {
      filtered = filtered.filter(record => record.usaState === selectedProxyState);
    }

    if (selectedProxyDuration !== 'All Durations') {
      filtered = filtered.filter(record => record.duration === selectedProxyDuration);
    }

    return filtered;
  }, [selectedProxyState, selectedProxyDuration]);

  // Filter virtual card data based on selected filters
  const filteredVirtualCardData = useMemo(() => {
    let filtered = virtualCardData;

    // Filter by card number (normalize spaces)
    if (cardNumberSearch.trim()) {
      const searchTerm = cardNumberSearch.replace(/\s/g, '').toLowerCase();
      filtered = filtered.filter(record =>
        record.cardNumber.replace(/\s/g, '').toLowerCase().includes(searchTerm)
      );
    }

    // Filter by funds
    if (fundsFilter !== 'All') {
      if (fundsFilter === '$0') {
        filtered = filtered.filter(record => record.funds === 0);
      } else if (fundsFilter === '$3') {
        filtered = filtered.filter(record => record.funds === 3);
      }
    }

    return filtered;
  }, [cardNumberSearch, fundsFilter]);

  // Calculate pagination for numbers table
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Calculate pagination for virtual cards table
  const totalVirtualCardPages = Math.ceil(filteredVirtualCardData.length / itemsPerPage);
  const virtualCardStartIndex = (currentVirtualCardPage - 1) * itemsPerPage;
  const virtualCardEndIndex = virtualCardStartIndex + itemsPerPage;
  const paginatedVirtualCardData = filteredVirtualCardData.slice(virtualCardStartIndex, virtualCardEndIndex);

  // Calculate pagination for proxies table
  const totalProxyPages = Math.ceil(filteredProxyData.length / itemsPerPage);
  const proxyStartIndex = (currentProxyPage - 1) * itemsPerPage;
  const proxyEndIndex = proxyStartIndex + itemsPerPage;
  const paginatedProxyData = filteredProxyData.slice(proxyStartIndex, proxyEndIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [serviceTypeFilter, statusFilter, numberTypeFilter]);

  // Reset to first page when proxy filters change
  useEffect(() => {
    setCurrentProxyPage(1);
  }, [selectedProxyState, selectedProxyDuration]);

  // Fetch user orders when component mounts or when tab changes to numbers
  useEffect(() => {
    if (activeTab === 'numbers') {
      if (currentUser) {
        fetchUserOrders();
      } else {
        // If no user, stop loading immediately
        setIsLoading(false);
        setFirestoreData([]);
      }
    } else {
      // If not on numbers tab, stop loading
      setIsLoading(false);
    }
  }, [activeTab, currentUser]);

  // Get status color based on type and status
  const getStatusColor = (status: string, serviceType: string) => {
    if (serviceType === 'Short Numbers') {
      switch (status) {
        case 'Completed':
          return 'text-blue-400 border-blue-500/30 bg-blue-500/20';
        case 'Pending':
          return 'text-orange-400 border-orange-500/30 bg-orange-500/20';
        case 'Cancelled':
          return 'text-red-400 border-red-500/30 bg-red-500/20';
        case 'Expired':
          return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
        case 'Timed out':
          return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
        default:
          return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
      }
    } else if (serviceType === 'Middle' || serviceType === 'Middle Numbers' ||
               serviceType === 'Long' || serviceType === 'Long Numbers' ||
               serviceType === 'Empty SIM card' || serviceType === 'Empty Simcard') {
      switch (status) {
        case 'Active':
          return 'text-green-400 border-green-500/30 bg-green-500/20';
        case 'Cancelled':
          return 'text-red-400 border-red-500/30 bg-red-500/20';
        case 'Inactive':
          return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
        case 'Expired':
          return 'text-red-400 border-red-500/30 bg-red-500/20';
        case 'Timed out':
          return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
        default:
          return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
      }
    }

    // Fallback to original colors
    switch (status) {
      case 'Active':
        return 'text-green-400 border-green-500/30 bg-green-500/20';
      case 'Completed':
        return 'text-blue-400 border-blue-500/30 bg-blue-500/20';
      case 'Pending':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/20';
      case 'Inactive':
        return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
      case 'Expired':
        return 'text-red-400 border-red-500/30 bg-red-500/20';
      case 'Cancelled':
        return 'text-red-400 border-red-500/30 bg-red-500/20';
      case 'Timed out':
        return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
      default:
        return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
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

  // Get service type display name
  const getServiceTypeDisplayName = (serviceType: string) => {
    switch (serviceType) {
      case 'Short':
        return 'Short';
      case 'Middle':
        return 'Middle';
      case 'Long':
        return 'Long';
      case 'Empty simcard':
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
        console.error('Failed to copy Order ID:', err);
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

  // Proxy-specific handlers
  const handleProxyStateSelect = (stateName: string) => {
    setSelectedProxyState(stateName);
    setIsProxyStateDropdownOpen(false);
    setProxyStateSearchTerm('');
  };

  const handleProxyStateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProxyStateSearchTerm(value);

    if (value === '') {
      setSelectedProxyState('');
    }

    if (!isProxyStateDropdownOpen) {
      setIsProxyStateDropdownOpen(true);
    }
  };

  const handleProxyStateInputClick = () => {
    setIsProxyStateDropdownOpen(true);
    if (proxyStateInputRef.current) {
      proxyStateInputRef.current.focus();
    }
  };

  const handleProxyInfoClick = (record: ProxyRecord) => {
    setSelectedProxyRecord(record);
    setShowProxyInfoModal(true);
    setIsProxyIdCopied(false);
  };

  const handleCopyProxyId = async () => {
    if (selectedProxyRecord) {
      try {
        await navigator.clipboard.writeText(selectedProxyRecord.id);
        setIsProxyIdCopied(true);
        setTimeout(() => setIsProxyIdCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy Order ID:', err);
      }
    }
  };

  const handleCopyProxyField = async (fieldValue: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(fieldValue);
      setCopiedProxyFields(prev => ({ ...prev, [fieldKey]: true }));
      setTimeout(() => {
        setCopiedProxyFields(prev => ({ ...prev, [fieldKey]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy field:', err);
    }
  };

  // Get available actions based on service type, status, reuse and maySend
  const getAvailableActions = (record: HistoryRecord) => {
    const { serviceType, status, reuse, maySend } = record;

    if (serviceType === 'Short') {
      if (reuse === true && maySend === false) {
        // Reusable type
        if (status === 'Pending') {
          return ['Cancel'];
        } else if (status === 'Completed') {
          return ['Reuse'];
        }
      } else if (reuse === false && maySend === false) {
        // Single use type
        if (status === 'Pending') {
          return ['Cancel'];
        }
        // For other statuses (Completed, Cancelled, Timed out) - no actions
        return [];
      } else if (reuse === false && maySend === true) {
        // Receive/Respond type
        if (status === 'Pending') {
          return ['Cancel'];
        } else if (status === 'Completed') {
          return ['Send'];
        }
      }
    } else if (serviceType === 'Middle') {
      const { code } = record;
      const hasSms = code && code.trim() !== '';

      if (status === 'Active') {
        if (hasSms) {
          // Active with SMS - no actions (disabled)
          return [];
        } else {
          // Active without SMS - only Cancel
          return ['Cancel'];
        }
      } else if (status === 'Inactive') {
        if (hasSms) {
          // Inactive with SMS - only Activate
          return ['Activate'];
        } else {
          // Inactive without SMS - Cancel and Activate (current logic)
          return ['Cancel', 'Activate'];
        }
      } else if (status === 'Cancelled' || status === 'Expired') {
        // Cancelled or Expired - no actions (disabled)
        return [];
      }
    } else if (serviceType === 'Long' || serviceType === 'Empty simcard') {
      const { code } = record;
      const hasSms = code && code.trim() !== '';

      if (status === 'Active') {
        if (hasSms) {
          // Active with SMS - no actions (disabled)
          return [];
        } else {
          // Active without SMS - only Cancel
          return ['Cancel'];
        }
      } else if (status === 'Inactive') {
        if (hasSms) {
          // Inactive with SMS - only Activate
          return ['Activate'];
        } else {
          // Inactive without SMS - Cancel and Activate
          return ['Cancel', 'Activate'];
        }
      } else if (status === 'Cancelled' || status === 'Expired') {
        // Cancelled or Expired - no actions (disabled)
        return [];
      }
    }

    return [];
  };

  // Handle action menu toggle
  const handleActionMenuToggle = (recordId: string) => {
    setOpenActionMenus(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // Handle action click
  const handleActionClick = (action: string, record: HistoryRecord) => {
    console.log(`Action "${action}" clicked for record:`, record.id);
    // Close the menu after clicking an action
    setOpenActionMenus(prev => ({ ...prev, [record.id]: false }));

    // Handle Send action
    if (action === 'Send') {
      navigate(`/sendmessage?number=${encodeURIComponent(record.number)}`);
      return;
    }

    // TODO: Implement other functionalities
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
                <button
                  onClick={() => {setActiveTab('proxies'); setCurrentProxyPage(1);}}
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
                                  setStatusFilter('All'); // Reset status filter when service type changes
                                  setNumberTypeFilter('All types'); // Reset number type filter
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

                    {/* Number Type Filter - Conditional for Short and Middle Numbers */}
                    {(serviceTypeFilter === 'Short Numbers' || serviceTypeFilter === 'Middle Numbers') && (
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
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-slate-400 mt-4">Loading numbers...</p>
                </div>
              ) : showErrorModal ? (
                <></>
              ) : filteredData.length > 0 ? (
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
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Actions</th>
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
                          <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold border w-24 ${getStatusColor(record.status, record.serviceType)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-white">{record.service}</td>
                        <td className="py-4 px-6">
                          <span className="text-emerald-400 font-semibold">${formatPrice(record.price)}</span>
                        </td>
                        <td className="py-4 px-6">
                          {(() => {
                            const codeDisplay = getCodeDisplay(record);
                            if (codeDisplay.type === 'spinner') {
                              return (
                                <div className="flex justify-center">
                                  <div className="w-5 h-5 border-2 border-slate-400/30 border-t-slate-200 rounded-full animate-spin"></div>
                                </div>
                              );
                            } else {
                              return (
                                <span className="font-mono text-blue-500 font-semibold">{codeDisplay.value}</span>
                              );
                            }
                          })()
                          }
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center">
                            {(() => {
                              const availableActions = getAvailableActions(record);
                              const hasActions = availableActions.length > 0;
                              
                              return (
                                <div className="relative" ref={(el) => { actionMenuRefs.current[record.id] = el; }}>
                                  <button
                                    onClick={() => hasActions && handleActionMenuToggle(record.id)}
                                    className={`p-2 rounded-lg transition-colors duration-200 ${
                                      hasActions
                                        ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 cursor-pointer'
                                        : 'text-slate-600 cursor-not-allowed'
                                    }`}
                                    disabled={!hasActions}
                                    title={hasActions ? "More actions" : "No actions available"}
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                    </svg>
                                  </button>
                                  
                                  {/* Action Menu Dropdown */}
                                  {hasActions && openActionMenus[record.id] && (
                                    <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-600/50 rounded-xl shadow-xl z-[70] min-w-[120px]">
                                      {availableActions.map((action, index) => (
                                        <button
                                          key={action}
                                          onClick={() => handleActionClick(action, record)}
                                          className={`w-full text-center px-4 py-3 text-sm text-white hover:bg-slate-700/50 transition-colors duration-200 ${
                                            index === 0 ? 'rounded-t-xl' : ''
                                          } ${
                                            index === availableActions.length - 1 ? 'rounded-b-xl' : ''
                                          }`}
                                        >
                                          {action}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
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
                {/* Virtual Cards Filters */}
                <div className="mb-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Card Number Search */}
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                        Card Number Search
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumberSearch}
                          onChange={(e) => {
                            setCardNumberSearch(e.target.value);
                            setCurrentVirtualCardPage(1);
                          }}
                          placeholder="Enter card number"
                          className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Funds Filter */}
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                        Initial Funds
                      </label>
                      <div className="relative group" ref={fundsDropdownRef}>
                        <div
                          onClick={() => setIsFundsDropdownOpen(!isFundsDropdownOpen)}
                          className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                        >
                          <span>{fundsFilter === 'All' ? 'All Funds' : fundsFilter}</span>
                        </div>

                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isFundsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Custom Dropdown Options */}
                        {isFundsDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-[60] max-h-60 overflow-y-auto text-sm">
                            {['All', '$0', '$3'].map((option) => (
                              <div
                                key={option}
                                onClick={() => {
                                  setFundsFilter(option);
                                  setIsFundsDropdownOpen(false);
                                  setCurrentVirtualCardPage(1);
                                }}
                                className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 text-white first:rounded-t-2xl last:rounded-b-2xl text-left"
                              >
                                {option === 'All' ? 'All Funds' : option}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Virtual Cards Table */}
                <div className="overflow-x-auto overflow-y-visible">
                  {filteredVirtualCardData.length > 0 ? (
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
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Initial Funds</th>
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

                      {/* Virtual Cards Pagination */}
                      {totalVirtualCardPages > 1 && (
                        <div className="mt-6">
                          {/* Results info - shown above pagination on small screens */}
                          <div className="text-sm text-slate-400 text-center mb-4 md:hidden">
                            Showing {virtualCardStartIndex + 1} to {Math.min(virtualCardEndIndex, filteredVirtualCardData.length)} of {filteredVirtualCardData.length} results
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {/* Results info - shown on left side on larger screens */}
                            <div className="hidden md:block text-sm text-slate-400">
                              Showing {virtualCardStartIndex + 1} to {Math.min(virtualCardEndIndex, filteredVirtualCardData.length)} of {filteredVirtualCardData.length} results
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

            {/* Proxies Tab Content */}
            {activeTab === 'proxies' && (
              <>
                {/* Proxy Filters */}
                <div className="mb-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* USA State Filter */}
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                        USA State
                      </label>
                      <div className="relative group" ref={proxyStateDropdownRef}>
                        <div className="relative">
                          <input
                            ref={proxyStateInputRef}
                            type="text"
                            value={proxyStateSearchTerm || selectedProxyState || ''}
                            onChange={handleProxyStateInputChange}
                            onClick={handleProxyStateInputClick}
                            placeholder="Type or choose state"
                            className="w-full pl-4 pr-10 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-400"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isProxyStateDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Custom Dropdown Options */}
                        {isProxyStateDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                            {filteredStates.length > 0 ? (
                              filteredStates.map((state) => (
                                <div
                                  key={state.code}
                                  onClick={() => handleProxyStateSelect(state.name)}
                                  className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                                >
                                  <span className="text-white">{state.name}</span>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-slate-400 text-center">
                                No states found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Duration Filter */}
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                        Duration
                      </label>
                      <div className="relative group" ref={proxyDurationDropdownRef}>
                        <div
                          onClick={() => setIsProxyDurationDropdownOpen(!isProxyDurationDropdownOpen)}
                          className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                        >
                          <span>{selectedProxyDuration}</span>
                        </div>

                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isProxyDurationDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Custom Dropdown Options */}
                        {isProxyDurationDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-[60] max-h-60 overflow-y-auto text-sm">
                            {proxyDurations.map((duration) => (
                              <div
                                key={duration}
                                onClick={() => {
                                  setSelectedProxyDuration(duration);
                                  setIsProxyDurationDropdownOpen(false);
                                }}
                                className="flex items-center px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                              >
                                <span className="text-white">{duration}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proxies Table */}
                <div className="overflow-x-auto overflow-y-visible">
                  {filteredProxyData.length > 0 ? (
                    <>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Info</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Price</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Duration</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">IP</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">HTTPS/Port</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">SOCKS5/Port	</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">User</th>
                            <th className="text-center py-4 px-4 text-slate-300 font-semibold">Password</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedProxyData.map((record, index) => (
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
                                <span className="text-emerald-400 font-semibold">${record.price}</span>
                              </td>
                              <td className="py-4 px-6 text-white text-center">{record.duration}</td>
                              <td className="py-4 px-6">
                                <div className="font-mono text-white text-center">
                                  {record.ip}
                                  <button
                                    onClick={() => handleCopyProxyField(record.ip, `ip-${record.id}`)}
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

                      {/* Proxies Pagination */}
                      {totalProxyPages > 1 && (
                        <div className="mt-6">
                          {/* Results info - shown above pagination on small screens */}
                          <div className="text-sm text-slate-400 text-center mb-4 md:hidden">
                            Showing {proxyStartIndex + 1} to {Math.min(proxyEndIndex, filteredProxyData.length)} of {filteredProxyData.length} results
                          </div>

                          <div className="flex items-center justify-between">
                            {/* Results info - shown on left side on larger screens */}
                            <div className="hidden md:block text-sm text-slate-400">
                              Showing {proxyStartIndex + 1} to {Math.min(proxyEndIndex, filteredProxyData.length)} of {filteredProxyData.length} results
                            </div>

                            <div className="flex items-center space-x-2 mx-auto md:mx-0">
                              {/* Previous Button */}
                              <button
                                onClick={() => setCurrentProxyPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentProxyPage === 1}
                                className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>

                              {/* Page Numbers */}
                              <div className="flex space-x-1">
                                {Array.from({ length: totalProxyPages }, (_, i) => i + 1).map((page) => (
                                  <button
                                    key={page}
                                    onClick={() => setCurrentProxyPage(page)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                      currentProxyPage === page
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
                                onClick={() => setCurrentProxyPage(prev => Math.min(prev + 1, totalProxyPages))}
                                disabled={currentProxyPage === totalProxyPages}
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
                    /* Empty State for Proxies */
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-5">
                        <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h1 className="text-xl font-bold text-slate-300 mb-3">No Proxies Found</h1>
                      <p className="text-slate-400 text-lg">No proxies match your current filters</p>
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

        {/* Proxy Information Modal */}
        {showProxyInfoModal && selectedProxyRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-96">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center">
                    <img src={MajorPhonesFavIc} alt="Major Phones" className="w-12 h-10" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-white mb-6">Proxy Information</h3>
                <div className="space-y-4 text-left">
                  <div>
                    <span className="text-slate-300">Order ID: </span>
                    <span className="text-emerald-400 break-all">{selectedProxyRecord.id}
                      <button
                        onClick={handleCopyProxyId}
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
                    <span className="text-slate-300">USA State: </span>
                    <span className="text-emerald-400">{selectedProxyRecord.usaState}</span>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                <p className="text-red-200 mb-4">{errorMessage}</p>
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setShowErrorModal(false);
                      setErrorMessage('');
                    }}
                    className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-medium py-2 px-6 rounded-xl transition-all duration-300 shadow-lg"
                  >
                    Cerrar
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