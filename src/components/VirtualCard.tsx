import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
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

const VirtualCard: React.FC = () => {
  const navigate = useNavigate();
  const [hasBalance, setHasBalance] = useState(false);
  const [searchResults, setSearchResults] = useState<CardOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [cardSelection, setCardSelection] = useState({
    balance: false
  });

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPurchaseDisabled, setIsPurchaseDisabled] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

      const response = await fetch('https://getvcc-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cardSelection)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        navigate('/history?tab=virtualCards');
      } else {
        let errorMsg = 'An unknown error occurred';
        let shouldKeepDisabled = false;

        if (data.message === 'Unauthorized') {
          errorMsg = 'You are not authenticated or your token is invalid';
          shouldKeepDisabled = true;
        } else if (data.message === 'You cannot get a VCC, because you have used Amazon Pay') {
          errorMsg = 'Users that deposit with Amazon Pay cannot purchase virtual cards';
          shouldKeepDisabled = true;
        } else if (data.message === 'No VCC available') {
          errorMsg = 'We ran out of virtual cards, try again later';
        } else if (data.message === 'Insufficient balance') {
          errorMsg = 'You do not have enough balance to make the purchase';
        } else if (data.message === 'Internal Server Error') {
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

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(false);

    setCardSelection({
      balance: hasBalance
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockResults: CardOption[] = [
        {
          id: '1',
          cardNumber: '',
          expirationDate: '',
          cvv: '',
          cardFunds: hasBalance ? 3 : 0,
          price: hasBalance ? 7 : 4,
          hasBalance: hasBalance
        }
      ];

      setSearchResults(mockResults);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  return (
    <DashboardLayout currentPath="/virtualcard">
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
                <li>• You can't add extra funds, have a physical card shipped or withdraw funds as cash</li>     
              </ul>
            </div>
          </div>
        </div>

        {!hasSearched ? (
          <>
            {/* Main Content Section */}
            <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
              <div className="p-6">
                <div className="relative z-10 mx-auto">
                  {/* Search Header */}
                  <div className="text-left mb-9">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent mb-2">
                      Search & Configure
                    </h1>
                    <p className="text-slate-300 text-md">Find and configure your virtual debit card service</p>
                  </div>
                  
                  {/* Search Form */}
                  <div className="space-y-9">
                    {/* Form Elements Container */}
                    <div className="space-y-6">
                      {/* Balance Toggle and Continue Button Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {/* Balance Toggle */}
                        <div className="space-y-3 flex flex-col items-center mb-3 md:mb-0">
                          <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider text-center">
                            Cards with
                          </label>
                          <div className="flex items-center bg-slate-700/50 rounded-full p-2 border border-slate-600/50 w-fit">
                            <button
                              onClick={() => setHasBalance(false)}
                              className={`px-8 sm:px-8 lg:px-10 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap min-h-[2.5rem] flex items-center ${
                                !hasBalance 
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg' 
                                  : 'text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              No Balance
                            </button>
                            <button
                              onClick={() => setHasBalance(true)}
                              className={`px-8 sm:px-8 lg:px-10 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap min-h-[2.5rem] flex items-center ${
                                hasBalance 
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg' 
                                  : 'text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              Balance
                            </button>
                          </div>
                        </div>

                        {/* Continue Button */}
                        <div className="space-y-3 flex flex-col justify-end mb-1">
                          <button 
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="group px-8 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[230px] max-w-[390px] md:max-w-none mx-auto md:mx-0"
                          >                            
                            <div className="relative z-10 flex items-center justify-center">
                              {isSearching ? (
                                <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <span className="group-hover:tracking-wide transition-all duration-300">
                                  <span>Search cards</span>
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
        ) : (
          <>
            {/* Results Section */}
            <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
              <div className="p-6">
                <div className="relative z-10">
                  {/* Back Button */}
                  <div className="mb-5">
                    <button 
                      onClick={() => setHasSearched(false)}
                      className="group flex items-center space-x-3 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
                    >
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="text-slate-400 group-hover:text-white font-medium transition-colors duration-300">
                        Back to search
                      </span>
                    </button>
                  </div>

                  {/* Results Header */}
                  <div className="text-left mb-7">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                      Card options
                    </h1>
                    <p className="text-slate-300 text-md">
                      {searchResults.length > 0 
                        ? `Found 1 virtual debit card`
                        : 'No cards available'
                      }
                    </p>
                  </div>

                  {/* Results Grid */}
                  {searchResults.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1">
                      {searchResults.map((option) => (
                        <div
                          key={option.id}
                          className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 backdrop-blur-sm rounded-2xl p-8 border border-slate-600/50 border-blue-500/50 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:scale-[1.01]"
                          style={{ boxShadow: 'rgba(59, 130, 246, 0.25) 0px 0px 24px;' }}
                        >
                          {/* Card and Details Layout */}
                          <div className="flex flex-col space-y-6">
                            {/* Top Section: Card and Details */}
                            <div className="flex flex-col md:flex-row md:space-x-6">
                              {/* Virtual Card Display - Left Side on Desktop */}
                              <div className="flex-1 md:max-w-lg">
                                {/* Virtual Card Display */}
                                <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl border border-slate-600/50">
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
                                      <p className="text-md font-mono font-light">**** **** **** ****</p>
                                    </div>
                                    
                                    {/* Card Details Row */}
                                    <div className="grid grid-cols-2 gap-6">
                                      <div>
                                        <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Expires</p>
                                        <p className="text-md font-mono font-light">**/**</p>
                                      </div>
                                      <div>
                                        <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">CVV</p>
                                        <p className="text-md font-mono font-light">***</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Details - Right Side on Desktop */}
                              <div className="flex flex-col justify-center mt-6 md:mt-0 md:flex-1">
                                {/* Card Information Panel */}
                                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/40">
                                  <h3 className="text-md font-semibold text-white mb-4 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-blue-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Card Details
                                  </h3>
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                                      <span className="text-slate-300 font-medium">Type:</span>
                                      <span className={`font-semibold px-3 py-1 rounded-full text-xs md:text-sm ${
                                        option.hasBalance 
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                          : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                                      }`}>
                                        {option.hasBalance ? 'With Balance' : 'No Balance'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                                      <span className="text-slate-300 font-medium">Card Funds:</span>
                                      <span className="text-emerald-400 font-bold text-md">
                                        ${option.cardFunds}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                      <span className="text-slate-300 font-medium">Price:</span>
                                      <span className="text-emerald-400 font-bold text-md">
                                        ${option.price}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Centered Purchase Button */}
                            <div className="flex justify-center">
                              <button
                                onClick={handlePurchase}
                                disabled={isPurchasing || isPurchaseDisabled}
                                className="group relative px-8 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] text-md overflow-hidden w-[150px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-500 hover:to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative z-10 flex items-center justify-center">
                                  {isPurchasing ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  ) : (
                                    'Purchase'
                                  )}
                                </div>
                              </button>
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
          </>
        )}
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
    </DashboardLayout>
  );
};

export default VirtualCard;