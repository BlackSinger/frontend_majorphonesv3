import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';
import { getAuth } from 'firebase/auth';

interface CardOption {
    id: string;
    cardNumber: string;
    expirationDate: string;
    cvv: string;
    cardFunds: number;
    price: number;
    hasBalance: boolean;
}

const VccConfig: React.FC = () => {
    const navigate = useNavigate();
    const [hasBalance, setHasBalance] = useState(false);
    const [searchResults, setSearchResults] = useState<CardOption[]>([
        {
            id: '1',
            cardNumber: '',
            expirationDate: '',
            cvv: '',
            cardFunds: hasBalance ? 3 : 0,
            price: hasBalance ? 9 : 4,
            hasBalance: hasBalance
        }
    ]);

    const [cardSelection, setCardSelection] = useState({
        balance: false
    });

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const tableData = {
        "success": true,
        "data": [
            {
                "id": "123",
                "amount": "10.00",
                "merchant": "Netflix",
                "status": "Approved",
                "date": "2026-02-23T15:00:00.000Z"
            },
            {
                "id": "456",
                "amount": "3.50",
                "merchant": "Disney+",
                "status": "Declined",
                "date": "2026-02-23T15:00:00.000Z"
            }
        ],
        "count": 2
    };

    const [currentVirtualCardPage, setCurrentVirtualCardPage] = useState(1);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [isInfoIdCopied, setIsInfoIdCopied] = useState(false);

    // Load Funds View State
    const [isLoadFundsView, setIsLoadFundsView] = useState(false);
    const [amount, setAmount] = useState(0);
    const [isLoadingFunds, setIsLoadingFunds] = useState(false);
    const [isLoadingFundsDisabled, setIsLoadingFundsDisabled] = useState(false);

    const itemsPerPage = 10;
    const totalVirtualCardPages = Math.ceil(tableData.count / itemsPerPage);
    const virtualCardStartIndex = (currentVirtualCardPage - 1) * itemsPerPage;
    const virtualCardEndIndex = virtualCardStartIndex + itemsPerPage;
    const paginatedVirtualCardData = tableData.data.slice(virtualCardStartIndex, virtualCardEndIndex);

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


    //MODIFICAR

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
                    //orderId: orderId,
                    amount: finalPrice
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Return to info view on success
                setIsLoadFundsView(false);
            } else {
                let errorMsg = 'An unknown error occurred';
                let shouldKeepDisabled = false;

                if (response.status === 400) {
                    if (data.error === 'Missing parameters') {
                        errorMsg = 'Please try again or contact customer support';
                    } else if (data.error === 'Amount must be less than or equal to 20') {
                        errorMsg = 'Pre-loaded funds must be less than or equal to $20';
                    } else if (data.error === 'Insufficient balance') {
                        errorMsg = "You don't have enough balance to make the purchase";
                    } else if (data.error === 'Failed to buy card') {
                        errorMsg = 'We ran out of virtual cards, please try again later';
                    } else if (data.error === 'You cannot buy a card, because you have used Amazon Pay') {
                        errorMsg = 'Users that deposit with Amazon Pay cannot purchase virtual cards';
                        shouldKeepDisabled = true;
                    }
                } else if (response.status === 401) {
                    errorMsg = 'You are not authenticated or your token is invalid';
                    shouldKeepDisabled = true;
                } else if (response.status === 404) {
                    errorMsg = 'You cannot make the purchase';
                    shouldKeepDisabled = true;
                } else if (response.status === 500) {
                    errorMsg = 'Please contact our customer support';
                }

                setErrorMessage(errorMsg);
                setShowErrorModal(true);
                setIsLoadingFunds(false);

                if (!shouldKeepDisabled) {
                    setIsLoadingFundsDisabled(false);
                }
            }
        } catch (error) {
            setErrorMessage('Please contact our customer support');
            setShowErrorModal(true);
            setIsLoadingFunds(false);
            setIsLoadingFundsDisabled(false);
        }
    };

    const handleAmountChange = (value: number) => {
        let clamped = Math.min(20, Math.max(0, value));
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
                                    <button className="group flex items-center space-x-3 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm">
                                        <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                                        </svg>
                                        <span className="text-slate-400 group-hover:text-white font-medium transition-colors duration-300">Back to table</span>
                                    </button>
                                )}
                            </div>
                            {/* Results Header */}
                            {!isLoadFundsView && (
                                <div className="text-left mb-7">
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">Card information</h1>
                                    <p className="text-slate-300 text-md">Full details about your card</p>
                                </div>
                            )}
                            {/* Results Grid */}
                            {!isLoadFundsView ? (
                                searchResults.length > 0 ? (
                                    <div className="grid gap-6 grid-cols-1">
                                        {searchResults.map((option) => (
                                            <div key={option.id} className="flex flex-col space-y-6">
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
                                                                    <p className="text-md font-mono font-light">1234 5678 9012 3456</p>
                                                                </div>

                                                                {/* Card Details Row */}
                                                                <div className="grid grid-cols-2 gap-6">
                                                                    <div>
                                                                        <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Expires</p>
                                                                        <p className="text-md font-mono font-light">00/00</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">CVV</p>
                                                                        <p className="text-md font-mono font-light">123</p>
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
                                                                        Mary
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                                                                    <span className="text-left text-slate-300 font-medium">Current Balance:</span>
                                                                    <span className="text-right text-emerald-400 font-bold text-md">
                                                                        $20
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col md:flex-row gap-3 pt-2">
                                                                    <button
                                                                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors duration-300 shadow-lg hover:scale-[1.02] text-sm"
                                                                    >
                                                                        Freeze
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setIsLoadFundsView(true)}
                                                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-xl transition-colors duration-300 shadow-lg hover:scale-[1.02] text-sm"
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
                                                    {tableData.data.length > 0 ? (
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
                                                                                {new Date(record.date).toLocaleString('en-US', {
                                                                                    month: '2-digit', day: '2-digit', year: 'numeric',
                                                                                    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
                                                                                })}
                                                                            </td>
                                                                            <td className="py-4 px-6 text-center">
                                                                                <span className="text-emerald-400 font-semibold">${Number(record.amount).toFixed(2)}</span>
                                                                            </td>
                                                                            <td className="py-4 px-6 text-white text-center">
                                                                                {record.merchant}
                                                                            </td>
                                                                            <td className="py-4 px-6 text-center">
                                                                                <span style={{ width: '100px' }} className={`inline-block text-center px-3 py-1 rounded-lg text-sm font-semibold border ${record.status === 'Approved' || record.status === 'Aproved'
                                                                                    ? 'text-green-400 border-green-500/30 bg-green-500/20'
                                                                                    : 'text-red-400 border-red-500/30 bg-red-500/20'
                                                                                    }`}>
                                                                                    {record.status === 'Aproved' ? 'Approved' : record.status}
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
                                                                        Showing {virtualCardStartIndex + 1} to {Math.min(virtualCardEndIndex, tableData.data.length)} of {tableData.data.length} results
                                                                    </div>

                                                                    <div className="flex items-center justify-between">
                                                                        <div className="hidden md:block text-sm text-slate-400">
                                                                            Showing {virtualCardStartIndex + 1} to {Math.min(virtualCardEndIndex, tableData.data.length)} of {tableData.data.length} results
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
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 max-w-md mx-auto">
                                        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700 rounded-2xl mb-6">
                                            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-2xl font-bold text-slate-300 mb-3">No Cards Available</h4>
                                        <p className="text-slate-400 text-lg">Please try again later.</p>
                                    </div>
                                )
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
                                                min="0"
                                                max="20"
                                                step="0.5"
                                                value={amount}
                                                onChange={(e) => handleAmountChange(parseFloat(e.target.value))}
                                                disabled={isLoadingFunds}
                                                className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{
                                                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${(amount / 20) * 100}%, #334155 ${(amount / 20) * 100}%, #334155 100%)`,
                                                    accentColor: '#10b981',
                                                }}
                                            />
                                            <div className="flex justify-between text-sm text-slate-400 mt-1">
                                                <span>$0</span>
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
                            </div>
                            <div className="flex justify-center mt-8">
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

        </>
    );
};

export default VccConfig;