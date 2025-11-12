export interface ProxyRecord {
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
  email: string;
}

export interface ProxyOrderDocument {
  orderId: string;
  createdAt: any; // Can be Firestore Timestamp or {_seconds: number, _nanoseconds: number}
  expiry: any; // Can be Firestore Timestamp or {_seconds: number, _nanoseconds: number}
  state: string;
  price: any;
  ip: string;
  httpsPort: string;
  socks5Port: string;
  userProxy: string;
  passProxy: string;
  uid: string;
  email?: string;
}

export const usaStates = [
  { code: 'All States', name: 'All States' }
];

export const proxyDurations = ['All Durations', '1 hour', '1 day', '7 days', '30 days'];

export const filterProxyStates = (searchTerm: string) => {
  return usaStates.filter(state =>
    state.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

export const handleProxyStateSelect = (
  stateName: string,
  setSelectedProxyState: (state: string) => void,
  setIsProxyStateDropdownOpen: (open: boolean) => void,
  setProxyStateSearchTerm: (term: string) => void
) => {
  setSelectedProxyState(stateName);
  setIsProxyStateDropdownOpen(false);
  setProxyStateSearchTerm('');
};

export const handleProxyStateInputChange = (
  value: string,
  setProxyStateSearchTerm: (term: string) => void
) => {
  setProxyStateSearchTerm(value);
};

export const handleProxyStateInputClick = (
  setIsProxyStateDropdownOpen: (fn: (prev: boolean) => boolean) => void
) => {
  setIsProxyStateDropdownOpen(prev => !prev);
};

export const handleProxyInfoClick = (
  record: ProxyRecord,
  setSelectedProxyRecord: (record: ProxyRecord) => void,
  setShowProxyInfoModal: (show: boolean) => void,
  setIsProxyIdCopied: (copied: boolean) => void
) => {
  setSelectedProxyRecord(record);
  setShowProxyInfoModal(true);
  setIsProxyIdCopied(false);
};

export const handleCopyProxyId = async (
  selectedProxyRecord: ProxyRecord | null,
  setIsProxyIdCopied: (copied: boolean) => void
) => {
  if (selectedProxyRecord) {
    try {
      await navigator.clipboard.writeText(selectedProxyRecord.id);
      setIsProxyIdCopied(true);
      setTimeout(() => setIsProxyIdCopied(false), 2000);
    } catch (err) {
    }
  }
};

export const handleCopyProxyField = async (
  fieldValue: string,
  fieldKey: string,
  setCopiedProxyFields: (fn: (prev: {[key: string]: boolean}) => {[key: string]: boolean}) => void
) => {
  try {
    await navigator.clipboard.writeText(fieldValue);
    setCopiedProxyFields(prev => ({ ...prev, [fieldKey]: true }));
    setTimeout(() => {
      setCopiedProxyFields(prev => ({ ...prev, [fieldKey]: false }));
    }, 2000);
  } catch (err) {
  }
};

export const filterProxies = (
  proxies: ProxyRecord[],
  selectedState: string,
  selectedDuration: string
): ProxyRecord[] => {

  return proxies.filter(proxy => {
    const matchesState = selectedState === 'All States' || proxy.usaState === selectedState;
    const matchesDuration = selectedDuration === 'All Durations' || proxy.duration === selectedDuration;
    return matchesState && matchesDuration;
  });
};

export const formatProxyPrice = (price: number): string => {
  if (price % 1 === 0) {
    return price.toString();
  }
  return price.toFixed(1).replace(/\.0$/, '');
};

export const getStateNameFromCode = (stateCode: string): string => {
  const state = usaStates.find(s => s.code === stateCode);
  return state ? state.name : stateCode;
};

export const calculateProxyDuration = (createdAt: Date, expiry: Date): string => {
  const diffMs = expiry.getTime() - createdAt.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours === 1) {
    return '1 hour';
  } else if (diffHours === 24 || diffDays === 1) {
    return '1 day';
  } else if (diffDays === 7) {
    return '7 days';
  } else if (diffDays === 30) {
    return '30 days';
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
  } else {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  }
};

export const convertProxyDocumentToRecord = (doc: ProxyOrderDocument): ProxyRecord => {
  // Handle Firestore timestamp format {_seconds, _nanoseconds}
  let createdAt: Date;
  if (doc.createdAt && typeof doc.createdAt === 'object' && '_seconds' in doc.createdAt) {
    createdAt = new Date(doc.createdAt._seconds * 1000);
  } else if (doc.createdAt?.toDate) {
    createdAt = doc.createdAt.toDate();
  } else {
    createdAt = new Date(doc.createdAt);
  }

  let expiry: Date;
  if (doc.expiry && typeof doc.expiry === 'object' && '_seconds' in doc.expiry) {
    expiry = new Date(doc.expiry._seconds * 1000);
  } else if (doc.expiry?.toDate) {
    expiry = doc.expiry.toDate();
  } else {
    expiry = new Date(doc.expiry);
  }

  let priceNum = typeof doc.price === 'number' ? doc.price : parseFloat(doc.price);
  if (isNaN(priceNum)) priceNum = 0;

  const stateName = getStateNameFromCode(doc.state);

  const duration = calculateProxyDuration(createdAt, expiry);

  return {
    id: doc.orderId,
    purchaseDate: createdAt.toLocaleString('en-US', {
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
    usaState: stateName,
    price: priceNum,
    duration: duration,
    ip: doc.ip,
    httpsPort: doc.httpsPort,
    socks5Port: doc.socks5Port,
    user: doc.userProxy,
    password: doc.passProxy,
    email: doc.email || 'N/A'
  };
};
