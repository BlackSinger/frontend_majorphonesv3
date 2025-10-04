export interface VirtualCardRecord {
  id: string;
  purchaseDate: string;
  price: number;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  funds: number;
}

export interface VCCOrderDocument {
  orderId: string;
  createdAt: any; // Firestore Timestamp
  price: any; // Could be number or string
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  uid: string;
}

// Handle copy card number
export const handleCopyCardNumber = async (
  cardNumber: string,
  cardId: string,
  setCopiedCardNumbers: (fn: (prev: {[key: string]: boolean}) => {[key: string]: boolean}) => void
) => {
  try {
    await navigator.clipboard.writeText(cardNumber.replace(/\s/g, ''));
    setCopiedCardNumbers(prev => ({ ...prev, [cardId]: true }));
    setTimeout(() => {
      setCopiedCardNumbers(prev => ({ ...prev, [cardId]: false }));
    }, 2000);
  } catch (err) {
    console.error('Failed to copy card number:', err);
  }
};

// Filter virtual cards by search term and funds
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

// Format price (show integers without decimals, decimals with one decimal place if needed)
export const formatPrice = (price: number): string => {
  // If it's an integer, return as is (e.g., "4")
  if (price % 1 === 0) {
    return price.toString();
  }
  // If it has decimals, format with minimal decimals (e.g., "7.5" not "7.50")
  return price.toFixed(1).replace(/\.0$/, '');
};

// Format card number with spaces every 4 characters
export const formatCardNumber = (cardNumber: string): string => {
  // Remove all spaces first
  const cleaned = cardNumber.replace(/\s/g, '');
  // Add space every 4 characters
  return cleaned.match(/.{1,4}/g)?.join(' ') || cardNumber;
};

// Convert Firestore VCC document to VirtualCardRecord
export const convertVCCDocumentToRecord = (doc: VCCOrderDocument): VirtualCardRecord => {
  // Convert createdAt to Date
  const createdAt = doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);

  // Convert price to number
  let priceNum = typeof doc.price === 'number' ? doc.price : parseFloat(doc.price);
  if (isNaN(priceNum)) priceNum = 0;

  // Determine funds based on price
  const funds = priceNum === 4.5 ? 0 : priceNum === 7 ? 3 : 0;

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
    expirationDate: doc.expirationDate,
    cvv: doc.cvv,
    funds: funds
  };
};
