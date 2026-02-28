import { getAuth } from 'firebase/auth';

interface HistoryRecord {
  id: string;
  date: string;
  expirationDate: string;
  number: string;
  serviceType: string;
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
  updatedAt?: Date;
  expiry?: Date;
  awakeIn?: Date;
  codeAwakeAt?: Date;
  orderId?: string;
  opt?: number;
}

export const hasTimedOut = (record: HistoryRecord): boolean => {
  if (record.serviceType.toLowerCase() !== 'short' || record.status !== 'Pending' || !record.createdAt) {
    return false;
  }
  const now = new Date().getTime();
  const startTime = record.updatedAt ? record.updatedAt.getTime() : record.createdAt.getTime();
  const fiveMinutes = 5 * 60 * 1000;
  const expiryTime = startTime + fiveMinutes;
  return now >= expiryTime;
};

export const hasTwoFortyFiveMinutesPassed = (createdAt?: Date): boolean => {
  if (!createdAt) return true;
  const now = new Date().getTime();
  const created = createdAt.getTime();
  const twoMinutesFortyFive = 2 * 60 * 1000 + 45 * 1000;
  return (now - created) >= twoMinutesFortyFive;
};

export const getShortDisplayStatus = (record: HistoryRecord): string => {
  if (hasTimedOut(record)) {
    return 'Timed out';
  }
  return record.status;
};

export const getShortStatusColor = (status: string) => {
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
};

export const calculateShortDuration = (createdAt: Date, expiry: Date, opt?: number): string => {
  if (opt === 1 || opt === 10) {
    return 'Reusable for 10 minutes';
  }

  const durationMs = expiry.getTime() - createdAt.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  return `Single use for ${durationMinutes} minutes`;
};

export const getShortAvailableActions = (record: HistoryRecord): string[] => {
  const { status, code, createdAt, opt } = record;
  const hasSms = code && code.trim() !== '';
  const displayStatus = getShortDisplayStatus(record);

  if (displayStatus === 'Timed out') {
    return [];
  }

  if (status === 'Pending') {
    if (!hasSms && hasTwoFortyFiveMinutesPassed(createdAt)) {
      return ['Cancel'];
    }
  }

  if (status === 'Completed' && hasSms && (opt === 1 || opt === 10)) {
    return ['Reuse'];
  }

  return [];
};

export const handleCancelShort = async (
  orderId: string,
  setErrorMessage: (msg: string) => void,
  setShowErrorModal: (show: boolean) => void,
  setCancellingOrderId: (id: string | null) => void
) => {
  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    setErrorMessage('You are not authenticated or your token is invalid');
    setShowErrorModal(true);
    return;
  }

  setCancellingOrderId(orderId);

  try {
    const idToken = await currentUser.getIdToken();

    const response = await fetch('https://cancelshortnumber-ezeznlhr5a-uc.a.run.app', {
      method: 'POST',
      headers: {
        'authorization': `${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      setCancellingOrderId(null);
    } else {
      let errorMsg = 'An unknown error occurred';

      if (data.message === 'Unauthorized') {
        errorMsg = 'You are not authenticated or your token is invalid';
      } else if (data.message === 'Bad Request: Missing orderId' || data.message === 'Order not found') {
        errorMsg = 'Please refresh the page and try again';
      } else if (data.message === 'Error cancelling number') {
        errorMsg = 'This number could not be cancelled, please try again or contact our customer support';
      } else if (data.message === 'Error updating balance') {
        errorMsg = 'Please refresh the page and try again';
      } else if (data.message === 'Internal Server Error') {
        errorMsg = 'Please contact our customer support';
      }

      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      setCancellingOrderId(null);
    }
  } catch (error) {
    setErrorMessage('Please contact our customer support');
    setShowErrorModal(true);
    setCancellingOrderId(null);
  }
};

export const handleReuseShort = async (
  orderId: string,
  setErrorMessage: (msg: string) => void,
  setShowErrorModal: (show: boolean) => void,
  setReusingOrderId: (id: string | null) => void
) => {
  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    setErrorMessage('You are not authenticated or your token is invalid');
    setShowErrorModal(true);
    return;
  }

  setReusingOrderId(orderId);

  try {
    const idToken = await currentUser.getIdToken();

    const response = await fetch('https://reuseusa-ezeznlhr5a-uc.a.run.app', {
      method: 'POST',
      headers: {
        'authorization': `${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId })
    });

    const data = await response.json();
    console.log("Reuse response data:", data);

    if (response.ok && data.success) {
      setReusingOrderId(null);
    } else {
      let errorMsg = 'Please contact our customer support';

      if (data.message === 'Missing parameters') {
        errorMsg = 'Please contact our customer support';
      } else if (data.message === "Number can't be reused") {
        errorMsg = 'This number cannot be reused';
      } else if (data.message === 'Order not found') {
        errorMsg = 'Please contact our customer support';
      } else if (data.message === 'Internal Server Error') {
        errorMsg = 'Please contact our customer support';
      }

      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      setReusingOrderId(null);
    }
  } catch (error) {
    setErrorMessage('Please contact our customer support');
    setShowErrorModal(true);
    setReusingOrderId(null);
  }
};
