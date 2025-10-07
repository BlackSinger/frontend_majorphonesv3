import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

// Import Short logic functions
import {
  getShortDisplayStatus,
  getShortStatusColor,
  calculateShortDuration,
  getShortAvailableActions,
  handleCancelShort,
  // handleReuseNumber
} from './ShortLogic';

// Import Middle logic functions
import {
  getMiddleDisplayStatus,
  getMiddleStatusColor,
  calculateMiddleDuration,
  getMiddleAvailableActions,
  getMiddleCountdownTime,
  handleCancelMiddle,
  handleActivateMiddle
} from './MiddleLogic';

// Import Long logic functions
import {
  getLongDisplayStatus,
  getLongStatusColor,
  calculateLongDuration,
  getLongAvailableActions,
  getLongCountdownTime,
  handleCancelLong,
  handleActivateLong
} from './LongLogic';

// Import Empty SIM logic functions
import {
  getEmptySimDisplayStatus,
  getEmptySimStatusColor,
  calculateEmptySimDuration,
  getEmptySimAvailableActions,
  getEmptySimCountdownTime,
  handleCancelEmptySim,
  handleActivateEmptySim
} from './EmptySimLogic';

// Import Virtual Card logic and types
import {
  type VirtualCardRecord,
  type VCCOrderDocument,
  handleCopyCardNumber as handleCopyCardNumberVC,
  filterVirtualCards,
  convertVCCDocumentToRecord,
  formatPrice
} from './VirtualCardLogic';

// Import Proxy logic and types
import {
  type ProxyRecord,
  type ProxyOrderDocument,
  proxyDurations,
  filterProxyStates,
  handleProxyStateSelect,
  handleProxyStateInputChange,
  handleProxyStateInputClick,
  handleProxyInfoClick,
  handleCopyProxyId,
  handleCopyProxyField,
  filterProxies,
  convertProxyDocumentToRecord,
  formatProxyPrice
} from './ProxyLogic';

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
  asleep?: boolean; // Indica si el número está dormido (sleeping) en Firestore
  createdAt?: Date; // Timestamp de creación para calcular el contador
  // updatedAt?: Date; // Timestamp de última actualización (usado en reuse)
  expiry?: Date; // Timestamp de expiración para validar Send
  awakeIn?: Date; // Timestamp cuando el número despertará (para números sleeping)
  codeAwakeAt?: Date; // Timestamp cuando el contador de 5 minutos en Code debe iniciar (cuando el número está awake)
  orderId?: string; // Order ID para operaciones con Cloud Functions
}

// VirtualCardRecord and ProxyRecord interfaces are now imported from their respective logic files

// Countdown Timer Component - DO NOT re-render if status changes
const CountdownTimer: React.FC<{ createdAt: Date; recordId: string; status: string; onTimeout?: () => void; /* updatedAt?: Date */ }> = React.memo(({ createdAt, recordId, status, onTimeout, /* updatedAt */ }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    // If status is not Pending, don't show timer
    if (status !== 'Pending') {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      // Use updatedAt if available (for reused numbers), otherwise use createdAt
      // const startTime = updatedAt ? updatedAt.getTime() : createdAt.getTime();
      const startTime = createdAt.getTime();
      const fiveMinutes = 5 * 60 * 1000; // 5:00 in milliseconds
      const expiryTime = startTime + fiveMinutes;
      const remaining = expiryTime - now;

      return Math.max(0, Math.floor(remaining / 1000)); // Return seconds remaining
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      // Stop the interval when time runs out
      if (status !== "Pending"){
            clearInterval(interval);
            setTimeLeft(0);
      }
      if (remaining <= 0) {
        clearInterval(interval);
        // Notify parent component that time has expired
        if (onTimeout) {
          onTimeout();
        }
      }
    }, 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [createdAt, /* updatedAt, */ status, onTimeout]);

  // If status changed to non-Pending, don't render
  if (status !== 'Pending') {
    return <span className="font-mono text-slate-400">-</span>;
  }

  // If time has expired, show dash instead of timer
  if (timeLeft === 0) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <span className="font-mono text-yellow-500 font-semibold">
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
});

// Middle Countdown Timer Component - Shows 3 minute countdown for Middle Active numbers
const MiddleCountdownTimer: React.FC<{ record: HistoryRecord; onTimeout?: () => void }> = React.memo(({ record, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const countdown = getMiddleCountdownTime(record);
      setTimeLeft(countdown);

      // If countdown expired, call onTimeout
      if (countdown === null && onTimeout) {
        onTimeout();
      }
    };

    // Initial calculation
    updateCountdown();

    // Update every second
    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [record, onTimeout]);

  // If no countdown, show dash
  if (timeLeft === null) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  return (
    <span className="font-mono text-yellow-400 font-semibold">
      {timeLeft}
    </span>
  );
});

