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

    const handleErrorModalClose = () => {
        setShowErrorModal(false);
    };



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
                                <button className="group flex items-center space-x-3 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm">
                                    <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                    </svg>
                                    <span className="text-slate-400 group-hover:text-white font-medium transition-colors duration-300">Back to table</span>
                                </button>
                            </div>
                            {/* Results Header */}
                            <div className="text-left mb-7">
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">Card information</h1>
                                <p className="text-slate-300 text-md">Full details about your card</p>
                            </div>
                            {/* Results Grid */}
                            {searchResults.length > 0 ? (
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
                                                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-xl transition-colors duration-300 shadow-lg hover:scale-[1.02] text-sm"
                                                                >
                                                                    Load Funds
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
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
        </>
    );
};

export default VccConfig;