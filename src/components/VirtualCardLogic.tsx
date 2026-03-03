import React from 'react';
import { getAuth } from 'firebase/auth';

export interface VirtualCardRecord {
  id: string;
  purchaseDate: string;
  price: number;
  totalPrice?: number;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  initialFunds: number;
  balance: number;
  email: string;
  cardHolderName: string;
  status: string;
}

export interface VCCOrderDocument {
  orderId: string;
  createdAt: any;
  price: any;
  totalPrice?: any;
  balance?: any;
  initialFunds?: any;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  uid: string;
  email?: string;
  cardHolderName?: string;
  status?: string;
}

export const handleCopyCardNumber = async (
  cardNumber: string,
  cardId: string,
  setCopiedCardNumbers: (fn: (prev: { [key: string]: boolean }) => { [key: string]: boolean }) => void
) => {
  try {
    await navigator.clipboard.writeText(cardNumber.replace(/\s/g, ''));
    setCopiedCardNumbers(prev => ({ ...prev, [cardId]: true }));
    setTimeout(() => {
      setCopiedCardNumbers(prev => ({ ...prev, [cardId]: false }));
    }, 2000);
  } catch (err) {
  }
};

export const filterVirtualCards = (
  cards: VirtualCardRecord[],
  searchTerm: string,
  initialFundsFilter: string
): VirtualCardRecord[] => {
  return cards.filter(card => {
    const matchesSearch = card.cardNumber.replace(/\s/g, '').includes(searchTerm.replace(/\s/g, ''));
    let matchesFunds = true;
    if (initialFundsFilter.trim() !== '') {
      const filterNum = parseFloat(initialFundsFilter);
      if (!isNaN(filterNum)) {
        matchesFunds = card.initialFunds === filterNum;
      }
    }

    return matchesSearch && matchesFunds;
  });
};

export const formatPrice = (price: number): string => {
  if (price % 1 === 0) {
    return price.toString();
  }
  return price.toFixed(1).replace(/\.0$/, '');
};

export const formatCardNumber = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\s/g, '');
  return cleaned.match(/.{1,4}/g)?.join(' ') || cardNumber;
};

export const formatExpirationDate = (expirationDate: string): string => {
  if (!expirationDate || expirationDate === 'N/A') return 'N/A';

  let cleaned = expirationDate.replace(/[\s\/]/g, '');

  if (cleaned.length === 6) {
    return `${cleaned.substring(0, 2)}/${cleaned.substring(4, 6)}`;
  }
  if (cleaned.length === 4) {
    return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
  }

  if (expirationDate.includes('/')) {
    const parts = expirationDate.split('/');
    if (parts.length === 2 && parts[1].length === 4) {
      return `${parts[0]}/${parts[1].substring(2, 4)}`;
    }
  }

  return expirationDate;
};

export const convertVCCDocumentToRecord = (doc: VCCOrderDocument): VirtualCardRecord => {
  let createdAt: Date;
  if (doc.createdAt?.toDate) {
    createdAt = doc.createdAt.toDate();
  } else if (doc.createdAt && typeof doc.createdAt === 'object' && '_seconds' in doc.createdAt) {
    createdAt = new Date(doc.createdAt._seconds * 1000);
  } else {
    createdAt = new Date(doc.createdAt);
  }

  let priceVal = typeof doc.price === 'number' ? doc.price : parseFloat(doc.price);
  if (isNaN(priceVal)) priceVal = 0;

  let totalPriceVal = typeof doc.totalPrice === 'number' ? doc.totalPrice : parseFloat(doc.totalPrice);
  if (isNaN(totalPriceVal)) totalPriceVal = priceVal;

  let initialFundsVal = typeof doc.initialFunds === 'number' ? doc.initialFunds : parseFloat(doc.initialFunds);
  if (isNaN(initialFundsVal)) initialFundsVal = 0;

  let balanceVal = typeof doc.balance === 'number' ? doc.balance : parseFloat(doc.balance);
  if (isNaN(balanceVal)) balanceVal = 0;

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
    price: priceVal,
    totalPrice: totalPriceVal,
    cardNumber: formatCardNumber(doc.cardNumber),
    expirationDate: formatExpirationDate(doc.expirationDate),
    cvv: doc.cvv,
    initialFunds: initialFundsVal,
    balance: balanceVal,
    email: doc.email || 'N/A',
    cardHolderName: doc.cardHolderName || 'N/A',
    status: doc.status || 'Active'
  };
};

export const handleCheckCard = (
  orderId: string,
  status: string,
  setCheckingCardId: React.Dispatch<React.SetStateAction<string | null>>,
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>,
  setShowErrorModal: React.Dispatch<React.SetStateAction<boolean>>,
  navigate: (path: string, options?: { state?: any }) => void
) => {
  // Redirigir inmediatamente a VccConfig pasando el estado por router history state
  navigate(`/vcc-config?orderId=${orderId}`, { state: { status } });
};