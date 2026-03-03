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
    cardHolderName: string;
    status: string;
}

export interface VCCOrderDocument {
    orderId: string;
    createdAt: any;
    price: any;
    totalPrice?: any;
    balance?: any;
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
    fundsFilter: string
): VirtualCardRecord[] => {
    return cards.filter(card => {
        const matchesSearch = card.cardNumber.replace(/\s/g, '').includes(searchTerm.replace(/\s/g, ''));
        let matchesFunds = true;
        if (fundsFilter.trim() !== '') {
            const filterNum = parseFloat(fundsFilter);
            if (!isNaN(filterNum)) {
                matchesFunds = card.funds === filterNum;
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

    let totalPrice = typeof doc.totalPrice === 'number' ? doc.totalPrice : parseFloat(doc.totalPrice);
    if (isNaN(totalPrice)) {
        totalPrice = typeof doc.price === 'number' ? doc.price : parseFloat(doc.price);
        if (isNaN(totalPrice)) totalPrice = 0;
    }

    let balance = typeof doc.balance === 'number' ? doc.balance : parseFloat(doc.balance);
    if (isNaN(balance)) balance = 0;

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
        price: totalPrice,
        cardNumber: formatCardNumber(doc.cardNumber),
        expirationDate: formatExpirationDate(doc.expirationDate),
        cvv: doc.cvv,
        funds: balance,
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