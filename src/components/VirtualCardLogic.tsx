import React from 'react';
import { getAuth } from 'firebase/auth';

export interface VirtualCardRecord {
  id: string;
  purchaseDate: string;
  price: number;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  funds: number;
  email: string;
}

export interface VCCOrderDocument {
  orderId: string;
  createdAt: any;
  price: any;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  uid: string;
  email?: string;
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
  fundsFilter: string
): VirtualCardRecord[] => {
  return cards.filter(card => {
    const matchesSearch = card.cardNumber.replace(/\s/g, '').includes(searchTerm.replace(/\s/g, ''));
    const matchesFunds = fundsFilter === 'All' ||
      (fundsFilter === '$0' && card.funds === 0) ||
      (fundsFilter === '$3' && card.funds === 3);

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
  if (expirationDate.includes('/')) {
    return expirationDate;
  }
  if (expirationDate.length === 4) {
    return `${expirationDate.substring(0, 2)}/${expirationDate.substring(2, 4)}`;
  }
  return expirationDate;
};

export const convertVCCDocumentToRecord = (doc: VCCOrderDocument): VirtualCardRecord => {
  const createdAt = doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);

  let priceNum = typeof doc.price === 'number' ? doc.price : parseFloat(doc.price);
  if (isNaN(priceNum)) priceNum = 0;

  const funds = priceNum === 4 ? 0 : priceNum === 9 ? 3 : 0;

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
    price: priceNum,
    cardNumber: formatCardNumber(doc.cardNumber),
    expirationDate: formatExpirationDate(doc.expirationDate),
    cvv: doc.cvv,
    funds: funds,
    email: doc.email || 'N/A'
  };
};

export const handleCheckCard = async (
  orderId: string,
  setCheckingCardId: React.Dispatch<React.SetStateAction<string | null>>,
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>,
  setShowErrorModal: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const auth = getAuth();
  const currentUser2 = auth.currentUser;

  if (!currentUser2) {
    setErrorMessage('You are not authenticated or your token is invalid');
    setShowErrorModal(true);
    return;
  }

  setCheckingCardId(orderId);

  try {
    const idToken = await currentUser2.getIdToken();

    const response = await fetch('https://getcard-ezeznlhr5a-uc.a.run.app', {
      method: 'POST',
      headers: {
        'authorization': `${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId })
    });

    const data = await response.json();
    console.log("Backend response:", data);

    if (response.ok) {
      setCheckingCardId(null);
    } else {
      let errorMsg = 'An unknown error occurred';

      if (response.status === 400) {
        if (data.error === 'Missing parameters') {
          errorMsg = 'Please try again or contact our customer support';
        } else if (data.error === 'Failed to get card details') {
          errorMsg = 'Please refresh and try again';
        } else if (data.error === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
        } else if (data.error === 'User not found') {
          errorMsg = 'You cannot check this information';
        } else if (data.error === 'Order not found') {
          errorMsg = 'Please contact our customer support';
        }
      } else if (response.status === 500) {
        if (data.error === 'Internal Error') {
          errorMsg = 'Please contact our customer support';
        }
      }

      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      setCheckingCardId(null);
    }
  } catch (error) {
    setErrorMessage('Please contact our customer support');
    setShowErrorModal(true);
    setCheckingCardId(null);
  }
};