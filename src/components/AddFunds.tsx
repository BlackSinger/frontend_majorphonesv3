import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from './DashboardLayout';
import CryptomusLogo from '../CryptomusLogo.svg';
import AmazonPayLogo from '../AmazonPayLogo.png';
import BinancePayLogo from '../BinancePayLogo.svg';
import PayeerLogo from '../PayeerLogo.png';
import UsdtTheterLogo from '../UsdtTheterLogo.svg';
import USDCLogo from '../USDCLogo.svg';
import PolygonMaticLogo from '../PolygonMaticLogo.svg';
import TronTrxLogo from '../TronTrxLogo.svg';

interface PaymentMethod {
  id: string;
  name: 'Cryptomus' | 'Amazon Pay' | 'Binance Pay' | 'Payeer' | 'Static Wallets';
  icon: React.ReactNode;
  description: string;
  minAmount: number;
  isAvailable?: boolean;
}

interface StaticWallet {
  id: string;
  name: string;
  network: string;
  address: string;
  icon: React.ReactNode;
  color: string;
}

const AddFunds: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showAmazonModal, setShowAmazonModal] = useState(false);
  const [showBinanceInstructions, setShowBinanceInstructions] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  
  const amountSectionRef = useRef<HTMLDivElement>(null);
  const staticWalletsSectionRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLDivElement>(null);
  const walletAddressRef = useRef<HTMLDivElement>(null);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cryptomus',
      name: 'Cryptomus',
      icon: (
        <img src={CryptomusLogo} alt="Cryptomus" className="w-8 h-8" />
      ),
      description: 'Cryptocurrency payment gateway',
      minAmount: 1
    },
    {
      id: 'amazon',
      name: 'Amazon Pay',
      icon: (
        <img src={AmazonPayLogo} alt="Amazon Pay" className="w-10 h-7" />
      ),
      description: 'Credit card payment through Amazon',
      minAmount: 2
    },
    {
      id: 'binance',
      name: 'Binance Pay',
      icon: (
        <img src={BinancePayLogo} alt="Binance Pay" className="w-8 h-8" />
      ),
      description: 'Cryptocurrency payment through Binance',
      minAmount: 0.5
    },
    {
      id: 'payeer',
      name: 'Payeer',
      icon: (
        <img src={PayeerLogo} alt="Payeer" className="w-9 h-9" />
      ),
      description: 'Digital wallet payments',
      minAmount: 1,
      isAvailable: false
    },
    {
      id: 'static-wallets',
      name: 'Static Wallets',
      icon: (
        <svg className="w-14 h-14 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      description: 'Direct crypto wallet addresses',
      minAmount: 1
    }
  ];

  const staticWallets: StaticWallet[] = [
    {
      id: 'usdt',
      name: 'USDT Tether',
      network: 'Tron TRC20',
      address: 'TQrZ4seYVQQYnXTgzMGgJG2xB9z6VJ5vPr',
      icon: (
        <img src={UsdtTheterLogo} alt="USDT Tether" className="w-8 h-8" />
      ),
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'usdc',
      name: 'USDC',
      network: 'ERC-20',
      address: '0x742d35Cc6634C0532925a3b8D9C9E4e3c5c5F0a9',
      icon: (
        <img src={USDCLogo} alt="USDC" className="w-7 h-7" />
      ),
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'matic',
      name: 'MATIC',
      network: 'Polygon',
      address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      icon: (
        <img src={PolygonMaticLogo} alt="MATIC" className="w-6 h-6" />
      ),
      color: 'from-purple-500 to-violet-500'
    },
    {
      id: 'tron',
      name: 'TRON',
      network: 'TRX',
      address: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
      icon: (
        <img src={TronTrxLogo} alt="TRON" className="w-6 h-6" />
      ),
      color: 'from-red-500 to-rose-500'
    }
  ];

  const getMethodColor = (methodName: string) => {
    switch (methodName) {
      case 'Cryptomus':
        return 'from-orange-500 to-amber-500';
      case 'Amazon Pay':
        return 'from-blue-500 to-indigo-500';
      case 'Binance Pay':
        return 'from-yellow-500 to-orange-500';
      case 'Payeer':
        return 'from-purple-500 to-violet-500';
      case 'Static Wallets':
        return 'from-slate-500 to-gray-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  // Page load animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll when payment method is selected
  useEffect(() => {
    if (selectedMethod) {
      setTimeout(() => {
        if (selectedMethod === 'static-wallets' && staticWalletsSectionRef.current) {
          staticWalletsSectionRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        } else if (selectedMethod !== 'static-wallets' && amountSectionRef.current) {
          amountSectionRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
    }
  }, [selectedMethod]);

  // Auto-scroll when amount is valid or wallet is selected
  useEffect(() => {
    if (selectedMethod && selectedMethod !== 'static-wallets' && amount && parseFloat(amount) > 0) {
      const selectedPaymentMethod = paymentMethods.find(method => method.id === selectedMethod);
      if (selectedPaymentMethod && parseFloat(amount) >= selectedPaymentMethod.minAmount) {
        setTimeout(() => {
          if (submitButtonRef.current) {
            submitButtonRef.current.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
          }
        }, 100);
      }
    }
  }, [selectedMethod, amount, paymentMethods]);

  // Auto-scroll when crypto wallet is selected
  useEffect(() => {
    if (selectedWallet) {
      setTimeout(() => {
        if (walletAddressRef.current) {
          walletAddressRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
    }
  }, [selectedWallet]);

  const handleAmazonModalOk = async () => {
    setShowAmazonModal(false);
    
    setIsProcessing(true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    alert(`Payment of $${amount} via ${selectedPaymentMethod?.name} has been initiated!`);
    
    setIsProcessing(false);
    setAmount('');
    setSelectedMethod('');
    setSelectedWallet('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;
    if (selectedMethod !== 'static-wallets' && !amount) return;
    if (selectedMethod === 'static-wallets' && !selectedWallet) return;

    const selectedPaymentMethod = paymentMethods.find(method => method.id === selectedMethod);

    if (!selectedPaymentMethod) return;
    
    if (selectedMethod !== 'static-wallets') {
      const numAmount = parseFloat(amount);
      if (numAmount < selectedPaymentMethod.minAmount) {
        setModalMessage(`The minimum amount for ${selectedPaymentMethod.name} is $${selectedPaymentMethod.minAmount}.`);
        setShowModal(true);
        return;
      }
    }

    // Special handling for Amazon Pay
    if (selectedMethod === 'amazon') {
      console.log('Amazon Pay selected, showing modal');
      setShowAmazonModal(true);
      return;
    }

    // Special handling for Binance Pay
    if (selectedMethod === 'binance') {
      setShowBinanceInstructions(true);
      return;
    }

    setIsProcessing(true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (selectedMethod === 'static-wallets') {
      const selectedWalletData = staticWallets.find(wallet => wallet.id === selectedWallet);
      alert(`Your ${selectedWalletData?.name} wallet address is ready. Send any amount to the provided address and notify us with your transaction hash for verification.`);
    } else {
      alert(`Payment of $${amount} via ${selectedPaymentMethod.name} has been initiated!`);
    }
    
    setIsProcessing(false);
    setAmount('');
    setSelectedMethod('');
    setSelectedWallet('');
  };

  const selectedPaymentMethod = paymentMethods.find(method => method.id === selectedMethod);

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style>{`
        .dashboard-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .dashboard-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 10px;
        }
        .dashboard-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.6);
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        .dashboard-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.8);
        }
      `}</style>
      
    <DashboardLayout currentPath="/add-funds">
      
      <div className={`space-y-6 transition-all duration-1000 ${isLoaded ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
        {/* Header */}
        <div 
          className="group rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden hover:shadow-3xl transition-all duration-500 hover:scale-[1.01] cursor-pointer"
          style={{
            backgroundColor: '#1e293b',
            animationDelay: '200ms',
            animation: isLoaded ? 'slideInFromTop 0.8s ease-out forwards' : 'none'
          }}
        >
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 group-hover:transform group-hover:translate-x-2 transition-transform duration-500">
              
              <div>
                <h1 className="text-left text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-blue-300 transition-all duration-500">
                  Add Funds
                </h1>
                <p className="text-left text-slate-300 text-md group-hover:text-slate-200 transition-colors duration-300">Top up your account balance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods and Form */}
        <div 
          className="group rounded-3xl shadow-2xl border border-slate-600/50 p-6 relative overflow-hidden hover:shadow-3xl transition-all duration-500"
          style={{
            backgroundColor: '#1e293b',
            animationDelay: '800ms',
            animation: isLoaded ? 'slideInFromBottom 0.8s ease-out forwards' : 'none'
          }}
        >
          
          <div className="relative z-10 p-2">
            <div className={`justify-center ${selectedMethod ? 'space-y-8' : ''}`}>
              
              {/* Payment Methods Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/section">
                <div className="flex items-center space-x-3 mb-4 group-hover/section:transform group-hover/section:translate-y-1 transition-transform duration-300">
                  <p className="font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover/section:from-cyan-300 group-hover/section:to-blue-300 transition-all duration-500" style={{ fontSize: '1.2rem' }}>Select Payment Method</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className={`relative p-6 rounded-xl border transition-all duration-300 group/item ${method.isAvailable === false
                        ? 'bg-red-900/20 border-red-600/30 opacity-70 cursor-not-allowed'
                        : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50 cursor-pointer'
                        }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className={`flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0 transition-transform duration-500 flex-1 min-w-0 ${method.isAvailable === false ? '' : 'group-hover/item:transform group-hover/item:translate-x-2'
                            }`}>
                            <div className={`w-12 h-12 bg-gradient-to-br ${method.isAvailable === false ? 'from-red-600/50 to-red-700/50' : 'from-emerald-500 to-green-500'
                              } rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                              {method.icon}
                            </div>
                            <div className="min-w-0 flex-1 text-center sm:text-left">
                              <h3 className={`font-bold transition-colors duration-300 ${method.isAvailable === false
                                ? 'text-red-300'
                                : 'text-white group-hover/item:text-blue-100'
                                }`} style={{ fontSize: '1rem' }}>{method.name}</h3>
                              <p className={`transition-colors duration-300 ${method.isAvailable === false
                                ? 'text-red-400'
                                : 'text-slate-400 group-hover/item:text-slate-300'
                                }`}>{method.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center sm:justify-end space-x-2 sm:space-x-4 flex-shrink-0 min-w-0">
                            {method.isAvailable === false ? (
                              <span className="text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-1 rounded text-sm font-semibold flex-shrink-0">
                                Unavailable
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedMethod === method.id) {
                                    setSelectedMethod('');
                                  } else {
                                    setSelectedMethod(method.id);
                                  }
                                }}
                                className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-300 flex-shrink-0 w-20 sm:w-20 w-full ${
                                  selectedMethod === method.id
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                                    : 'bg-slate-600/50 hover:bg-slate-500/50 text-slate-300 hover:text-white border border-slate-500/30 hover:border-slate-400/50'
                                }`}
                              >
                                {selectedMethod === method.id ? 'Selected' : 'Select'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </form>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Amount Input Section */}
                {selectedMethod && selectedMethod !== 'static-wallets' && (
                    <div ref={amountSectionRef} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/section">
                      <div className="flex items-center space-x-3 mb-4 group-hover/section:transform group-hover/section:translate-y-1 transition-transform duration-300">
                        <p className="font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover/section:from-cyan-300 group-hover/section:to-blue-300 transition-all duration-500" style={{ fontSize: '1.2rem' }}>Amount to Add</p>
                      </div>

                      <div className="space-y-4">
                        {selectedPaymentMethod && (
                          <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50">
                            <div className="text-sm text-slate-400">
                              <span>Minimum: ${selectedPaymentMethod.minAmount}</span>
                            </div>
                          </div>
                        )}

                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-slate-400 text-md font-bold">$</span>
                          </div>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                              let newValue = e.target.value;
                              
                              // Remove any negative signs
                              newValue = newValue.replace(/-/g, '');
                              
                              const decimalParts = newValue.split('.');
                              
                              // Only allow up to 2 decimal places
                              if (decimalParts.length > 1 && decimalParts[1].length <= 2) {
                                const numValue = parseFloat(newValue);
                                // Don't allow values greater than 10000
                                if (numValue <= 10000) {
                                  setAmount(newValue);
                                }
                              } else if (decimalParts.length === 1) {
                                // No decimal point yet, allow it if <= 10000
                                const numValue = parseFloat(newValue);
                                if (newValue === '' || numValue <= 10000) {
                                  setAmount(newValue);
                                }
                              }
                            }}
                            onWheel={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onFocus={(e) => {
                              const handleWheel = (event: Event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              };
                              e.target.addEventListener('wheel', handleWheel, { passive: false });
                              e.target.addEventListener('mousewheel', handleWheel, { passive: false });
                            }}
                            onBlur={(e) => {
                              const handleWheel = (event: Event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              };
                              e.target.removeEventListener('wheel', handleWheel);
                              e.target.removeEventListener('mousewheel', handleWheel);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.preventDefault();
                              }
                            }}
                            placeholder="0"
                            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-xl text-white text-md font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            required
                          />
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[10, 25, 50, 100].map((quickAmount) => (
                            <button
                              key={quickAmount}
                              type="button"
                              onClick={() => {
                                setAmount(quickAmount.toString());
                                // Auto-scroll to submit button after quick amount is selected
                                setTimeout(() => {
                                  if (submitButtonRef.current) {
                                    submitButtonRef.current.scrollIntoView({ 
                                      behavior: 'smooth',
                                      block: 'start'
                                    });
                                  }
                                }, 150);
                              }}
                              className="px-4 py-2 bg-slate-700/50 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 rounded-lg transition-all duration-300 border border-slate-600/30 hover:border-blue-500/50 text-sm font-medium"
                            >
                              ${quickAmount}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Static Wallets Selection */}
                  {selectedMethod === 'static-wallets' && (
                    <div ref={staticWalletsSectionRef} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/section">
                      <div className="flex items-center space-x-3 mb-4 group-hover/section:transform group-hover/section:translate-y-1 transition-transform duration-300">
                        <p className="font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover/section:from-cyan-300 group-hover/section:to-blue-300 transition-all duration-500" style={{ fontSize: '1.2rem' }}>Select Cryptocurrency</p>
                      </div>

                      <div className="space-y-4">
                        {staticWallets.map((wallet) => (
                          <div key={wallet.id} className="p-6 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/item">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0 group-hover/item:transform group-hover/item:translate-x-2 transition-transform duration-500 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                                  {wallet.icon}
                                </div>
                                <div className="min-w-0 flex-1 text-center sm:text-left">
                                  <h4 className="font-bold text-white group-hover/item:text-blue-100 transition-colors duration-300" style={{ fontSize: '1rem' }}>{wallet.name}</h4>
                                  <p className="text-slate-400 group-hover/item:text-slate-300 transition-colors duration-300">{wallet.network}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 flex-shrink-0 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedWallet === wallet.id) {
                                      setSelectedWallet('');
                                    } else {
                                      setSelectedWallet(wallet.id);
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-300 flex-shrink-0 w-20 sm:w-20 w-full ${
                                    selectedWallet === wallet.id
                                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                                      : 'bg-slate-600/50 hover:bg-slate-500/50 text-slate-300 hover:text-white border border-slate-500/30 hover:border-slate-400/50'
                                  }`}
                                >
                                  {selectedWallet === wallet.id ? 'Selected' : 'Select'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Wallet Address Display */}
                      {selectedWallet && (
                        <div ref={walletAddressRef} className="mt-6 p-6 bg-slate-700/50 rounded-xl border border-slate-600/50">
                          <div className="text-center space-y-4">
                            {(() => {
                              const wallet = staticWallets.find(w => w.id === selectedWallet);
                              return wallet ? (
                                <>
                                  <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-3 space-y-2 sm:space-y-0 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                                      {wallet.icon}
                                    </div>
                                    <h3 className="text-white font-bold text-lg text-center sm:text-left">{wallet.name} Wallet Address</h3>
                                  </div>

                                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                                    <p className="text-slate-400 text-sm mb-2">
                                      <span className="block sm:hidden">Copy the wallet:</span>
                                      <span className="hidden sm:block">Send {wallet.name} to this address:</span>
                                    </p>
                                    <div className="bg-slate-700/50 rounded-lg p-3">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <code className="text-blue-400 font-mono text-sm break-all">{wallet.address}</code>
                                        <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await navigator.clipboard.writeText(wallet.address);
                                            setCopiedAddress(true);
                                            setTimeout(() => setCopiedAddress(false), 2000);
                                          } catch (err) {
                                            console.error('Failed to copy: ', err);
                                            // Fallback for older browsers
                                            const textArea = document.createElement('textarea');
                                            textArea.value = wallet.address;
                                            document.body.appendChild(textArea);
                                            textArea.select();
                                            document.execCommand('copy');
                                            document.body.removeChild(textArea);
                                            setCopiedAddress(true);
                                            setTimeout(() => setCopiedAddress(false), 2000);
                                          }
                                        }}
                                        className={`sm:ml-2 p-2 rounded-lg transition-all duration-200 self-center sm:self-auto ${
                                          copiedAddress 
                                            ? 'bg-green-600/30 text-green-400' 
                                            : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                                        }`}
                                        title={copiedAddress ? "Copied!" : "Copy address"}
                                      >
                                        {copiedAddress ? (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                          </svg>
                                        ) : (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                          </svg>
                                        )}
                                      </button>
                                      </div>
                                    </div>
                                    <p className="text-yellow-400 text-xs mt-2">
                                      ⚠️ Only send {wallet.name} on <span className='font-bold'>{wallet.network} network</span>. Other tokens or networks will result in permanent loss.
                                    </p>
                                  </div>

                                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mt-4">
                                    <div className="flex items-center justify-center">
                                      <div className="text-center">
                                        <p className="text-blue-300 text-sm font-semibold">Important Instructions:</p>
                                        <ul className="text-blue-200 text-xs mt-1 space-y-1 text-left">
                                          <li>• Send any amount you want to add to your balance and make sure you are sending funds through the correct network</li>
                                          <li>• Minimum confirmations required vary by network, as well as the time the funds arrive</li>
                                          <li>• Funds will be credited after all confirmations, so please wait for a couple of minutes</li>
                                          <li className='font-bold text-lg text-center'>Check the status of the payment in <a href="/transactions" className="text-blue-400 hover:text-blue-300 underline font-semibold">Transactions</a> if you don't have your balance reflected</li>
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  {selectedMethod && selectedMethod !== 'static-wallets' && amount && parseFloat(amount) > 0 && !(amount.startsWith('0') && amount.length > 1 && !amount.includes('.')) && !(selectedMethod === 'binance' && showBinanceInstructions) && (
                    <div ref={submitButtonRef} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 group/section">
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl"
                      >
                        {isProcessing ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          `Add $${amount} via ${selectedPaymentMethod?.name}`
                        )}
                      </button>
                    </div>
                  )}

                  {/* Binance Pay Instructions */}
                  {showBinanceInstructions && selectedMethod === 'binance' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mt-4">
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-blue-300 text-sm font-semibold">Important Instructions:</p>
                          <ul className="text-blue-200 text-xs mt-1 space-y-1 text-left">
                            <li>• Send ${amount} to <span className='font-bold'>payments@majorphones.com</span> (do not translate the email)</li>
                            <li>• Contact us on <a href="https://t.me/MajorPhones" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline font-semibold">Telegram</a>, <a href="mailto:support@majorphones.com" className="text-blue-400 hover:text-blue-300 underline font-semibold">email</a> or open a <a href="/tickets" className="text-blue-400 hover:text-blue-300 underline font-semibold">ticket</a></li>
                            <li>• Send Binance image of the transaction where we can see the order ID</li>
                            <li className='font-bold text-lg text-center'>Deposits above $1 get extra $0.5</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>

    {/* Validation Modal */}
    {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
          <div className="text-center">
            <div className="mb-4">

              <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>

            </div>
            <h3 className="text-lg font-medium text-white mb-2">Minimum Amount Required</h3>
            <p className="text-blue-200 mb-4">{modalMessage}</p>
            <button
              onClick={() => setShowModal(false)}
              className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Amazon Pay Modal */}
    {showAmazonModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-70 h-58">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Wait</h3>
            <p className="text-blue-200 mb-4 text-justify" style={{ maxWidth: '16rem' }}>If you deposit through Amazon Pay, you won't be able to purchase middle/long term numbers.</p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowAmazonModal(false)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300"
              >
                Back
              </button>
              <button
                onClick={handleAmazonModalOk}
                className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
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

export default AddFunds;