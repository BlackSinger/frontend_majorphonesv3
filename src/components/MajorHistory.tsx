import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut, getAuth } from 'firebase/auth';
import MajorDashboardLayout from './MajorDashboardLayout';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

import {
  getShortDisplayStatus,
  getShortStatusColor,
  calculateShortDuration,
  getShortAvailableActions,
  handleCancelShort,
  // handleReuseNumber
} from './ShortLogic';

import {
  getMiddleDisplayStatus,
  getMiddleStatusColor,
  calculateMiddleDuration,
  getMiddleAvailableActions,
  getMiddleCountdownTime,
  handleCancelMiddle,
  handleActivateMiddle
} from './MiddleLogic';

import {
  getLongDisplayStatus,
  getLongStatusColor,
  calculateLongDuration,
  getLongAvailableActions,
  getLongCountdownTime,
  handleCancelLong,
  handleActivateLong
} from './LongLogic';

import {
  getEmptySimDisplayStatus,
  getEmptySimStatusColor,
  calculateEmptySimDuration,
  getEmptySimAvailableActions,
  getEmptySimCountdownTime,
  handleCancelEmptySim,
  handleActivateEmptySim
} from './EmptySimLogic';

import {
  type VirtualCardRecord,
  handleCopyCardNumber as handleCopyCardNumberVC,
  formatPrice as formatVCCPrice
} from './VirtualCardLogic';


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
  asleep?: boolean;
  createdAt?: Date;
  // updatedAt?: Date; // Timestamp of last update (used in reuse)
  expiry?: Date;
  awakeIn?: Date;
  codeAwakeAt?: Date;
  orderId?: string;
  email?: string;
}

const CountdownTimer: React.FC<{ createdAt: Date; recordId: string; status: string; onTimeout?: () => void; /* updatedAt?: Date */ }> = React.memo(({ createdAt, recordId, status, onTimeout, /* updatedAt */ }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (status !== 'Pending') {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      // Usage of updatedAt if available (for reused numbers), otherwise use createdAt
      // const startTime = updatedAt ? updatedAt.getTime() : createdAt.getTime();
      const startTime = createdAt.getTime();
      const fiveMinutes = 5 * 60 * 1000;
      const expiryTime = startTime + fiveMinutes;
      const remaining = expiryTime - now;

      return Math.max(0, Math.floor(remaining / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (status !== "Pending"){
            clearInterval(interval);
            setTimeLeft(0);
      }
      if (remaining <= 0) {
        clearInterval(interval);
        if (onTimeout) {
          onTimeout();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, /* updatedAt, */ status, onTimeout]);

  if (status !== 'Pending') {
    return <span className="font-mono text-slate-400">-</span>;
  }

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

const MiddleCountdownTimer: React.FC<{ record: HistoryRecord; onTimeout?: () => void }> = React.memo(({ record, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const countdown = getMiddleCountdownTime(record);
      setTimeLeft(countdown);

      if (countdown === null && onTimeout) {
        onTimeout();
      }
    };

    updateCountdown();

    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => clearInterval(interval);
  }, [record, onTimeout]);

  if (timeLeft === null) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  return (
    <span className="font-mono text-yellow-400 font-semibold">
      {timeLeft}
    </span>
  );
});

const LongCountdownTimer: React.FC<{ record: HistoryRecord; onTimeout?: () => void }> = React.memo(({ record, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const countdown = getLongCountdownTime(record);
      setTimeLeft(countdown);

      if (countdown === null && onTimeout) {
        onTimeout();
      }
    };

    updateCountdown();

    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => clearInterval(interval);
  }, [record, onTimeout]);

  if (timeLeft === null) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  return (
    <span className="font-mono text-yellow-400 font-semibold">
      {timeLeft}
    </span>
  );
});

const EmptySimCountdownTimer: React.FC<{ record: HistoryRecord; onTimeout?: () => void }> = React.memo(({ record, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const countdown = getEmptySimCountdownTime(record);
      setTimeLeft(countdown);

      if (countdown === null && onTimeout) {
        onTimeout();
      }
    };

    updateCountdown();

    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => clearInterval(interval);
  }, [record, onTimeout]);

  if (timeLeft === null) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  return (
    <span className="font-mono text-yellow-400 font-semibold">
      {timeLeft}
    </span>
  );
});

