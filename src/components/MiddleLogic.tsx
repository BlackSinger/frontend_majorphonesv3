import { getAuth } from 'firebase/auth';

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
  updatedAt?: Date;
  expiry?: Date;
  awakeIn?: Date;
  codeAwakeAt?: Date;
  orderId?: string;
}

const loadActivationTimestamps = (): { [orderId: string]: number } => {
  try {
    const stored = localStorage.getItem('middleActivationTimestamps');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
};

const activationTimestamps: { [orderId: string]: number } = loadActivationTimestamps();

const saveActivationTimestamps = () => {
  try {
    localStorage.setItem('middleActivationTimestamps', JSON.stringify(activationTimestamps));
  } catch (error) {
  }
};

export const hasMiddleTimedOut = (record: HistoryRecord): boolean => {
  const recordId = record.orderId || record.id;

  if (record.serviceType !== 'Middle' || record.status !== 'Active') {
    clearActivationTime(recordId);
    return false;
  }

  const activationTime = activationTimestamps[recordId];
  if (!activationTime) {
    return false;
  }

  const now = new Date().getTime();
  const threeMinutes = 3 * 60 * 1000;
  const expiryTime = activationTime + threeMinutes;
  return now >= expiryTime;
};

export const recordActivationTime = (orderId: string) => {
  const timestamp = new Date().getTime();
  activationTimestamps[orderId] = timestamp;
  saveActivationTimestamps();
};

export const clearActivationTime = (orderId: string) => {
  delete activationTimestamps[orderId];
  saveActivationTimestamps();
};

export const getMiddleCountdownTime = (record: HistoryRecord): string | null => {
  if (record.serviceType !== 'Middle' || record.status !== 'Active') {
    return null;
  }

  const possibleIds = [
    record.orderId,
    record.id,
    record.orderId || record.id
  ].filter(Boolean);

  let activationTime: number | undefined;
  for (const id of possibleIds) {
    if (activationTimestamps[id as string]) {
      activationTime = activationTimestamps[id as string];
      break;
    }
  }

  if (!activationTime) {
    activationTime = new Date().getTime();
    for (const id of possibleIds) {
      activationTimestamps[id as string] = activationTime;
    }
    saveActivationTimestamps();
  }

  const now = new Date().getTime();
  const threeMinutes = 3 * 60 * 1000;
  const elapsed = now - activationTime;
  const remaining = threeMinutes - elapsed;

  if (remaining <= 0) {
    return null;
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const getMiddleDisplayStatus = (record: HistoryRecord): string => {
  if (hasMiddleTimedOut(record)) {
    return 'Inactive';
  }
  return record.status;
};

export const getMiddleStatusColor = (status: string) => {
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
};

export const calculateMiddleDuration = (createdAt: Date, expiry: Date): string => {
  const durationMs = expiry.getTime() - createdAt.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
  return `${durationDays} day${durationDays !== 1 ? 's' : ''}`;
};

export const getMiddleAvailableActions = (record: HistoryRecord): string[] => {
  const { status, code } = record;
  const hasSms = code && code.trim() !== '';
  const displayStatus = getMiddleDisplayStatus(record);

  if (displayStatus === 'Inactive' && status === 'Active') {
    return [];
  }

  if (status === 'Active') {
    if (hasSms) {
      return [];
    } else {
      const recordId = record.orderId || record.id;
      const activationTime = activationTimestamps[recordId];

      if (!activationTime) {
        return [];
      }

      const now = new Date().getTime();
      const oneMinute = 1 * 60 * 1000;
      const timeSinceActivation = now - activationTime;

      if (timeSinceActivation >= oneMinute) {
        return ['Cancel'];
      } else {
        return [];
      }
    }
  } else if (status === 'Inactive') {
    return ['Activate'];
  } else if (status === 'Cancelled' || status === 'Expired') {
    return [];
  }

  return [];
};

export const handleCancelMiddle = async (
  recordId: string,
  orderId: string | undefined,
  setErrorMessage: (msg: string) => void,
  setShowErrorModal: (show: boolean) => void,
  setCancellingOrderId: (id: string | null) => void
) => {
  if (!orderId) {
    setErrorMessage('Invalid order ID');
    setShowErrorModal(true);
    return;
  }

  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    setErrorMessage('You are not authenticated or your token is invalid');
    setShowErrorModal(true);
    return;
  }

  setCancellingOrderId(recordId);

  try {
    const idToken = await currentUser.getIdToken();

    const response = await fetch('https://cancelmiddleusa-ezeznlhr5a-uc.a.run.app', {
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

export const handleActivateMiddle = async (
  recordId: string,
  orderId: string | undefined,
  setErrorMessage: (msg: string) => void,
  setShowErrorModal: (show: boolean) => void,
  setActivatingOrderId: (id: string | null) => void
) => {
  if (!orderId) {
    setErrorMessage('Invalid order ID');
    setShowErrorModal(true);
    return;
  }

  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    setErrorMessage('You are not authenticated or your token is invalid');
    setShowErrorModal(true);
    return;
  }

  setActivatingOrderId(recordId);

  try {
    const idToken = await currentUser.getIdToken();

    const response = await fetch('https://activatemiddleusa-ezeznlhr5a-uc.a.run.app', {
      method: 'POST',
      headers: {
        'authorization': `${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      const timestamp = new Date().getTime();
      activationTimestamps[recordId] = timestamp;
      activationTimestamps[orderId] = timestamp;
      saveActivationTimestamps();
      setActivatingOrderId(null);
    } else {
      let errorMsg = 'An unknown error occurred';

      if (data.message === 'Unauthorized') {
        errorMsg = 'You are not authenticated or your token is invalid';
      } else if (data.message === 'Bad Request: Missing orderId' || data.message === 'Order not found') {
        errorMsg = 'Please refresh the page and try again';
      } else if (data.message === 'Number is not inactive') {
        errorMsg = 'This number is not inactive and cannot be activated';
      } else if (data.message === 'Error activating number') {
        errorMsg = 'This number could not be activated, please try again or contact our customer support';
      } else if (data.message === 'Error updating balance') {
        errorMsg = 'Please refresh the page and try again';
      } else if (data.message === 'Internal Server Error') {
        errorMsg = 'Please contact our customer support';
      }

      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      setActivatingOrderId(null);
    }
  } catch (error) {
    setErrorMessage('Please contact our customer support');
    setShowErrorModal(true);
    setActivatingOrderId(null);
  }
};