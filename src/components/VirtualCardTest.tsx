import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

const VirtualCard: React.FC = () => {
    const navigate = useNavigate();
    const [amount, setAmount] = useState(0);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isPurchaseDisabled, setIsPurchaseDisabled] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [cardName, setCardName] = useState('');

    const handleErrorModalClose = () => {
        setShowErrorModal(false);
    };

    const handlePurchase = async () => {
        const currentUser = getAuth().currentUser;

        if (!currentUser) {
            setErrorMessage('You are not authenticated or your token is invalid');
            setShowErrorModal(true);
            return;
        }

        setIsPurchasing(true);
        setIsPurchaseDisabled(true);

        try {
            const idToken = await currentUser.getIdToken();

            const response = await fetch('https://buycard-ezeznlhr5a-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'authorization': `${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: finalPrice,
                    name: cardName
                })
            });

            const data = await response.json();

            if (response.ok) {
                navigate('/history?tab=virtualCards');
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
                setIsPurchasing(false);

                if (!shouldKeepDisabled) {
                    setIsPurchaseDisabled(false);
                }
            }
        } catch (error) {
            setErrorMessage('Please contact our customer support');
            setShowErrorModal(true);
            setIsPurchasing(false);
            setIsPurchaseDisabled(false);
        }
    };

    const handleAmountChange = (value: number) => {
        // Forzar rango y paso
        let clamped = Math.min(20, Math.max(0, value));
        // Redondear al 0.5 más cercano
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
                                    Virtual Debit Cards
                                </h1>
                                <p className="text-slate-300 text-md text-left">Exclusively for multiple verification purposes</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Information Section */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 mb-6">
                    <div className="flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-blue-300 text-sm font-semibold mb-3">Important information about these cards:</p>
                            <ul className="text-blue-200 text-xs mt-1 space-y-2 text-left">
                                <li>• They are randomly assigned as VISA or MasterCard, you can't choose the type of card</li>
                                <li>• They can be chosen with pre-loaded funds ($3) or with no funds ($0)</li>
                                <li>• If you want a card with more funds, contact us on <a href="mailto:support@majorphones.com" className="text-blue-400 hover:text-blue-300 underline font-semibold">email</a> or open a <Link to="/tickets" className="text-blue-400 hover:text-blue-300 underline font-semibold">ticket</Link></li>
                                <li>• They can be used with any name and in multiple sites, but may not work in some</li>
                                <li>• They can't be refunded once purchased</li>
                                <li>• Expiration date varies depending on the card assigned, it can't be chosen</li>
                                <li>• You can't have a physical card shipped or withdraw funds as cash</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <>
                    {/* Main Content Section - Slider, Input, Price, Purchase */}
                    <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
                        <div className="p-6">
                            <div className="relative z-10 mx-auto">
                                {/* Section Header */}
                                <div className="text-left mb-9">
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-2">
                                        Search & Configure
                                    </h1>
                                    <p className="text-slate-300 text-md">Select the amount for your virtual debit card</p>
                                </div>

                                <div className="space-y-9">
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
                                                disabled={isPurchasing}
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

                                        {/* Name Input */}
                                        <div className="w-full max-w-2xl mx-auto">
                                            <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider text-center mb-3">
                                                Cardholder Name
                                            </label>
                                            <input
                                                type="text"
                                                value={cardName}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                    if (value.length <= 30) {
                                                        setCardName(value);
                                                    }
                                                }}
                                                maxLength={30}
                                                disabled={isPurchasing}
                                                placeholder="Enter name for the card"
                                                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white text-center text-sm outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors duration-150 placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <p className="text-xs text-slate-500 text-center mt-1">
                                                {cardName.length}/30 characters — Letters only
                                            </p>
                                        </div>

                                        {/* Bottom Row: Price (left) + Purchase Button (right) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto items-center">
                                            {/* Price */}
                                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                                                <span className="text-md font-semibold text-slate-400">Final price for the VCC:</span>
                                                <span className="text-lg font-semibold text-green-400">${finalPrice.toFixed(2)}</span>
                                            </div>
                                            {/* Purchase Button */}
                                            <div className="flex justify-center sm:justify-end">
                                                <button
                                                    onClick={handlePurchase}
                                                    disabled={isPurchasing || isPurchaseDisabled || cardName.trim() === ''}
                                                    className="group w-[200px] py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-[1.02] border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                                >
                                                    <div className="relative z-10 flex items-center justify-center h-6">
                                                        {isPurchasing ? (
                                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        ) : (
                                                            <span className="group-hover:tracking-wide transition-all duration-300">
                                                                Purchase
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
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
        </>
    );
};

export default VirtualCard;