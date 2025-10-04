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
}

export interface ProxyOrderDocument {
  orderId: string;
  createdAt: any; // Firestore Timestamp
  expiry: any; // Firestore Timestamp
  state: string; // 2-letter state code
  price: any; // Could be number or string
  ip: string;
  httpsPort: string;
  socks5Port: string;
  userProxy: string;
  passProxy: string;
  uid: string;
}

// USA States list
export const usaStates = [
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

export const proxyDurations = ['All Durations', '1 hour', '1 day', '7 days', '30 days'];

// Filter states based on search term for proxies
export const filterProxyStates = (searchTerm: string) => {
  return usaStates.filter(state =>
    state.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

// Handle proxy state select
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

// Handle proxy state input change
export const handleProxyStateInputChange = (
  value: string,
  setProxyStateSearchTerm: (term: string) => void
) => {
  setProxyStateSearchTerm(value);
};

// Handle proxy state input click
export const handleProxyStateInputClick = (
  setIsProxyStateDropdownOpen: (fn: (prev: boolean) => boolean) => void
) => {
  setIsProxyStateDropdownOpen(prev => !prev);
};

// Handle proxy info click
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

// Handle copy proxy ID
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
      console.error('Failed to copy proxy ID:', err);
    }
  }
};

// Handle copy proxy field
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
    console.error('Failed to copy proxy field:', err);
  }
};

// Filter proxies by state and duration
export const filterProxies = (
  proxies: ProxyRecord[],
  selectedState: string,
  selectedDuration: string
): ProxyRecord[] => {
  console.log('🔍 Filter Proxy Debug:', {
    selectedState,
    selectedDuration,
    proxies: proxies.map(p => ({
      usaState: p.usaState,
      duration: p.duration,
      stateMatch: selectedState === 'All States' || p.usaState === selectedState,
      durationMatch: selectedDuration === 'All Durations' || p.duration === selectedDuration
    }))
  });

  return proxies.filter(proxy => {
    const matchesState = selectedState === 'All States' || proxy.usaState === selectedState;
    const matchesDuration = selectedDuration === 'All Durations' || proxy.duration === selectedDuration;
    return matchesState && matchesDuration;
  });
};

// Format price (show integers without decimals, decimals with one decimal place if needed)
export const formatProxyPrice = (price: number): string => {
  // If it's an integer, return as is (e.g., "4")
  if (price % 1 === 0) {
    return price.toString();
  }
  // If it has decimals, format with minimal decimals (e.g., "7.5" not "7.50")
  return price.toFixed(1).replace(/\.0$/, '');
};

// Get state name from state code
export const getStateNameFromCode = (stateCode: string): string => {
  const state = usaStates.find(s => s.code === stateCode);
  return state ? state.name : stateCode;
};

// Calculate duration between two dates
export const calculateProxyDuration = (createdAt: Date, expiry: Date): string => {
  const diffMs = expiry.getTime() - createdAt.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60)); // Changed to Math.round instead of Math.floor
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Return standardized duration strings that match the filter options
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

// Convert Firestore Proxy document to ProxyRecord
export const convertProxyDocumentToRecord = (doc: ProxyOrderDocument): ProxyRecord => {
  // Convert timestamps to Date
  const createdAt = doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);
  const expiry = doc.expiry?.toDate ? doc.expiry.toDate() : new Date(doc.expiry);

  // Convert price to number
  let priceNum = typeof doc.price === 'number' ? doc.price : parseFloat(doc.price);
  if (isNaN(priceNum)) priceNum = 0;

  // Get state name from code
  const stateName = getStateNameFromCode(doc.state);

  // Calculate duration
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
    password: doc.passProxy
  };
};