// Long Countdown Timer Component - Shows 3 minute countdown for Long Active numbers
const LongCountdownTimer: React.FC<{ record: HistoryRecord; onTimeout?: () => void }> = React.memo(({ record, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const countdown = getLongCountdownTime(record);
      setTimeLeft(countdown);

      // If countdown expired, call onTimeout
      if (countdown === null && onTimeout) {
        onTimeout();
      }
    };

    // Initial calculation
    updateCountdown();

    // Update every second
    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [record, onTimeout]);

  // If no countdown, show dash
  if (timeLeft === null) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  return (
    <span className="font-mono text-yellow-400 font-semibold">
      {timeLeft}
    </span>
  );
});

// Empty SIM Countdown Timer Component - Shows 3 minute countdown for Empty SIM Active numbers
const EmptySimCountdownTimer: React.FC<{ record: HistoryRecord; onTimeout?: () => void }> = React.memo(({ record, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const countdown = getEmptySimCountdownTime(record);
      setTimeLeft(countdown);

      // If countdown expired, call onTimeout
      if (countdown === null && onTimeout) {
        onTimeout();
      }
    };

    // Initial calculation
    updateCountdown();

    // Update every second
    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [record, onTimeout]);

  // If no countdown, show dash
  if (timeLeft === null) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  return (
    <span className="font-mono text-yellow-400 font-semibold">
      {timeLeft}
    </span>
  );
});

// Wake Up Timer Component - Shows countdown until number wakes up
const WakeUpTimer: React.FC<{ awakeIn: Date; recordId: string; onWakeUp?: () => void }> = React.memo(({ awakeIn, recordId, onWakeUp }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const wakeTime = awakeIn.getTime();
      const remaining = wakeTime - now;

      return Math.max(0, Math.floor(remaining / 1000)); // Return seconds remaining
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      // When time is up, notify parent
      if (remaining <= 0) {
        clearInterval(interval);
        if (onWakeUp) {
          onWakeUp();
        }
      }
    }, 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [awakeIn, onWakeUp]);

  // If time has expired, show dash
  if (timeLeft === 0) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  // Format as HH:MM:SS
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <span className="font-mono text-orange-500 font-semibold text-xs">
      {hours > 0 ? `${hours}:` : ''}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
});

