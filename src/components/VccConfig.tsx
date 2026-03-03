import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const VccConfig: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderIdFromUrl = searchParams.get('orderId');

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [currentVirtualCardPage, setCurrentVirtualCardPage] = useState(1);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [isInfoIdCopied, setIsInfoIdCopied] = useState(false);

    // Load Funds View State
    const [isLoadFundsView, setIsLoadFundsView] = useState(false);
    const [amount, setAmount] = useState(0.5);
    const [isLoadingFunds, setIsLoadingFunds] = useState(false);
    const [isLoadingFundsDisabled, setIsLoadingFundsDisabled] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Transactions list
    const [vccTransactions, setVccTransactions] = useState<any[]>([]);

    //Esto maneja el estado de congelacion de la tarjeta, inicializado desde Firestore en el useEffect
    const [vccFrozen, setVccFrozen] = useState(false);
    const [isFreezingCard, setIsFreezingCard] = useState(false);
    const [areCardActionsDisabled, setAreCardActionsDisabled] = useState(false);

    // Cloud function loading states
    const [isLoadingVccData, setIsLoadingVccData] = useState(!!orderIdFromUrl);
    const [vccDataError, setVccDataError] = useState(false);
    const [vccCardInfo, setVccCardInfo] = useState<any>(null);

    // Fetch card data and transactions when orderId is in URL
    useEffect(() => {
        if (!orderIdFromUrl) return;

        const fetchVccData = async () => {
            const currentUser = getAuth().currentUser;
            if (!currentUser) {
                setErrorMessage('You are not authenticated or your token is invalid');
                setShowErrorModal(true);
                setIsLoadingVccData(false);
                setVccDataError(true);
                return;
            }

            try {
                const idToken = await currentUser.getIdToken();

                console.log('Enviando body a getcard y gettransactionscard:', { orderId: orderIdFromUrl });

                const headers = {
                    'authorization': `${idToken}`,
                    'Content-Type': 'application/json'
                };
                const body = JSON.stringify({ orderId: orderIdFromUrl });

                const docFetchPromise = getDoc(doc(db, 'vccOrders', orderIdFromUrl)).then(docSnap => {
                    if (docSnap.exists()) {
                        setVccFrozen(docSnap.data().status === 'Frozen');
                    }
                }).catch(err => console.log('Error fetching doc status:', err));

                const [cardResult, transactionsResult] = await Promise.allSettled([
                    fetch('https://getcard-ezeznlhr5a-uc.a.run.app', { method: 'POST', headers, body }),
                    fetch('https://gettransactionscard-ezeznlhr5a-uc.a.run.app', { method: 'POST', headers, body }),
                    docFetchPromise
                ]);

                let cardData: any = null;
                let cardOk = false;
                let cardStatus = 0;

                if (cardResult.status === 'fulfilled') {
                    cardStatus = cardResult.value.status;
                    cardOk = cardResult.value.ok;
                    cardData = await cardResult.value.json();
                    console.log('getcard response:', cardData);
                } else {
                    console.log('getcard fetch error:', cardResult.reason);
                }

                let transactionsData: any = null;
                let transactionsOk = false;
                let transactionsStatus = 0;

                if (transactionsResult.status === 'fulfilled') {
                    transactionsStatus = transactionsResult.value.status;
                    transactionsOk = transactionsResult.value.ok;
                    transactionsData = await transactionsResult.value.json();
                    console.log('gettransactionscard response:', transactionsData);
                } else {
                    console.log('gettransactionscard fetch error:', transactionsResult.reason);
                }

                if (cardOk && transactionsOk) {
                    setVccCardInfo(cardData);
                    setVccTransactions(transactionsData?.data || []);
                    setIsLoadingVccData(false);
                    setVccDataError(false);
                } else {
                    let errorMsg = 'An unknown error occurred';
                    const failedData = !cardOk ? cardData : transactionsData;
                    const failedStatus = !cardOk ? cardStatus : transactionsStatus;

                    if (failedStatus === 400) {
                        if (failedData?.error === 'Missing parameters') {
                            errorMsg = 'Please try again or contact our customer support';
                        } else if (failedData?.error === 'Failed to get card details' || failedData?.error === 'Failed to get transactions') {
                            errorMsg = 'Please refresh and try again';
                        }
                    } else if (failedStatus === 404) {
                        if (failedData?.error === 'User not found') {
                            errorMsg = 'You cannot check this information';
                        } else if (failedData?.error === 'Order not found') {
                            errorMsg = 'This VCC does not exist';
                        }
                    } else if (failedStatus === 401) {
                        if (failedData?.error === 'Unauthorized') {
                            errorMsg = 'You are not authenticated or your token is invalid';
                        }
                    } else if (failedStatus === 500) {
                        if (failedData?.error === 'Internal Error') {
                            errorMsg = 'Please contact our customer support';
                        }
                    }

                    setErrorMessage(errorMsg);
                    setShowErrorModal(true);
                    setIsLoadingVccData(false);
                    setVccDataError(true);
                }
            } catch (error) {
                console.log('fetchVccData catch error:', error);
                setErrorMessage('Please contact our customer support');
                setShowErrorModal(true);
                setIsLoadingVccData(false);
                setVccDataError(true);
            }
        };

        fetchVccData();
    }, [orderIdFromUrl]);

    const itemsPerPage = 10;
    const totalVirtualCardPages = Math.ceil(vccTransactions.length / itemsPerPage);
    const virtualCardStartIndex = (currentVirtualCardPage - 1) * itemsPerPage;
    const virtualCardEndIndex = virtualCardStartIndex + itemsPerPage;
    const paginatedVirtualCardData = vccTransactions.slice(virtualCardStartIndex, virtualCardEndIndex);

    const handleInfoClick = (record: any) => {
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
            } catch (err) { }
        }
    };

    const handleErrorModalClose = () => {
        setShowErrorModal(false);
    };

    //MODIFICAR AL DEPOSITAR EN QUACKR
    const handleLoadFunds = async () => {
        const currentUser = getAuth().currentUser;

        if (!currentUser) {
            setErrorMessage('You are not authenticated or your token is invalid');
            setShowErrorModal(true);
            return;
        }

        setIsLoadingFunds(true);
        setIsLoadingFundsDisabled(true);

        try {
            const idToken = await currentUser.getIdToken();

            const response = await fetch('https://loadfundscard-ezeznlhr5a-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'authorization': `${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId: orderIdFromUrl,
                    amount: amount
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Load funds success:', data);
                setIsLoadingFunds(false);
                setIsLoadingFundsDisabled(false);
                setSuccessMessage('You have correctly added funds to your VCC');
                setShowSuccessModal(true);
            } else {
                let errorMsg = 'An unknown error occurred';
                let shouldKeepDisabled = false;

                if (response.status === 400) {
                    if (data.error === 'Missing parameters') {
                        errorMsg = 'Please try again or contact customer support';
                    } else if (data.error === 'Funds loaded but failed to get updated card details') {
                        errorMsg = 'The payment was successful but the card details could not be updated, contact customer support';
                    } else if (data.error === 'Insufficient balance') {
                        errorMsg = "You don't have enough balance to make the purchase";
                    } else if (data.error === 'Failed to load funds') {
                        errorMsg = 'The payment could not be completed, please try again or contact our customer support';
                    } else if (data.error === 'Invalid amount') {
                        errorMsg = 'The amount is invalid, please try again';
                        shouldKeepDisabled = true;
                    }
                } else if (response.status === 401) {
                    errorMsg = 'You are not authenticated or your token is invalid';
                    shouldKeepDisabled = true;
                } else if (response.status === 404) {
                    if (data.error === 'User not found' || data.error === 'Order not found') {
                        errorMsg = 'You cannot add funds to this VCC';
                        shouldKeepDisabled = true;
                    }
                } else if (response.status === 500) {
                    errorMsg = 'Please contact our customer support';
                }

                console.log('Load funds error:', response.status, data);
                setErrorMessage(errorMsg);
                setShowErrorModal(true);
                setIsLoadingFunds(false);

                if (!shouldKeepDisabled) {
                    setIsLoadingFundsDisabled(false);
                }
            }
        } catch (error) {
            console.log('Load funds catch error:', error);
            setErrorMessage('Please contact our customer support');
            setShowErrorModal(true);
            setIsLoadingFunds(false);
            setIsLoadingFundsDisabled(false);
        }
    };

    const handleFreezeCard = async () => {
        const currentUser = getAuth().currentUser;

        if (!currentUser) {
            setErrorMessage('You are not authenticated or your token is invalid');
            setShowErrorModal(true);
            return;
        }

        setIsFreezingCard(true);

        try {
            const idToken = await currentUser.getIdToken();

            const response = await fetch('https://freezecard-ezeznlhr5a-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'authorization': `${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId: orderIdFromUrl,
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Freeze card success:', data);
                setIsFreezingCard(false);
                setVccFrozen(true);
                setSuccessMessage('This VCC has been frozen successfully');
                setShowSuccessModal(true);
            } else {
                let errorMsg = 'An unknown error occurred';
                let shouldDisableAll = false;
                let cardAlreadyFrozen = false;

                if (response.status === 400) {
                    if (data.error === 'Missing parameters') {
                        errorMsg = 'Please contact our customer support';
                    } else if (data.error === 'Card is already frozen') {
                        errorMsg = 'This VCC is already frozen';
                        cardAlreadyFrozen = true;
                    } else if (data.error === 'Failed to freeze card') {
                        errorMsg = 'Please try again or contact our customer support';
                    } else if (data.error === 'Internal Error') {
                        errorMsg = 'Please contact our customer support';
                    }
                } else if (response.status === 401) {
                    errorMsg = 'You are not authenticated or your token is invalid';
                    shouldDisableAll = true;
                } else if (response.status === 404) {
                    if (data.error === 'User not found' || data.error === 'Order not found') {
                        errorMsg = 'You cannot freeze this VCC';
                        shouldDisableAll = true;
                    }
                }

                console.log('Freeze card error:', response.status, data);
                setErrorMessage(errorMsg);
                setShowErrorModal(true);
                setIsFreezingCard(false);

                if (shouldDisableAll) {
                    setAreCardActionsDisabled(true);
                }

                if (cardAlreadyFrozen) {
                    setVccFrozen(true);
                }
            }
        } catch (error) {
            console.log('Freeze card catch error:', error);
            setErrorMessage('Please contact our customer support');
            setShowErrorModal(true);
            setIsFreezingCard(false);
        }
    };

    const handleUnfreezeCard = async () => {
        const currentUser = getAuth().currentUser;

        if (!currentUser) {
            setErrorMessage('You are not authenticated or your token is invalid');
            setShowErrorModal(true);
            return;
        }

        setIsFreezingCard(true);

        try {
            const idToken = await currentUser.getIdToken();

            const response = await fetch('https://unfreezecard-ezeznlhr5a-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'authorization': `${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId: orderIdFromUrl,
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Unfreeze card success:', data);
                setIsFreezingCard(false);
                setVccFrozen(false);
                setSuccessMessage('This VCC has been unfrozen successfully');
                setShowSuccessModal(true);
            } else {
                let errorMsg = 'An unknown error occurred';
                let shouldDisableAll = false;
                let cardNotFrozen = false;

                if (response.status === 400) {
                    if (data.error === 'Missing parameters') {
                        errorMsg = 'Please contact our customer support';
                    } else if (data.error === 'Card is not frozen') {
                        errorMsg = 'This VCC is not frozen';
                        cardNotFrozen = true;
                    } else if (data.error === 'Failed to unfreeze card') {
                        errorMsg = 'Please try again or contact our customer support';
                    } else if (data.error === 'Internal Error') {
                        errorMsg = 'Please contact our customer support';
                    }
                } else if (response.status === 401) {
                    errorMsg = 'You are not authenticated or your token is invalid';
                    shouldDisableAll = true;
                } else if (response.status === 404) {
                    if (data.error === 'User not found' || data.error === 'Order not found') {
                        errorMsg = 'You cannot unfreeze this VCC';
                        shouldDisableAll = true;
                    }
                }

                console.log('Unfreeze card error:', response.status, data);
                setErrorMessage(errorMsg);
                setShowErrorModal(true);
                setIsFreezingCard(false);

                if (shouldDisableAll) {
                    setAreCardActionsDisabled(true);
                }

                if (cardNotFrozen) {
                    setVccFrozen(false);
                }
            }
        } catch (error) {
            console.log('Unfreeze card catch error:', error);
            setErrorMessage('Please contact our customer support');
            setShowErrorModal(true);
            setIsFreezingCard(false);
        }
    };

    const handleAmountChange = (value: number) => {
        let clamped = Math.min(20, Math.max(0.5, value));
        clamped = Math.round(clamped * 2) / 2;
        setAmount(clamped);
    };

    const calculateFee = (amount: number): number => {
        let fee = 0;
        if (amount <= 3) {
            fee = 1;
        } else if (amount > 3 && amount <= 5) {
            fee = 2;
        } else if (amount > 5 && amount <= 10) {
            fee = 3;
        } else if (amount > 10) {
            fee = 4;
        }
        return fee;
    };

    const finalPrice = amount + calculateFee(amount);

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center space-x-4">
                            <div>
                                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                                    VCC Management
                                </h1>
                                <p className="text-slate-300 text-md text-left">Check and configure your card</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Information Section */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 mb-6">
                    <div className="flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-blue-300 text-sm font-semibold mb-3">Important information about this feature:</p>
                            <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                                <li>• Check the entire details of your virtual debit card</li>
                                <li>• You can add more funds to your card, which cannot be refunded</li>
                                <li>• You can freeze your card to prevent any future transactions and unfreeze it whenever you want</li>
                                <li>• You can check all the transactions made with your card</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
                    <div className="p-6">
                        <div className="relative z-10">
                            {/* Back Button */}
                            <div className="mb-5">
                                {isLoadFundsView ? (
                                    <button
                                        onClick={() => setIsLoadFundsView(false)}
                                        className="group flex items-center space-x-3 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
                                    >
                                        <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                                        </svg>
                                        <span className="text-slate-400 group-hover:text-white font-medium transition-colors duration-300">Back to info</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/history?tab=virtualCards')}
                                        className="group flex items-center space-x-3 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
                                    >
                                        <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                                        </svg>
                                        <span className="text-slate-400 group-hover:text-white font-medium transition-colors duration-300">Back to table</span>
                                    </button>
                                )}
                            </div>

                            {/* State Handling (Loading, Error, Results) */}
                            {!orderIdFromUrl ? (
                                <div className="text-center py-16">
                                    <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-5">
                                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <h1 className="text-xl font-bold text-slate-300 mb-3">No VCC has been selected</h1>
                                    <p className="text-slate-400 text-lg">Please go back to the History section</p>
                                </div>
                            ) : isLoadingVccData ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="text-slate-400 mt-4">Loading info...</p>
                                </div>
                            ) : vccDataError ? (
                                /* Error State */
                                <div className="text-center py-16">
                                    <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-5">
                                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <h1 className="text-xl font-bold text-slate-300 mb-3">Error getting the VCC data</h1>
                                    <p className="text-slate-400 text-lg">Please contact our customer support</p>
                                </div>
                            ) : (
                                <>
                                    {/* Results Header */}
                                    {!isLoadFundsView && (
                                        <div className="text-left mb-7">
                                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">Card information</h1>
                                            <p className="text-slate-300 text-md">Full details about your card</p>
                                        </div>
                                    )}
                                    {/* Results Grid */}
                                    {!isLoadFundsView ? (
                                        <div className="grid gap-6 grid-cols-1">
                                            <div className="flex flex-col space-y-6">
                                                {/* Top Section: Card and Details */}
                                                <div className="flex flex-col md:flex-row md:space-x-6">
                                                    {/* Virtual Card Display - Left Side on Desktop */}
                                                    <div className="flex-1 md:max-w-lg">
                                                        <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.3)] shadow-blue-500/25 border border-slate-600/50 border-blue-500/50 transition-all duration-300">
                                                            {/* Card Background Pattern */}
                                                            <div className="absolute inset-0 opacity-5">
                                                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
                                                                <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5"></div>
                                                                <div className="absolute bottom-8 left-8 w-8 h-8 rounded-full bg-white/5"></div>
                                                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/3"></div>
                                                            </div>

                                                            <div className="relative z-10">
                                                                {/* Card Header */}
                                                                <div className="flex justify-center md:justify-between items-center mb-6">
                                                                    <div className="text-center md:text-left">
                                                                        <p className="text-md opacity-80 font-medium">Virtual Debit Card</p>
                                                                    </div>
                                                                    <img
                                                                        src={MajorPhonesFavIc}
                                                                        alt="MajorPhones"
                                                                        className="w-12 h-10 object-contain hidden md:block"
                                                                    />
                                                                </div>

                                                                {/* Card Number */}
                                                                <div className="mb-6">
                                                                    <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Card Number</p>
                                                                    <p className="text-md font-mono font-light">{vccCardInfo?.data?.cardNumber ? vccCardInfo.data.cardNumber.replace(/(.{4})/g, '$1 ').trim() : '**** **** **** ****'}</p>
                                                                </div>

                                                                {/* Card Details Row */}
                                                                <div className="grid grid-cols-2 gap-6">
                                                                    <div>
                                                                        <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Expires</p>
                                                                        <p className="text-md font-mono font-light">{vccCardInfo?.data?.expirationDate ? vccCardInfo.data.expirationDate.split('/').map((p: string, i: number) => i === 1 ? p.slice(-2) : p).join('/') : '**/**'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">CVV</p>
                                                                        <p className="text-md font-mono font-light">{vccCardInfo?.data?.cvv || '***'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Details - Right Side on Desktop */}
                                                    <div className="flex flex-col justify-center mt-6 md:mt-0 md:flex-1">
                                                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(59,130,246,0.3)] shadow-blue-500/25 border border-slate-600/50 border-blue-500/50 transition-all duration-300">
                                                            <h3 className="text-md font-semibold text-white mb-4 flex items-center">
                                                                <svg className="w-5 h-5 mr-2 text-blue-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Card Details
                                                            </h3>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between items-center py-2 border-b border-slate-600/30 gap-4">
                                                                    <span className="text-left text-slate-300 font-medium whitespace-nowrap shrink-0">Card Holder:</span>
                                                                    <span className="text-emerald-400 font-bold text-md truncate max-w-[200px] text-right">
                                                                        {vccCardInfo?.data?.cardHolderName || 'Loading...'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                                                                    <span className="text-left text-slate-300 font-medium">Current Funds:</span>
                                                                    <span className="text-right text-emerald-400 font-bold text-md">
                                                                        {vccCardInfo?.data?.balance !== undefined ? `$${vccCardInfo.data.balance}` : '$0.00'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col md:flex-row gap-3 pt-2">
                                                                    <button
                                                                        onClick={vccFrozen ? handleUnfreezeCard : handleFreezeCard}
                                                                        disabled={isFreezingCard || areCardActionsDisabled}
                                                                        className={`flex-1 px-4 py-2 text-white font-bold rounded-xl transition-colors duration-300 shadow-lg text-sm ${areCardActionsDisabled ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 hover:scale-[1.02]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                                                    >
                                                                        <div className="flex items-center justify-center h-5">
                                                                            {isFreezingCard ? (
                                                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                            ) : (
                                                                                <span>{vccFrozen ? 'Unfreeze' : 'Freeze'}</span>
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setIsLoadFundsView(true)}
                                                                        disabled={vccFrozen || isFreezingCard || areCardActionsDisabled}
                                                                        className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition-all duration-300 shadow-lg text-sm bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                                                    >
                                                                        Load Funds
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-left mb-7">
                                                    <h1 className="text-xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">Transactions</h1>
                                                </div>

                                                {/* Virtual Cards Table */}
                                                <div className="overflow-x-auto overflow-y-visible mt-6">
                                                    {vccTransactions.length > 0 ? (
                                                        <>
                                                            <table className="w-full">
                                                                <thead>
                                                                    <tr className="border-b border-slate-700/50">
                                                                        <th className="text-center py-4 px-4 text-slate-300 font-semibold">ID</th>
                                                                        <th className="text-center py-4 px-4 text-slate-300 font-semibold">Date</th>
                                                                        <th className="text-center py-4 px-4 text-slate-300 font-semibold">Amount</th>
                                                                        <th className="text-center py-4 px-4 text-slate-300 font-semibold">Merchant</th>
                                                                        <th className="text-center py-4 px-4 text-slate-300 font-semibold">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedVirtualCardData.map((record, index) => (
                                                                        <tr
                                                                            key={record.id}
                                                                            className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200 ${index % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'
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
                                                                            <td className="py-4 px-6 text-white text-center">
                                                                                {new Date(record.timestamp).toLocaleString('en-US', {
                                                                                    month: '2-digit', day: '2-digit', year: 'numeric',
                                                                                    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
                                                                                })}
                                                                            </td>
                                                                            <td className="py-4 px-6 text-center">
                                                                                <span className="text-emerald-400 font-semibold">${Number(record.amount).toFixed(2)}</span>
                                                                            </td>
                                                                            <td className="py-4 px-6 text-white text-center">
                                                                                {record.merchantName}
                                                                            </td>
                                                                            <td className="py-4 px-6 text-center">
                                                                                <span style={{ width: '100px' }} className={`inline-block text-center px-3 py-1 rounded-lg text-sm font-semibold border ${record.status === 'completed'
                                                                                    ? 'text-green-400 border-green-500/30 bg-green-500/20'
                                                                                    : record.status === 'pending'
                                                                                        ? 'text-amber-400 border-amber-500/30 bg-amber-500/20'
                                                                                        : 'text-red-400 border-red-500/30 bg-red-500/20'
                                                                                    }`}>
                                                                                    {record.status === 'completed' ? 'Completed' : record.status === 'pending' ? 'Pending' : 'Declined'}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>

                                                            {/* Virtual Cards Pagination */}
                                                            {totalVirtualCardPages > 1 && (
                                                                <div className="mt-6">
                                                                    <div className="text-sm text-slate-400 text-center mb-4 md:hidden">
                                                                        Showing {virtualCardStartIndex + 1} to {Math.min(virtualCardEndIndex, vccTransactions.length)} of {vccTransactions.length} results
                                                                    </div>

                                                                    <div className="flex items-center justify-between">
                                                                        <div className="hidden md:block text-sm text-slate-400">
                                                                            Showing {virtualCardStartIndex + 1} to {Math.min(virtualCardEndIndex, vccTransactions.length)} of {vccTransactions.length} results
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
                                                                                {[currentVirtualCardPage, currentVirtualCardPage + 1].filter(page => page <= totalVirtualCardPages).map((page) => (
                                                                                    <button
                                                                                        key={page}
                                                                                        onClick={() => setCurrentVirtualCardPage(page)}
                                                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${currentVirtualCardPage === page
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
                                                        /* Empty State */
                                                        <div className="text-center py-16">
                                                            <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-5">
                                                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                                </svg>
                                                            </div>
                                                            <h1 className="text-xl font-bold text-slate-300 mb-3">No Transactions Found</h1>
                                                            <p className="text-slate-400 text-lg">You have not used this VCC yet</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Load Funds View */
                                        <div className="space-y-9 mt-2">
                                            {/* Section Header */}
                                            <div className="text-left mb-9">
                                                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-2">
                                                    Load Funds
                                                </h1>
                                                <p className="text-slate-300 text-md">Select the amount you want to add to your VCC</p>
                                            </div>

                                            <div className="space-y-6">
                                                {/* Slider */}
                                                <div className="w-full max-w-2xl mx-auto">
                                                    <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider text-center mb-3">
                                                        Pre-loaded funds
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0.5"
                                                        max="20"
                                                        step="0.5"
                                                        value={amount}
                                                        onChange={(e) => handleAmountChange(parseFloat(e.target.value))}
                                                        disabled={isLoadingFunds || isLoadingFundsDisabled}
                                                        className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        style={{
                                                            background: `linear-gradient(to right, #10b981 0%, #10b981 ${((amount - 0.5) / 19.5) * 100}%, #334155 ${((amount - 0.5) / 19.5) * 100}%, #334155 100%)`,
                                                            accentColor: '#10b981',
                                                        }}
                                                    />
                                                    <div className="flex justify-between text-sm text-slate-400 mt-1">
                                                        <span>$0.5</span>
                                                        <span className="text-emerald-400 font-bold text-base">${amount.toFixed(2)}</span>
                                                        <span>$20</span>
                                                    </div>
                                                </div>

                                                {/* Bottom Row: Price (left) + Purchase Button (right) */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto items-center">
                                                    {/* Price */}
                                                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                                                        <span className="text-md font-semibold text-slate-400">Final price:</span>
                                                        <span className="text-lg font-semibold text-green-400">${finalPrice.toFixed(2)}</span>
                                                    </div>
                                                    {/* Purchase Button */}
                                                    <div className="flex justify-center sm:justify-end">
                                                        <button
                                                            onClick={handleLoadFunds}
                                                            disabled={isLoadingFunds || isLoadingFundsDisabled}
                                                            className="group w-[200px] py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-[1.02] border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                                        >
                                                            <div className="relative z-10 flex items-center justify-center h-6">
                                                                {isLoadingFunds ? (
                                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <span className="group-hover:tracking-wide transition-all duration-300">
                                                                        Load
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
                        <div className="text-center">
                            <div className="mb-4">
                                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Error</h3>
                            <p className="text-blue-200 mb-4">{errorMessage}</p>
                            <button
                                onClick={handleErrorModalClose}
                                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
                        <div className="text-center">
                            <div className="mb-4">
                                <div className="w-12 h-12 mx-auto bg-emerald-500 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Success</h3>
                            <p className="text-blue-200 mb-4">{successMessage}</p>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    if (isLoadFundsView) {
                                        window.location.reload();
                                    }
                                }}
                                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                            >
                                Ok
                            </button>
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
                            <div className="space-y-4 text-left mt-6">
                                <div>
                                    <span className="text-slate-300">Transaction ID: </span>
                                    <span className="text-emerald-400 break-all">{selectedRecord.id}
                                        <button
                                            onClick={handleCopyInfoId}
                                            className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                                            title={isInfoIdCopied ? "Copied!" : "Copy Transaction ID"}
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
                                    <span className="text-slate-300">Currency: </span>
                                    <span className="text-emerald-400 break-all">{selectedRecord.currency}</span>
                                </div>
                                <div>
                                    <span className="text-slate-300">Type: </span>
                                    <span className="text-emerald-400 break-all">{selectedRecord.type}</span>
                                </div>
                                {selectedRecord.status === 'failed' && selectedRecord.declineReason && (
                                    <div>
                                        <span className="text-slate-300">Reason for failure: </span>
                                        <span className="text-red-400 break-all">{selectedRecord.declineReason}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={() => setShowInfoModal(false)}
                                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-6 rounded-xl transition-all duration-300 shadow-lg"
                                >
                                    Ok
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
};

export default VccConfig;