const WakeUpTimer: React.FC<{ awakeIn: Date; recordId: string; onWakeUp?: () => void }> = React.memo(({ awakeIn, recordId, onWakeUp }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const wakeTime = awakeIn.getTime();
      const remaining = wakeTime - now;

      return Math.max(0, Math.floor(remaining / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onWakeUp) {
          onWakeUp();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [awakeIn, onWakeUp]);

  if (timeLeft === 0) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <span className="font-mono text-orange-500 font-semibold text-xs">
      {hours > 0 ? `${hours}:` : ''}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
});

const CodeAwakeTimer: React.FC<{ codeAwakeAt: Date; recordId: string; onTimeout?: () => void }> = React.memo(({ codeAwakeAt, recordId, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const startTime = codeAwakeAt.getTime();
      const fiveMinutes = 5 * 60 * 1000;
      const expiryTime = startTime + fiveMinutes;
      const remaining = expiryTime - now;

      return Math.max(0, Math.floor(remaining / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onTimeout) {
          onTimeout();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [codeAwakeAt, onTimeout]);

  if (timeLeft === 0) {
    return <span className="font-mono text-slate-400">-</span>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <span className="font-mono text-yellow-500 font-semibold">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
});

const MajorHistory: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState<'numbers' | 'vcc'>('numbers');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [numberTypeFilter, setNumberTypeFilter] = useState<string>('All');
  const [isServiceTypeDropdownOpen, setIsServiceTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isNumberTypeDropdownOpen, setIsNumberTypeDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showUuidModal, setShowUuidModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isInfoIdCopied, setIsInfoIdCopied] = useState(false);
  const [openActionMenus, setOpenActionMenus] = useState<{[key: string]: boolean}>({});
  const serviceTypeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const numberTypeDropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const [firestoreData, setFirestoreData] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Cache states for each tab
  const [numbersDataFetched, setNumbersDataFetched] = useState(false);
  const [vccDataFetched, setVccDataFetched] = useState(false);
  const [cachedNumbersData, setCachedNumbersData] = useState<HistoryRecord[]>([]);
  const [cachedVccData, setCachedVccData] = useState<VirtualCardRecord[]>([]);

  // VCC filters and pagination
  const [cardNumberSearch, setCardNumberSearch] = useState('');
  const [fundsFilter, setFundsFilter] = useState<string>('All');
  const [isFundsDropdownOpen, setIsFundsDropdownOpen] = useState(false);
  const [currentVirtualCardPage, setCurrentVirtualCardPage] = useState(1);
  const [copiedCardNumbers, setCopiedCardNumbers] = useState<{[key: string]: boolean}>({});
  const fundsDropdownRef = useRef<HTMLDivElement>(null);

  const [, setForceUpdate] = useState(0);

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Reusing state: track which order is being reused
  // const [reusingOrderId, setReusingOrderId] = useState<string | null>(null);

  const [activatingOrderId, setActivatingOrderId] = useState<string | null>(null);

  const itemsPerPage = 10;

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

  const formatPrice = (price: number): string => {
    return price % 1 === 0 ? price.toString() : price.toFixed(2);
  };

  const getCodeDisplay = (record: HistoryRecord) => {
    const { serviceType, status, code, createdAt, codeAwakeAt } = record;
    const smsValue = code || '';
    const hasSms = smsValue && smsValue.trim() !== '';

    if (serviceType === 'Short') { 
      if (codeAwakeAt) {
        const now = new Date().getTime();
        const startTime = codeAwakeAt.getTime();
        const fiveMinutes = 5 * 60 * 1000;
        const expiryTime = startTime + fiveMinutes;

        if (now < expiryTime) {
          return { type: 'codeAwakeTimer', value: null, codeAwakeAt };
        }
      }

      if (status === 'Completed') {
        return { type: 'text', value: smsValue };
      } else if (status === 'Pending') {
        return { type: 'countdown', value: null, createdAt };
      } else if (status === 'Cancelled' || status === 'Timed out') {
        return { type: 'text', value: '-' };
      } else {
        return { type: 'text', value: smsValue };
      }
    } else if (serviceType === 'Middle') {
      const countdownTime = getMiddleCountdownTime(record);
      if (countdownTime !== null) {
        return { type: 'middleCountdown', value: countdownTime };
      }

      switch (status) {
        case 'Active':
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
      const countdownTime = getLongCountdownTime(record);
      if (countdownTime !== null) {
        return { type: 'longCountdown', value: countdownTime };
      }

      switch (status) {
        case 'Active':
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
      const countdownTime = getEmptySimCountdownTime(record);
      if (countdownTime !== null) {
        return { type: 'emptySimCountdown', value: countdownTime };
      }

      switch (status) {
        case 'Active':
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

    return { type: 'text', value: smsValue };
  };

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
        return ['All types', 'Single use', /* 'Reusable', */ 'Receive/Send'];
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
      if (fundsDropdownRef.current && !fundsDropdownRef.current.contains(event.target as Node)) {
        setIsFundsDropdownOpen(false);
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
      case 'Short Numbers': return 'Short';
      case 'Middle Numbers': return 'Middle';
      case 'Long Numbers': return 'Long';
      case 'Empty SIM cards': return 'Empty simcard';
      default: return null;
    }
  };

  const getShortNumberType = (record: HistoryRecord) => {
    const { reuse, maySend } = record;
    // if (reuse === true && maySend === false) return 'Reusable';
    if (reuse === false && maySend === false) return 'Single use';
    if (reuse === false && maySend === true) return 'Receive/Send';
    return 'Unknown';
  };

  const filteredData = useMemo(() => {
    let filtered = firestoreData;

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
  }, [serviceTypeFilter, statusFilter, numberTypeFilter, firestoreData]);


  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // VCC filtering and pagination
  const filteredVirtualCardData = useMemo(() => {
    let filtered = cachedVccData;

    // Filter by card number search
    if (cardNumberSearch.trim()) {
      filtered = filtered.filter(record =>
        record.cardNumber.toLowerCase().includes(cardNumberSearch.toLowerCase())
      );
    }

    // Filter by initial funds
    if (fundsFilter !== 'All') {
      const fundsValue = fundsFilter === '$0' ? 0 : 3;
      filtered = filtered.filter(record => record.funds === fundsValue);
    }

    return filtered;
  }, [cardNumberSearch, fundsFilter, cachedVccData]);

  const totalVirtualCardPages = Math.ceil(filteredVirtualCardData.length / itemsPerPage);
  const virtualCardStartIndex = (currentVirtualCardPage - 1) * itemsPerPage;
  const virtualCardEndIndex = virtualCardStartIndex + itemsPerPage;
  const paginatedVirtualCardData = filteredVirtualCardData.slice(virtualCardStartIndex, virtualCardEndIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [serviceTypeFilter, statusFilter, numberTypeFilter]);

  useEffect(() => {
    if (activeTab !== 'numbers') return;

    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      if (activeTab === 'numbers') {
        // Check if we already fetched numbers data
        if (numbersDataFetched) {
          setFirestoreData(cachedNumbersData);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);

        try {
          const currentUser = getAuth().currentUser;

          if (!currentUser) {
            setIsLoading(false);
            setFirestoreData([]);
            return;
          }

          const idToken = await currentUser.getIdToken();

          const response = await fetch('https://getsmsorders-ezeznlhr5a-uc.a.run.app', {
            method: 'GET',
            headers: {
              'authorization': `${idToken}`,
              'Content-Type': 'application/json'
            }
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
              setIsLoading(false);
              return;
            }
          }

          console.log('Backend response (Numbers):', data);

          let smsOrdersArray = [];

          if (Array.isArray(data)) {
            smsOrdersArray = data;
          } else if (data.smsOrders && Array.isArray(data.smsOrders)) {
            smsOrdersArray = data.smsOrders;
          } else if (data.orders && Array.isArray(data.orders)) {
            smsOrdersArray = data.orders;
          } else {
            console.error('Expected array but got:', data);
            setFirestoreData([]);
            setIsLoading(false);
            return;
          }

          const formattedData = smsOrdersArray.map((item: any) => {
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

            let duration = 'N/A';
            if (createdAtDate && expiryDate && item.type) {
              duration = calculateDuration(
                item.type,
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
              number: item.number || 'N/A',
              serviceType: item.type,
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
              orderId: item.orderId || 'N/A',
              email: item.email || 'N/A'
            };
          });

          setFirestoreData(formattedData);
          setCachedNumbersData(formattedData);
          setNumbersDataFetched(true);
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching SMS orders:', error);
          setErrorMessage('Please refresh');
          setShowErrorModal(true);
          setIsLoading(false);
        }
      } else if (activeTab === 'vcc') {
        // Check if we already fetched VCC data
        if (vccDataFetched) {
          console.log('Using cached VCC data:', cachedVccData);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);

        try {
          const currentUser = getAuth().currentUser;

          if (!currentUser) {
            setIsLoading(false);
            return;
          }

          const idToken = await currentUser.getIdToken();

          const response = await fetch('https://getvccorders-ezeznlhr5a-uc.a.run.app', {
            method: 'GET',
            headers: {
              'authorization': `${idToken}`,
              'Content-Type': 'application/json'
            }
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
              setIsLoading(false);
              return;
            }
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
          } else {
            console.error('Expected VCC array but got:', data);
            setCachedVccData([]);
            setVccDataFetched(true);
            setIsLoading(false);
            return;
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

            return {
              id: item.orderId || 'N/A',
              purchaseDate: formattedDate,
              price: item.price || 0,
              cardNumber: item.cardNumber || 'N/A',
              expirationDate: item.expirationDate || 'N/A',
              cvv: item.cvv || 'N/A',
              funds: item.price || 0
            };
          });

          setCachedVccData(formattedVccData);
          setVccDataFetched(true);
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching VCC orders:', error);
          setErrorMessage('Please refresh');
          setShowErrorModal(true);
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [activeTab, navigate, numbersDataFetched, vccDataFetched, cachedNumbersData, cachedVccData]);



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

  const handleUuidClick = (uuid: string) => {
    setSelectedUuid(uuid);
    setShowUuidModal(true);
    setIsCopied(false);
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


  const handleCopyUuid = async () => {
    try {
      await navigator.clipboard.writeText(selectedUuid);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
    }
  };

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

  const handleActionMenuToggle = (recordId: string) => {
    setOpenActionMenus(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  const handleActionClick = async (action: string, record: HistoryRecord) => {
    setOpenActionMenus(prev => ({ ...prev, [record.id]: false }));

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

    if (action === 'Send') {
      navigate('/sendmessage');
      return;
    }

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

  };

  return (
    <MajorDashboardLayout currentPath="/major-history">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  History
                </h1>
                <p className="text-slate-300 text-md text-left">View all purchases</p>
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
                  onClick={() => setActiveTab('numbers')}
                  className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                    activeTab === 'numbers'
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  Numbers
                </button>
                <button
                  onClick={() => setActiveTab('vcc')}
                  className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                    activeTab === 'vcc'
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
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">User</th>
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
                        <td className="py-4 px-6 text-white">{record.email || 'N/A'}</td>
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
                            if (record.serviceType === 'Short') {
                              if (record.awakeIn) {
                                const now = new Date().getTime();
                                const wakeTime = record.awakeIn.getTime();
                                if (now < wakeTime) {
                                  return <span className="font-mono text-orange-500 font-semibold animate-pulse">Activating...</span>;
                                }
                              }

                              if (record.codeAwakeAt) {
                                const now = new Date().getTime();
                                const startTime = record.codeAwakeAt.getTime();
                                const fiveMinutes = 5 * 60 * 1000;
                                const expiryTime = startTime + fiveMinutes;

                                if (now < expiryTime) {
                                  return <CodeAwakeTimer
                                    codeAwakeAt={record.codeAwakeAt}
                                    recordId={record.id}
                                    onTimeout={() => {
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
                                  onTimeout={() => setForceUpdate(prev => prev + 1)}
                                />;
                              } else {
                                return <span className="font-mono text-slate-400">-</span>;
                              }
                            } else if (record.serviceType === 'Middle') {
                              if (record.status === 'Active') {
                                return <MiddleCountdownTimer
                                  record={record}
                                  onTimeout={() => setForceUpdate(prev => prev + 1)}
                                />;
                              }

                              const hasSms = record.code && record.code.trim() !== '';
                              if (hasSms) {
                                return <span className="font-mono text-blue-500 font-semibold">{record.code}</span>;
                              } else {
                                return <span className="font-mono text-slate-400">-</span>;
                              }
                            } else if (record.serviceType === 'Long') {
                              if (record.status === 'Active') {
                                return <LongCountdownTimer
                                  record={record}
                                  onTimeout={() => setForceUpdate(prev => prev + 1)}
                                />;
                              }

                              const hasSms = record.code && record.code.trim() !== '';
                              if (hasSms) {
                                return <span className="font-mono text-blue-500 font-semibold">{record.code}</span>;
                              } else {
                                return <span className="font-mono text-slate-400">-</span>;
                              }
                            } else if (record.serviceType === 'Empty simcard') {
                              if (record.status === 'Active') {
                                return <EmptySimCountdownTimer
                                  record={record}
                                  onTimeout={() => setForceUpdate(prev => prev + 1)}
                                />;
                              }

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
          )})()}
            </>
            )}

            {/* VCC Tab Content */}
            {activeTab === 'vcc' && (
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
                  {isLoading ? (
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
                      <p className="text-slate-400 text-lg">No virtual debit cards match your current filters</p>
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
    </MajorDashboardLayout>
  );
};

export default MajorHistory;