// Code Awake Timer Component - Shows 5 minute countdown in Code column after number wakes up
const CodeAwakeTimer: React.FC<{ codeAwakeAt: Date; recordId: string; onTimeout?: () => void }> = React.memo(({ codeAwakeAt, recordId, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const startTime = codeAwakeAt.getTime();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      const expiryTime = startTime + fiveMinutes;
      const remaining = expiryTime - now;

      return Math.max(0, Math.floor(remaining / 1000)); // Return seconds remaining
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      // Stop the interval when time runs out
      if (remaining <= 0) {
        clearInterval(interval);
        // Notify parent component that time has expired
        if (onTimeout) {
          onTimeout();
        }
      }
    }, 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [codeAwakeAt, onTimeout]);

  // If time has expired, show dash
  if (timeLeft === 0) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  // Format time as MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <span className="font-mono text-yellow-500 font-semibold">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
});

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

  // Virtual Card Firestore states
  const [vccData, setVccData] = useState<VirtualCardRecord[]>([]);
  const [isLoadingVCC, setIsLoadingVCC] = useState(true);

  // Proxy Firestore states
  const [proxyFirestoreData, setProxyFirestoreData] = useState<ProxyRecord[]>([]);
  const [isLoadingProxies, setIsLoadingProxies] = useState(true);

  // Force re-render every minute to update action buttons availability
  const [, setForceUpdate] = useState(0);

  // Cancelling state - track which order is being cancelled
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Reusing state - track which order is being reused
  // const [reusingOrderId, setReusingOrderId] = useState<string | null>(null);

  // Activating state - track which order is being activated
  const [activatingOrderId, setActivatingOrderId] = useState<string | null>(null);

  // Use ref to store uid to prevent listener recreation
  const userIdRef = useRef<string | undefined>(currentUser?.uid);

  // Update ref when uid changes
  useEffect(() => {
    userIdRef.current = currentUser?.uid;
  }, [currentUser?.uid]);

  const itemsPerPage = 10;

  // Function to get display status (visual only, doesn't modify Firestore)
  const getDisplayStatus = (record: HistoryRecord): string => {
    if (record.serviceType === 'Short') {
      return getShortDisplayStatus(record);
    } else if (record.serviceType === 'Middle') {
      return getMiddleDisplayStatus(record);
    } else if (record.serviceType === 'Long') {
      return getLongDisplayStatus(record);
    } else if (record.serviceType === 'Empty simcard') {
      return getEmptySimDisplayStatus(record);
    }
    return record.status;
  };

  // Function to format price (show integers without decimals)
  const formatPrice = (price: number): string => {
    return price % 1 === 0 ? price.toString() : price.toFixed(2);
  };

  // Function to determine what to show in Code column
  const getCodeDisplay = (record: HistoryRecord) => {
    const { serviceType, status, code, createdAt, codeAwakeAt } = record;
    const smsValue = code || '';
    const hasSms = smsValue && smsValue.trim() !== '';

    if (serviceType === 'Short') {
      // Check if codeAwakeAt exists - show CodeAwakeTimer
      if (codeAwakeAt) {
        const now = new Date().getTime();
        const startTime = codeAwakeAt.getTime();
        const fiveMinutes = 5 * 60 * 1000;
        const expiryTime = startTime + fiveMinutes;

        // Only show timer if within the 5-minute window
        if (now < expiryTime) {
          return { type: 'codeAwakeTimer', value: null, codeAwakeAt };
        }
      }

      // IMPORTANT: Always check status first, never show countdown if not Pending
      if (status === 'Completed') {
        return { type: 'text', value: smsValue };
      } else if (status === 'Pending') {
        // Return countdown timer ONLY for Short Pending numbers
        return { type: 'countdown', value: null, createdAt };
      } else if (status === 'Cancelled' || status === 'Timed out') {
        return { type: 'text', value: '-' };
      } else {
        return { type: 'text', value: smsValue };
      }
    } else if (serviceType === 'Middle') {
      // Check for Middle countdown first (Active without SMS)
      const countdownTime = getMiddleCountdownTime(record);
      if (countdownTime !== null) {
        // Show countdown timer (5:00 -> 0:00)
        return { type: 'middleCountdown', value: countdownTime };
      }

      // No countdown - show regular status-based values
      switch (status) {
        case 'Active':
          // If we reach here, countdown expired (showing Inactive ficticio) or has SMS
          return hasSms ? { type: 'text', value: smsValue } : { type: 'text', value: '-' };
        case 'Inactive':
          return hasSms ? { type: 'text', value: smsValue } : { type: 'text', value: '-' };
        case 'Expired':
          return hasSms ? { type: 'text', value: smsValue } : { type: 'text', value: '-' };
        case 'Cancelled':
          return { type: 'text', value: '-' };
        default:
          return { type: 'text', value: smsValue };
      }
    } else if (serviceType === 'Long') {
      // Check for Long countdown first (Active without SMS)
      const countdownTime = getLongCountdownTime(record);
      if (countdownTime !== null) {
        // Show countdown timer (5:00 -> 0:00)
        return { type: 'longCountdown', value: countdownTime };
      }

      // No countdown - show regular status-based values
      switch (status) {
        case 'Active':
          // If we reach here, countdown expired (showing Inactive ficticio) or has SMS
          return hasSms ? { type: 'text', value: smsValue } : { type: 'text', value: '-' };
        case 'Inactive':
          return hasSms ? { type: 'text', value: smsValue } : { type: 'text', value: '-' };
        case 'Expired':
          return hasSms ? { type: 'text', value: smsValue } : { type: 'text', value: '-' };
        case 'Cancelled':
          return { type: 'text', value: '-' };
        default:
          return { type: 'text', value: smsValue };
      }
    } else if (serviceType === 'Empty simcard') {
      // Check for EmptySimCard countdown first (Active without SMS)
      const countdownTime = getEmptySimCountdownTime(record);
      if (countdownTime !== null) {
        // Show countdown timer (5:00 -> 0:00)
        return { type: 'emptySimCountdown', value: countdownTime };
      }

      // No countdown - show regular status-based values
      switch (status) {
        case 'Active':
          // If we reach here, countdown expired (showing Inactive ficticio) or has SMS
          return hasSms ? { type: 'text', value: smsValue } : { type: 'text', value: '-' };
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
    if (type === 'Short') {
      return calculateShortDuration(createdAt, expiry, reuse, maySend);
    } else if (type === 'Middle') {
      return calculateMiddleDuration(createdAt, expiry);
    } else if (type === 'Long') {
      return calculateLongDuration(createdAt, expiry);
    } else if (type === 'Empty simcard') {
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
        return ['All types', 'Single use', /* 'Reusable', */ 'Receive/Respond'];
      case 'Middle Numbers':
        return ['All types', '1 day', '7 days', '14 days'];
      case 'Long Numbers':
        return ['All types', '30 days', '365 days'];
      default:
        return ['All types'];
    }
  };

  // Filter states based on search term for proxies
  const filteredStates = filterProxyStates(proxyStateSearchTerm);

  // Wrapper functions for proxy handlers to make them compatible with React events
  const handleProxyStateInputChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleProxyStateInputChange(e.target.value, setProxyStateSearchTerm);
  };

  const handleProxyStateInputClickWrapper = () => {
    handleProxyStateInputClick(setIsProxyStateDropdownOpen);
  };

  const handleProxyStateSelectWrapper = (state: string) => {
    handleProxyStateSelect(state, setSelectedProxyState, setIsProxyStateDropdownOpen, setProxyStateSearchTerm);
  };

  const handleProxyInfoClickWrapper = (record: ProxyRecord) => {
    handleProxyInfoClick(record, setSelectedProxyRecord, setShowProxyInfoModal, setIsProxyIdCopied);
  };

  const handleCopyProxyIdWrapper = () => {
    handleCopyProxyId(selectedProxyRecord, setIsProxyIdCopied);
  };

  const handleCopyProxyFieldWrapper = (fieldValue: string, fieldKey: string) => {
    handleCopyProxyField(fieldValue, fieldKey, setCopiedProxyFields);
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
    // if (reuse === true && maySend === false) return 'Reusable';
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
      } else if (serviceTypeFilter === 'Long Numbers') {
        // For Long Numbers, filter by duration
        filtered = filtered.filter(record => record.duration === numberTypeFilter);
      }
    }

    return filtered;
  }, [serviceTypeFilter, statusFilter, numberTypeFilter, firestoreData]);

  // Filter proxy data based on selected filters
  const filteredProxyData = useMemo(() => {
    return filterProxies(proxyFirestoreData, selectedProxyState, selectedProxyDuration);
  }, [proxyFirestoreData, selectedProxyState, selectedProxyDuration]);

  // Filter virtual card data based on selected filters
  const filteredVirtualCardData = useMemo(() => {
    return filterVirtualCards(vccData, cardNumberSearch, fundsFilter);
  }, [vccData, cardNumberSearch, fundsFilter]);

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

  // Force re-render every 10 seconds to update action buttons (but not affecting the listener)
  useEffect(() => {
    if (activeTab !== 'numbers') return;

    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [activeTab]);

  // Real-time listener for user orders
  useEffect(() => {
    if (activeTab !== 'numbers') {
      setIsLoading(false);
      return;
    }

    const uid = userIdRef.current;
    if (!uid) {
      setIsLoading(false);
      setFirestoreData([]);
      return;
    }

    setIsLoading(true);
    let isSubscribed = true; // Flag to prevent state updates after unmount

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    // --- Helper para crear el objeto 'HistoryRecord' ---
    // (Esta función auxiliar se mueve fuera del listener para mayor claridad)
    const createHistoryRecord = (docData: any, docId: string): HistoryRecord => {
      const createdAt = docData.createdAt?.toDate ? docData.createdAt.toDate() : new Date(docData.createdAt);
      const expiry = docData.expiry?.toDate ? docData.expiry.toDate() : new Date(docData.expiry);

      const durationText = calculateDuration(
        docData.type || 'Short',
        createdAt,
        expiry,
        docData.reuse,
        docData.maySend
      );
      
      console.log(docData)
      const allowedStatuses = ['Pending', 'Cancelled', 'Completed', 'Inactive', 'Active', 'Expired', 'Timed out'] as const;

      // Normalizar el status recibido
      let statusValue = typeof docData.status === 'string' ? docData.status : String(docData.status || 'Pending');

      // Manejar variantes comunes de "Timed out" que pueden venir del backend
      const statusLower = statusValue.toLowerCase();
      if (statusLower === 'timed out' || statusLower === 'timedout' || statusLower === 'timeout' || statusLower === 'timed-out') {
        statusValue = 'Timed out';
      }

      // Log para debug - identificar status inválidos
      if (!allowedStatuses.includes(statusValue as any)) {
        console.warn(`⚠️ Invalid status detected for order ${docData.orderId}:`, {
          statusOriginal: docData.status,
          statusNormalizado: statusValue,
          tipo: docData.type,
          maySend: docData.maySend,
          reuse: docData.reuse,
          statusesPermitidos: allowedStatuses
        });
      }

      const validatedStatus = allowedStatuses.includes(statusValue as any) ? statusValue as typeof allowedStatuses[number] : 'Pending';

      const allowedTypes = ['Short', 'Middle', 'Long', 'Empty simcard'] as const;
      const typeValue = typeof docData.type === 'string' ? docData.type : String(docData.type || 'Short');
      const validatedType = allowedTypes.includes(typeValue as any) ? typeValue as typeof allowedTypes[number] : 'Short';

      return {
        id: docData.orderId || docId,
        date: createdAt.toLocaleString('en-US', {
          year: 'numeric', month: 'numeric', day: 'numeric',
          hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
        }),
        expirationDate: expiry.toLocaleString('en-US', {
          year: 'numeric', month: 'numeric', day: 'numeric',
          hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
        }),
        number: String(docData.number || 'N/A'),
        serviceType: validatedType,
        status: validatedStatus,
        service: docData.serviceName || 'N/A',
        price: parseFloat((typeof docData.price === 'number' ? docData.price : 0).toFixed(2)),
        duration: durationText,
        code: String(docData.sms || ''),
        country: docData.country || 'N/A',
        reuse: docData.reuse,
        maySend: docData.maySend,
        createdAt: createdAt,
        // updatedAt: docData.updatedAt?.toDate?.() || null,
        expiry: expiry,
        orderId: docData.orderId || docId
      };
    };

    // Setup real-time listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (!isSubscribed) return;

        // Actualiza el estado de forma funcional y atómica para todos los cambios.
        setFirestoreData(currentData => {
            let nextData = [...currentData]; // Crea una copia mutable del estado actual

            querySnapshot.docChanges().forEach(change => {
                const changedRecord = createHistoryRecord(change.doc.data(), change.doc.id);
                const recordId = changedRecord.id;
                const existingIndex = nextData.findIndex(item => item.id === recordId);

                switch (change.type) {
                    case 'added':
                        if (existingIndex > -1) {
                            // Si ya existe (puede pasar con la caché de Firestore), lo actualizamos.
                            nextData[existingIndex] = changedRecord;
                        } else {
                            // Si es nuevo, lo agregamos. La clasificación final lo ordenará.
                            nextData.push(changedRecord);
                        }
                        break;
                    case 'modified':
                        if (existingIndex > -1) {
                            // Reemplazamos el registro existente con la versión modificada.
                            nextData[existingIndex] = changedRecord;
                        } else {
                            // Si no se encuentra, podría ser un registro que llega tarde. Lo agregamos.
                            nextData.push(changedRecord);
                        }
                        break;
                    case 'removed':
                        if (existingIndex > -1) {
                            // Eliminamos el registro.
                            nextData.splice(existingIndex, 1);
                        }
                        break;
                }
            });

            // Re-ordena el array para asegurar que se respete el 'orderBy' de la consulta.
            // Esto es crucial para que los nuevos elementos aparezcan al principio.
            nextData.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

            return nextData;
        });

        if (isSubscribed) {
          setIsLoading(false);
        }
      },
      (error: any) => {
          if (!isSubscribed) return;
          console.error('Error in real-time listener:', error);

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

          setErrorMessage('An error occurred. Please try again.');
          setShowErrorModal(true);
          setIsLoading(false);
        }
      );

    // Cleanup listener on unmount or when dependencies change
    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [activeTab]); // ONLY activeTab - uid is stable via ref

  // Fetch VCC Orders from Firestore
  useEffect(() => {
    if (activeTab !== 'virtualCards') {
      return;
    }

    if (!currentUser) {
      console.error('No authenticated user');
      setIsLoadingVCC(false);
      return;
    }

    const uid = currentUser.uid;
    setIsLoadingVCC(true);
    let isSubscribed = true;

    const vccOrdersRef = collection(db, 'vccOrders');
    const q = query(
      vccOrdersRef,
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;

        const vccRecords: VirtualCardRecord[] = snapshot.docs.map(doc => {
          const data = doc.data() as VCCOrderDocument;
          return convertVCCDocumentToRecord(data);
        });

        setVccData(vccRecords);
        setIsLoadingVCC(false);
      },
      (error: any) => {
        if (!isSubscribed) return;
        console.error('Error fetching VCC orders:', error);

        // Handle specific Firebase errors
        let errorMsg = 'An error occurred when loading the cards, please try again';

        if (error?.code === 'permission-denied') {
          errorMsg = 'Access denied, you cannot check these cards';
        } else if (error?.code === 'unavailable') {
          errorMsg = 'Service temporarily unavailable, please try again';
        } else if (error?.code === 'unauthenticated') {
          errorMsg = 'You are not authenticated';
        } else if (error?.message) {
          errorMsg = `Error: ${error.message}`;
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        setIsLoadingVCC(false);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [activeTab]);

  // Fetch Proxy Orders from Firestore
  useEffect(() => {
    if (activeTab !== 'proxies') {
      return;
    }

    if (!currentUser) {
      console.error('No authenticated user');
      setIsLoadingProxies(false);
      return;
    }

    const uid = currentUser.uid;
    setIsLoadingProxies(true);
    let isSubscribed = true;

    const proxyOrdersRef = collection(db, 'proxyOrders');
    const q = query(
      proxyOrdersRef,
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;

        const proxyRecords: ProxyRecord[] = snapshot.docs.map(doc => {
          const data = doc.data() as ProxyOrderDocument;
          return convertProxyDocumentToRecord(data);
        });

        setProxyFirestoreData(proxyRecords);
        setIsLoadingProxies(false);
      },
      (error: any) => {
        if (!isSubscribed) return;
        console.error('Error fetching proxy orders:', error);

        // Handle specific Firebase errors
        let errorMsg = 'An error occurred when loading the proxies, please try again';

        if (error?.code === 'permission-denied') {
          errorMsg = 'Access denied, you cannot check these proxies';
        } else if (error?.code === 'unavailable') {
          errorMsg = 'Service temporarily unavailable, please try again';
        } else if (error?.code === 'unauthenticated') {
          errorMsg = 'You are not authenticated';
        } else if (error?.message) {
          errorMsg = `Error: ${error.message}`;
        }

        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        setIsLoadingProxies(false);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [activeTab]);

  // Get status color based on type and status
  // Updated to delegate to service-specific functions
  const getStatusColor = (status: string, serviceType: string) => {
    if (serviceType === 'Short' || serviceType === 'Short Numbers') {
      return getShortStatusColor(status);
    } else if (serviceType === 'Middle' || serviceType === 'Middle Numbers') {
      return getMiddleStatusColor(status);
    } else if (serviceType === 'Long' || serviceType === 'Long Numbers') {
      return getLongStatusColor(status);
    } else if (serviceType === 'Empty simcard' || serviceType === 'Empty SIM card' || serviceType === 'Empty Simcard' || serviceType === 'Empty SIM cards') {
      return getEmptySimStatusColor(status);
    }
    return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
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
      case 'Empty SIM cards':
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

  // Function now imported from VirtualCardLogic as handleCopyCardNumberVC

  const handleCopyUuid = async () => {
    try {
      await navigator.clipboard.writeText(selectedUuid);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy UUID:', err);
    }
  };

  // Get available actions based on service type, status, reuse and maySend
  const getAvailableActions = (record: HistoryRecord) => {
    const { serviceType } = record;

    if (serviceType === 'Short') {
      return getShortAvailableActions(record);
    } else if (serviceType === 'Middle') {
      return getMiddleAvailableActions(record);
    } else if (serviceType === 'Long') {
      return getLongAvailableActions(record);
    } else if (serviceType === 'Empty simcard') {
      return getEmptySimAvailableActions(record);
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
  const handleActionClick = async (action: string, record: HistoryRecord) => {
    console.log(`Action "${action}" clicked for record:`, record.id);
    // Close the menu after clicking an action
    setOpenActionMenus(prev => ({ ...prev, [record.id]: false }));

    // Handle Cancel action
    if (action === 'Cancel') {
      if (record.serviceType === 'Short') {
        await handleCancelShort(record.orderId || '', setErrorMessage, setShowErrorModal, setCancellingOrderId);
      } else if (record.serviceType === 'Middle') {
        await handleCancelMiddle(record.id, record.orderId || '', setErrorMessage, setShowErrorModal, setCancellingOrderId);
      } else if (record.serviceType === 'Long') {
        await handleCancelLong(record.id, record.orderId || '', setErrorMessage, setShowErrorModal, setCancellingOrderId);
      } else if (record.serviceType === 'Empty simcard') {
        await handleCancelEmptySim(record.id, record.orderId || '', setErrorMessage, setShowErrorModal, setCancellingOrderId);
      }
      return;
    }

    // Handle Reuse action
    // if (action === 'Reuse') {
    //   await handleReuseNumber(record.orderId || '', setErrorMessage, setShowErrorModal, setReusingOrderId);
    //   return;
    // }

    // Handle Send action
    if (action === 'Send') {
      navigate('/sendmessage');
      return;
    }

    // Handle Activate action - use service-specific activate functions
    if (action === 'Activate') {
      if (record.serviceType === 'Middle') {
        await handleActivateMiddle(record.id, record.orderId || '', setErrorMessage, setShowErrorModal, setActivatingOrderId);
      } else if (record.serviceType === 'Long') {
        await handleActivateLong(record.id, record.orderId || '', setErrorMessage, setShowErrorModal, setActivatingOrderId);
      } else if (record.serviceType === 'Empty simcard') {
        await handleActivateEmptySim(record.id, record.orderId || '', setErrorMessage, setShowErrorModal, setActivatingOrderId);
      }
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
                  History
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
                {/* Check if any operation is in progress */}
                {(() => {
                  const isProcessing = cancellingOrderId !== null || /* reusingOrderId !== null || */ activatingOrderId !== null;
                  
                  return (
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
                          onClick={() => !isProcessing && setIsServiceTypeDropdownOpen(!isServiceTypeDropdownOpen)}
                          className={`w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between ${
                            isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-slate-500/50'
                          }`}
                        >
                          <span>{serviceTypeFilter === 'All' ? 'All Services' : serviceTypeFilter}</span>
                        </div>

                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isServiceTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Custom Dropdown Options */}
                        {isServiceTypeDropdownOpen && !isProcessing && (
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

                    {/* Number Type Filter - Conditional for Short, Middle, Long Numbers */}
                    {(serviceTypeFilter === 'Short Numbers' || serviceTypeFilter === 'Middle Numbers' || serviceTypeFilter === 'Long Numbers') && (
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                          Number Type
                        </label>
                        <div className="relative group" ref={numberTypeDropdownRef}>
                          <div
                            onClick={() => !isProcessing && setIsNumberTypeDropdownOpen(!isNumberTypeDropdownOpen)}
                            className={`w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between ${
                              isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-slate-500/50'
                            }`}
                          >
                            <span>{numberTypeFilter === 'All types' ? 'All Types' : numberTypeFilter}</span>
                          </div>

                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isNumberTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          {/* Custom Dropdown Options */}
                          {isNumberTypeDropdownOpen && !isProcessing && (
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
                          onClick={() => !isProcessing && setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          className={`w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between ${
                            isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-slate-500/50'
                          }`}
                        >
                          <span>{statusFilter === 'All' ? 'All Statuses' : statusFilter}</span>
                        </div>

                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Custom Dropdown Options */}
                        {isStatusDropdownOpen && !isProcessing && (
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
                          <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold border w-24 ${getStatusColor(getDisplayStatus(record), record.serviceType)}`}>
                            {getDisplayStatus(record)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-white">{record.service}</td>
                        <td className="py-4 px-6">
                          <span className="text-emerald-400 font-semibold">${formatPrice(record.price)}</span>
                        </td>
                        <td className="py-4 px-6">
                          {(() => {
                            // ALWAYS check status directly from record - never trust cached data
                            if (record.serviceType === 'Short') {
                              // If number is sleeping (awakeIn exists and is in the future), show "Activating..."
                              if (record.awakeIn) {
                                const now = new Date().getTime();
                                const wakeTime = record.awakeIn.getTime();
                                if (now < wakeTime) {
                                  return <span className="font-mono text-orange-500 font-semibold animate-pulse">Activating...</span>;
                                }
                              }

                              // Check if codeAwakeAt exists - show CodeAwakeTimer
                              if (record.codeAwakeAt) {
                                const now = new Date().getTime();
                                const startTime = record.codeAwakeAt.getTime();
                                const fiveMinutes = 5 * 60 * 1000;
                                const expiryTime = startTime + fiveMinutes;

                                console.log('CodeAwakeTimer check:', {
                                  recordId: record.id,
                                  now,
                                  startTime,
                                  expiryTime,
                                  timeLeft: expiryTime - now,
                                  shouldShow: now < expiryTime
                                });

                                // Only show timer if within the 5-minute window
                                if (now < expiryTime) {
                                  return <CodeAwakeTimer
                                    codeAwakeAt={record.codeAwakeAt}
                                    recordId={record.id}
                                    onTimeout={() => {
                                      console.log('CodeAwakeTimer timeout for:', record.id);
                                      // Remove codeAwakeAt when timer expires
                                      setFirestoreData(currentData =>
                                        currentData.map(r =>
                                          r.id === record.id
                                            ? { ...r, codeAwakeAt: undefined }
                                            : r
                                        )
                                      );
                                      setForceUpdate(prev => prev + 1);
                                    }}
                                  />;
                                }
                              }

                              if (record.status === 'Completed') {
                                return <span className="font-mono text-blue-500 font-semibold">{record.code || ''}</span>;
                              } else if (record.status === 'Pending' && record.createdAt) {
                                return <CountdownTimer
                                  createdAt={record.createdAt}
                                  recordId={record.id}
                                  status={record.status}
                                  // updatedAt={record.updatedAt}
                                  onTimeout={() => setForceUpdate(prev => prev + 1)}
                                />;
                              } else {
                                return <span className="font-mono text-slate-400">-</span>;
                              }
                            } else if (record.serviceType === 'Middle') {
                              // Middle: Show countdown timer when Active (always, even with SMS)
                              if (record.status === 'Active') {
                                return <MiddleCountdownTimer
                                  record={record}
                                  onTimeout={() => setForceUpdate(prev => prev + 1)}
                                />;
                              }

                              // Not Active - show SMS or dash
                              const hasSms = record.code && record.code.trim() !== '';
                              if (hasSms) {
                                return <span className="font-mono text-blue-500 font-semibold">{record.code}</span>;
                              } else {
                                return <span className="font-mono text-slate-400">-</span>;
                              }
                            } else if (record.serviceType === 'Long') {
                              // Long: Show countdown timer when Active (always, even with SMS)
                              if (record.status === 'Active') {
                                return <LongCountdownTimer
                                  record={record}
                                  onTimeout={() => setForceUpdate(prev => prev + 1)}
                                />;
                              }

                              // Not Active - show SMS or dash
                              const hasSms = record.code && record.code.trim() !== '';
                              if (hasSms) {
                                return <span className="font-mono text-blue-500 font-semibold">{record.code}</span>;
                              } else {
                                return <span className="font-mono text-slate-400">-</span>;
                              }
                            } else if (record.serviceType === 'Empty simcard') {
                              // Empty SIM: Show countdown timer when Active (always, even with SMS)
                              if (record.status === 'Active') {
                                return <EmptySimCountdownTimer
                                  record={record}
                                  onTimeout={() => setForceUpdate(prev => prev + 1)}
                                />;
                              }

                              // Not Active - show SMS or dash
                              const hasSms = record.code && record.code.trim() !== '';
                              if (hasSms) {
                                return <span className="font-mono text-blue-500 font-semibold">{record.code}</span>;
                              } else {
                                return <span className="font-mono text-slate-400">-</span>;
                              }
                            }
                            return <span className="font-mono text-slate-400">-</span>;
                          })()
                          }
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center">
                            {(() => {
                              // Check if number is sleeping (awakeIn exists and is in the future)
                              if (record.awakeIn) {
                                const now = new Date().getTime();
                                const wakeTime = record.awakeIn.getTime();
                                if (now < wakeTime) {
                                  // Show wake up timer instead of action buttons
                                  return (
                                    <WakeUpTimer 
                                      awakeIn={record.awakeIn} 
                                      recordId={record.id}
                                      onWakeUp={() => {
                                        // Remove awakeIn when timer expires and force re-render
                                        setFirestoreData(currentData => 
                                          currentData.map(r => 
                                            r.id === record.id 
                                              ? { ...r, awakeIn: undefined }
                                              : r
                                          )
                                        );
                                        setForceUpdate(prev => prev + 1);
                                      }}
                                    />
                                  );
                                }
                              }

                              const availableActions = getAvailableActions(record);
                              const hasActions = availableActions.length > 0;
                              const isCancelling = cancellingOrderId === record.id;
                              // const isReusing = reusingOrderId === record.id;
                              const isActivating = activatingOrderId === record.id;
                              const isOtherProcessing = (cancellingOrderId !== null && cancellingOrderId !== record.id) ||
                                                        // (reusingOrderId !== null && reusingOrderId !== record.id) ||
                                                        (activatingOrderId !== null && activatingOrderId !== record.id);

                              // Show spinner if this record is being cancelled, reused, or activated
                              if (isCancelling || /* isReusing || */ isActivating) {
                                return (
                                  <div className="flex justify-center">
                                    <div className="w-5 h-5 border-2 border-slate-400/30 border-t-slate-200 rounded-full animate-spin"></div>
                                  </div>
                                );
                              }

                              return (
                                <div className="relative" ref={(el) => { actionMenuRefs.current[record.id] = el; }}>
                                  <button
                                    onClick={() => hasActions && !isOtherProcessing && handleActionMenuToggle(record.id)}
                                    className={`p-2 rounded-lg transition-colors duration-200 ${
                                      hasActions && !isOtherProcessing
                                        ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 cursor-pointer'
                                        : 'text-slate-600 cursor-not-allowed'
                                    }`}
                                    disabled={!hasActions || isOtherProcessing}
                                    title={hasActions ? "More actions" : "No actions available"}
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                    </svg>
                                  </button>

                                  {/* Action Menu Dropdown */}
                                  {hasActions && openActionMenus[record.id] && !isOtherProcessing && (
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
          )})()}
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
                  {isLoadingVCC ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-slate-400 mt-4">Loading cards...</p>
                    </div>
                  ) : filteredVirtualCardData.length > 0 ? (
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
                                    onClick={() => handleCopyCardNumberVC(record.cardNumber, record.id, setCopiedCardNumbers)}
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
                            onChange={handleProxyStateInputChangeWrapper}
                            onClick={handleProxyStateInputClickWrapper}
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
                                  onClick={() => handleProxyStateSelectWrapper(state.name)}
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
                  {isLoadingProxies ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-slate-400 mt-4">Loading proxies...</p>
                    </div>
                  ) : filteredProxyData.length > 0 ? (
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
                                    onClick={() => handleProxyInfoClickWrapper(record)}
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
                                    onClick={() => handleCopyProxyFieldWrapper(record.ip, `ip-${record.id}`)}
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
    </DashboardLayout>
  );
};

export default History;