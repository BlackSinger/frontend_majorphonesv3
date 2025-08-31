import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';

interface PaymentMethod {
  id: string;
  name: 'Cryptomus' | 'Amazon Pay' | 'Binance Pay' | 'Payeer' | 'Static Wallets';
  icon: React.ReactNode;
  description: string;
  minAmount: number;
  maxAmount: number;
  processingTime: string;
  fee: string;
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

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cryptomus',
      name: 'Cryptomus',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      description: 'Cryptocurrency payment gateway',
      minAmount: 1,
      maxAmount: 10000,
      processingTime: 'Instant',
      fee: '0.5%'
    },
    {
      id: 'amazon',
      name: 'Amazon Pay',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      description: 'Pay with your Amazon account',
      minAmount: 5,
      maxAmount: 5000,
      processingTime: '1-2 minutes',
      fee: '2.9% + $0.30'
    },
    {
      id: 'binance',
      name: 'Binance Pay',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      description: 'Binance cryptocurrency payments',
      minAmount: 1,
      maxAmount: 15000,
      processingTime: 'Instant',
      fee: '0%'
    },
    {
      id: 'payeer',
      name: 'Payeer',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: 'Digital wallet payments',
      minAmount: 1,
      maxAmount: 8000,
      processingTime: '5-10 minutes',
      fee: '1.95%'
    },
    {
      id: 'static-wallets',
      name: 'Static Wallets',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      description: 'Direct crypto wallet addresses',
      minAmount: 1,
      maxAmount: 50000,
      processingTime: 'Manual verification',
      fee: '0%'
    }
  ];

  const staticWallets: StaticWallet[] = [
    {
      id: 'usdt',
      name: 'USDT Tether',
      network: 'TRC-20',
      address: 'TQrZ4seYVQQYnXTgzMGgJG2xB9z6VJ5vPr',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#26A17B"/>
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">₮</text>
        </svg>
      ),
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'usdc',
      name: 'USDC',
      network: 'ERC-20',
      address: '0x742d35Cc6634C0532925a3b8D9C9E4e3c5c5F0a9',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#2775CA"/>
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">USD</text>
        </svg>
      ),
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'matic',
      name: 'MATIC',
      network: 'Polygon',
      address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#8247E5"/>
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">M</text>
        </svg>
      ),
      color: 'from-purple-500 to-violet-500'
    },
    {
      id: 'tron',
      name: 'TRON',
      network: 'TRC-20',
      address: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#FF060A"/>
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">T</text>
        </svg>
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

  const getBorderColor = (methodName: string) => {
    switch (methodName) {
      case 'Cryptomus':
        return 'border-orange-500/50 hover:border-orange-400';
      case 'Amazon Pay':
        return 'border-blue-500/50 hover:border-blue-400';
      case 'Binance Pay':
        return 'border-yellow-500/50 hover:border-yellow-400';
      case 'Payeer':
        return 'border-purple-500/50 hover:border-purple-400';
      case 'Static Wallets':
        return 'border-slate-500/50 hover:border-slate-400';
      default:
        return 'border-gray-500/50 hover:border-gray-400';
    }
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
      if (numAmount < selectedPaymentMethod.minAmount || numAmount > selectedPaymentMethod.maxAmount) {
        alert(`Amount must be between $${selectedPaymentMethod.minAmount} and $${selectedPaymentMethod.maxAmount}`);
        return;
      }
    }

    setIsProcessing(true);

    // Simulate API call
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
    <DashboardLayout currentPath="/add-funds">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-green-600/5 to-teal-600/10"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                  Add Funds
                </h1>
                <p className="text-slate-300 text-lg">Top up your account balance</p>
              </div>
            </div>
            
            {/* Current Balance */}
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 inline-block">
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-1">Current Balance</div>
                <div className="text-2xl font-bold text-emerald-400">$2,847.50</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods and Form */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-green-600/5 to-teal-600/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-400/20 to-green-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10 p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Payment Methods */}
              <div>
                <label className="block text-lg font-semibold text-emerald-300 uppercase tracking-wider mb-6">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="relative">
                      <input
                        type="radio"
                        id={method.id}
                        name="paymentMethod"
                        value={method.id}
                        checked={selectedMethod === method.id}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={method.id}
                        className={`block p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                          selectedMethod === method.id
                            ? `${getBorderColor(method.name)} bg-slate-800/50 shadow-xl`
                            : 'border-slate-600/50 bg-slate-800/20 hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${getMethodColor(method.name)} rounded-xl flex items-center justify-center shadow-lg`}>
                            {method.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-bold text-lg">{method.name}</h3>
                            <p className="text-slate-400 text-sm mb-2">{method.description}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                                {method.processingTime}
                              </span>
                              <span className="bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                                Fee: {method.fee}
                              </span>
                            </div>
                          </div>
                          {selectedMethod === method.id && (
                            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              {selectedMethod && selectedMethod !== 'static-wallets' && (
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-emerald-300 uppercase tracking-wider">
                    Amount to Add
                  </label>
                  
                  {selectedPaymentMethod && (
                    <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30 mb-4">
                      <div className="flex justify-between text-sm text-slate-400">
                        <span>Minimum: ${selectedPaymentMethod.minAmount}</span>
                        <span>Maximum: ${selectedPaymentMethod.maxAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 text-xl font-bold">$</span>
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min={selectedPaymentMethod?.minAmount || 1}
                      max={selectedPaymentMethod?.maxAmount || 10000}
                      step="0.01"
                      className="w-full pl-10 pr-4 py-4 bg-slate-800/50 border-2 border-slate-600/50 rounded-xl text-white text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 backdrop-blur-sm"
                      required
                    />
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 25, 50, 100].map((quickAmount) => (
                      <button
                        key={quickAmount}
                        type="button"
                        onClick={() => setAmount(quickAmount.toString())}
                        className="px-4 py-2 bg-slate-700/50 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-400 rounded-lg transition-all duration-300 border border-slate-600/30 hover:border-emerald-500/50 text-sm font-medium"
                      >
                        ${quickAmount}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Static Wallets Selection */}
              {selectedMethod === 'static-wallets' && (
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-emerald-300 uppercase tracking-wider">
                    Select Cryptocurrency
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {staticWallets.map((wallet) => (
                      <div key={wallet.id} className="relative">
                        <input
                          type="radio"
                          id={wallet.id}
                          name="staticWallet"
                          value={wallet.id}
                          checked={selectedWallet === wallet.id}
                          onChange={(e) => setSelectedWallet(e.target.value)}
                          className="sr-only"
                        />
                        <label
                          htmlFor={wallet.id}
                          className={`block p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                            selectedWallet === wallet.id
                              ? 'border-emerald-500/70 bg-slate-800/50 shadow-lg'
                              : 'border-slate-600/50 bg-slate-800/20 hover:bg-slate-800/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 bg-gradient-to-br ${wallet.color} rounded-lg flex items-center justify-center shadow-md`}>
                                {wallet.icon}
                              </div>
                              <div>
                                <h4 className="text-white font-bold">{wallet.name}</h4>
                                <p className="text-slate-400 text-sm">{wallet.network}</p>
                              </div>
                            </div>
                            {selectedWallet === wallet.id && (
                              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Wallet Address Display */}
                  {selectedWallet && (
                    <div className="mt-6 p-6 bg-slate-800/50 rounded-xl border border-slate-600/50">
                      <div className="text-center space-y-4">
                        {(() => {
                          const wallet = staticWallets.find(w => w.id === selectedWallet);
                          return wallet ? (
                            <>
                              <div className="flex items-center justify-center space-x-3 mb-4">
                                <div className={`w-8 h-8 bg-gradient-to-br ${wallet.color} rounded-lg flex items-center justify-center`}>
                                  {wallet.icon}
                                </div>
                                <h3 className="text-white font-bold text-lg">{wallet.name} Wallet Address</h3>
                              </div>
                              
                              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600/30">
                                <p className="text-slate-400 text-sm mb-2">Send {wallet.name} to this address:</p>
                                <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                                  <code className="text-emerald-400 font-mono text-sm break-all">{wallet.address}</code>
                                  <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(wallet.address)}
                                    className="ml-2 p-2 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-lg transition-colors duration-200"
                                    title="Copy address"
                                  >
                                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                                <p className="text-yellow-400 text-xs mt-2">
                                  ⚠️ Only send {wallet.name} on {wallet.network} network. Other tokens or networks will result in permanent loss.
                                </p>
                              </div>

                              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-4">
                                <div className="flex items-start space-x-2">
                                  <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div>
                                    <p className="text-blue-300 text-sm font-semibold">Important Instructions:</p>
                                    <ul className="text-blue-200 text-xs mt-1 space-y-1">
                                      <li>• Send any amount you want to add to your balance</li>
                                      <li>• After sending, contact support with your transaction hash</li>
                                      <li>• Funds will be credited after manual verification (1-24 hours)</li>
                                      <li>• Minimum confirmations required vary by network</li>
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
              {selectedMethod && ((selectedMethod !== 'static-wallets' && amount) || (selectedMethod === 'static-wallets' && selectedWallet)) && (
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    ) : selectedMethod === 'static-wallets' ? (
                      `Get Wallet Address & Instructions`
                    ) : (
                      `Add $${amount} via ${selectedPaymentMethod?.name}`
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddFunds;