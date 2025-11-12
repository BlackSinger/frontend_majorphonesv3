import React, { useState, useEffect, useRef } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

const MajorVccStock: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'availableStock' | 'addVcc'>('availableStock');
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [stockData, setStockData] = useState<any>(null);
  const [hasLoadedStock, setHasLoadedStock] = useState(false);
  const [currentStockPage, setCurrentStockPage] = useState(1);
  const [showStockUuidModal, setShowStockUuidModal] = useState(false);
  const [selectedStockUuid, setSelectedStockUuid] = useState('');
  const [isStockUuidCopied, setIsStockUuidCopied] = useState(false);
  const [copiedStockCardNumbers, setCopiedStockCardNumbers] = useState<{[key: string]: boolean}>({});
  const [stockCardNumberSearch, setStockCardNumberSearch] = useState('');
  const [stockFundsFilter, setStockFundsFilter] = useState<string>('All');
  const [isStockFundsDropdownOpen, setIsStockFundsDropdownOpen] = useState(false);
  const stockFundsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stockFundsDropdownRef.current && !stockFundsDropdownRef.current.contains(event.target as Node)) {
        setIsStockFundsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchAvailableCards = async () => {
      if (activeTab !== 'availableStock' || hasLoadedStock) {
        return;
      }

      try {
        setIsLoadingStock(true);
        setErrorMessage('');

        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          setErrorMessage('User not authenticated');
          return;
        }

        const idToken = await currentUser.getIdToken();

        const response = await fetch('https://getavailablecards-ezeznlhr5a-uc.a.run.app', {
          method: 'GET',
          headers: {
            'authorization': `${idToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 403) {
          // Forbidden - cerrar sesión y redirigir
          await signOut(auth);
          navigate('/signin');
          return;
        }

        if (!response.ok) {
          throw new Error('Internal Server Error');
        }

        const data = await response.json();
        console.log('Available cards:', data);
        setStockData(data.cards || []);
        setHasLoadedStock(true);

      } catch (error) {
        setErrorMessage('An error occurred while loading available cards, please try again');
      } finally {
        setIsLoadingStock(false);
      }
    };

    fetchAvailableCards();
  }, [activeTab, hasLoadedStock, navigate]);

  const handleStockUuidClick = (uuid: string) => {
    setSelectedStockUuid(uuid);
    setShowStockUuidModal(true);
    setIsStockUuidCopied(false);
  };

  const handleCopyStockUuid = async () => {
    try {
      await navigator.clipboard.writeText(selectedStockUuid);
      setIsStockUuidCopied(true);
      setTimeout(() => setIsStockUuidCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyStockCardNumber = async (cardNumber: string, cardId: string) => {
    try {
      await navigator.clipboard.writeText(cardNumber);
      setCopiedStockCardNumbers(prev => ({ ...prev, [cardId]: true }));
      setTimeout(() => {
        setCopiedStockCardNumbers(prev => ({ ...prev, [cardId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';

    let date: Date;
    if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleLoad = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setErrorMessage('User not authenticated');
        return;
      }

      const idToken = await currentUser.getIdToken();

      // Determinar balance según price
      const balance = price === 4 ? 0 : price === 9 ? 3 : 0;

      const vccData = {
        cardNumber,
        expirationDate,
        cvv,
        price,
        balance
      };

      const response = await fetch('https://loadstockvcc-ezeznlhr5a-uc.a.run.app', {
        method: 'POST',
        headers: {
          'authorization': `${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vccData)
      });

      if (response.status === 403) {
        // Forbidden - cerrar sesión y redirigir
        await signOut(auth);
        navigate('/signin');
        return;
      }

      if (!response.ok) {
        throw new Error('Internal Server Error');
      }

      // Éxito
      setShowSuccessModal(true);

      // Limpiar los inputs
      setCardNumber('');
      setExpirationDate('');
      setCvv('');
      setPrice(0);

    } catch (error) {
      setErrorMessage('An error occurred while loading the VCC, please try again');
    } finally {
      setLoading(false);
    }
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
                  VCC Stock
                </h1>
                <p className="text-slate-300 text-md text-left">Add VCC to stock</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Content */}
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 relative">
          <div className="p-6">
            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="flex space-x-4 border-b border-slate-700/50">
                <button
                  onClick={() => setActiveTab('availableStock')}
                  className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                    activeTab === 'availableStock'
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  Available Stock
                </button>
                <button
                  onClick={() => setActiveTab('addVcc')}
                  className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${
                    activeTab === 'addVcc'
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  Add VCC
                </button>
              </div>
            </div>

            {/* Available Stock Tab Content */}
            {activeTab === 'availableStock' && (
              <>
                {/* Filters */}
                {!isLoadingStock && stockData && stockData.length > 0 && (
                  <div className="mb-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Card Number Search */}
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                          Card Number Search
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={stockCardNumberSearch}
                            onChange={(e) => {
                              setStockCardNumberSearch(e.target.value);
                              setCurrentStockPage(1);
                            }}
                            placeholder="Enter card number"
                            className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white placeholder-slate-400 text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Funds Filter */}
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                          Initial Funds
                        </label>
                        <div className="relative group" ref={stockFundsDropdownRef}>
                          <div
                            onClick={() => setIsStockFundsDropdownOpen(!isStockFundsDropdownOpen)}
                            className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white cursor-pointer text-sm shadow-inner hover:border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 flex items-center justify-between"
                          >
                            <span>{stockFundsFilter === 'All' ? 'All Funds' : stockFundsFilter}</span>
                          </div>

                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className={`h-6 w-6 text-emerald-400 transition-transform duration-300 ${isStockFundsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          {/* Custom Dropdown Options */}
                          {isStockFundsDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600/50 rounded-2xl shadow-xl z-[60] max-h-60 overflow-y-auto text-sm">
                              {['All', '$0', '$3'].map((option) => (
                                <div
                                  key={option}
                                  onClick={() => {
                                    setStockFundsFilter(option);
                                    setIsStockFundsDropdownOpen(false);
                                    setCurrentStockPage(1);
                                  }}
                                  className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 text-white first:rounded-t-2xl last:rounded-b-2xl text-left"
                                >
                                  {option === 'All' ? 'All Funds' : option}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto overflow-y-visible">
                {isLoadingStock ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-slate-400 mt-4">Loading VCC stock...</p>
                  </div>
                ) : errorMessage ? (
                  <></>
                ) : stockData && stockData.length > 0 ? (
                  (() => {
                    // Check if there are any results after filtering
                    let filteredResults = stockData.filter((card: any) => {
                      const cardNumberMatch = stockCardNumberSearch === '' ||
                        card.cardNumber.toLowerCase().includes(stockCardNumberSearch.toLowerCase());
                      let fundsMatch = true;
                      if (stockFundsFilter !== 'All') {
                        const initialFunds = card.price === 4 ? '$0' : card.price === 9 ? '$3' : '$0';
                        fundsMatch = initialFunds === stockFundsFilter;
                      }
                      return cardNumberMatch && fundsMatch;
                    });

                    if (filteredResults.length === 0) {
                      return (
                        <div className="text-center py-16">
                          <p className="text-slate-400 text-lg">No VCC cards match your filters</p>
                        </div>
                      );
                    }

                    return (
                  <>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="text-center py-4 px-4 text-slate-300 font-semibold">ID</th>
                          <th className="text-center py-4 px-4 text-slate-300 font-semibold">Upload Date</th>
                          <th className="text-center py-4 px-4 text-slate-300 font-semibold">Price</th>
                          <th className="text-center py-4 px-6 text-slate-300 font-semibold">Card Number</th>
                          <th className="text-center py-4 px-4 text-slate-300 font-semibold">Expiration Date</th>
                          <th className="text-center py-4 px-4 text-slate-300 font-semibold">CVV</th>
                          <th className="text-center py-4 px-4 text-slate-300 font-semibold">Initial Funds</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Filter data
                          let filteredData = stockData.filter((card: any) => {
                            // Card Number filter
                            const cardNumberMatch = stockCardNumberSearch === '' ||
                              card.cardNumber.toLowerCase().includes(stockCardNumberSearch.toLowerCase());

                            // Initial Funds filter
                            let fundsMatch = true;
                            if (stockFundsFilter !== 'All') {
                              const initialFunds = card.price === 4 ? '$0' : card.price === 9 ? '$3' : '$0';
                              fundsMatch = initialFunds === stockFundsFilter;
                            }

                            return cardNumberMatch && fundsMatch;
                          });

                          // Sort by createdAt descending (most recent first)
                          const sortedData = [...filteredData].sort((a, b) => {
                            const dateA = a.createdAt?._seconds ? new Date(a.createdAt._seconds * 1000).getTime() :
                                          a.createdAt?.toDate ? a.createdAt.toDate().getTime() :
                                          new Date(a.createdAt).getTime();
                            const dateB = b.createdAt?._seconds ? new Date(b.createdAt._seconds * 1000).getTime() :
                                          b.createdAt?.toDate ? b.createdAt.toDate().getTime() :
                                          new Date(b.createdAt).getTime();
                            return dateB - dateA; // Descending order
                          });

                          const itemsPerPage = 10;
                          const startIndex = (currentStockPage - 1) * itemsPerPage;
                          const endIndex = startIndex + itemsPerPage;
                          const paginatedData = sortedData.slice(startIndex, endIndex);

                          return paginatedData.map((card: any, index: number) => {
                            const initialFunds = card.price === 4 ? '$0' : card.price === 9 ? '$3' : '$0';

                            return (
                              <tr
                                key={card.id || index}
                                className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200 ${
                                  index % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'
                                }`}
                              >
                                <td className="py-4 px-6">
                                  <div className="flex items-center justify-center">
                                    <button
                                      onClick={() => handleStockUuidClick(card.id)}
                                      className="p-2 text-slate-400 hover:text-blue-500 transition-colors duration-200 rounded-lg hover:bg-slate-700/30"
                                      title="View Order ID"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-white text-center">{formatDate(card.createdAt)}</td>
                                <td className="py-4 px-6 text-center">
                                  <span className="text-emerald-400 font-semibold">${card.price}</span>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="font-mono text-white text-center">
                                    {card.cardNumber}
                                    <button
                                      onClick={() => handleCopyStockCardNumber(card.cardNumber, card.id)}
                                      className="ml-2 p-1 text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded hover:bg-slate-700/30 inline-flex items-center"
                                      title={copiedStockCardNumbers[card.id] ? "Copied!" : "Copy Card Number"}
                                    >
                                      {copiedStockCardNumbers[card.id] ? (
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
                                </td>
                                <td className="py-4 px-6 text-white text-center">{card.expirationDate}</td>
                                <td className="py-4 px-6 text-white text-center font-mono">{card.cvv}</td>
                                <td className="py-4 px-6 text-center">
                                  <span className="text-emerald-400 font-semibold">{initialFunds}</span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {(() => {
                      // Calculate filtered data for pagination visibility
                      let filteredDataForPagination = stockData.filter((card: any) => {
                        const cardNumberMatch = stockCardNumberSearch === '' ||
                          card.cardNumber.toLowerCase().includes(stockCardNumberSearch.toLowerCase());
                        let fundsMatch = true;
                        if (stockFundsFilter !== 'All') {
                          const initialFunds = card.price === 4 ? '$0' : card.price === 9 ? '$3' : '$0';
                          fundsMatch = initialFunds === stockFundsFilter;
                        }
                        return cardNumberMatch && fundsMatch;
                      });
                      return filteredDataForPagination.length > 10;
                    })() && (
                      <div className="mt-6">
                        <div className="flex items-center justify-center space-x-2">
                          {/* Previous Button */}
                          <button
                            onClick={() => setCurrentStockPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentStockPage === 1}
                            className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>

                          {/* Page Numbers */}
                          <div className="flex space-x-2">
                            {(() => {
                              // Calculate total pages based on filtered data
                              let filteredDataForTotalPages = stockData.filter((card: any) => {
                                const cardNumberMatch = stockCardNumberSearch === '' ||
                                  card.cardNumber.toLowerCase().includes(stockCardNumberSearch.toLowerCase());
                                let fundsMatch = true;
                                if (stockFundsFilter !== 'All') {
                                  const initialFunds = card.price === 4 ? '$0' : card.price === 9 ? '$3' : '$0';
                                  fundsMatch = initialFunds === stockFundsFilter;
                                }
                                return cardNumberMatch && fundsMatch;
                              });
                              const totalPages = Math.ceil(filteredDataForTotalPages.length / 10);
                              const pages = [];
                              for (let i = 1; i <= totalPages; i++) {
                                pages.push(i);
                              }
                              return pages.map(page => (
                                <button
                                  key={page}
                                  onClick={() => setCurrentStockPage(page)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                    currentStockPage === page
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-slate-800/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                                  }`}
                                >
                                  {page}
                                </button>
                              ));
                            })()}
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={() => {
                              let filteredDataForNext = stockData.filter((card: any) => {
                                const cardNumberMatch = stockCardNumberSearch === '' ||
                                  card.cardNumber.toLowerCase().includes(stockCardNumberSearch.toLowerCase());
                                let fundsMatch = true;
                                if (stockFundsFilter !== 'All') {
                                  const initialFunds = card.price === 4 ? '$0' : card.price === 9 ? '$3' : '$0';
                                  fundsMatch = initialFunds === stockFundsFilter;
                                }
                                return cardNumberMatch && fundsMatch;
                              });
                              const maxPage = Math.ceil(filteredDataForNext.length / 10);
                              setCurrentStockPage(prev => Math.min(prev + 1, maxPage));
                            }}
                            disabled={(() => {
                              let filteredDataForDisabled = stockData.filter((card: any) => {
                                const cardNumberMatch = stockCardNumberSearch === '' ||
                                  card.cardNumber.toLowerCase().includes(stockCardNumberSearch.toLowerCase());
                                let fundsMatch = true;
                                if (stockFundsFilter !== 'All') {
                                  const initialFunds = card.price === 4 ? '$0' : card.price === 9 ? '$3' : '$0';
                                  fundsMatch = initialFunds === stockFundsFilter;
                                }
                                return cardNumberMatch && fundsMatch;
                              });
                              return currentStockPage === Math.ceil(filteredDataForDisabled.length / 10);
                            })()}
                            className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                    );
                  })()
                ) : (
                  <div className="text-center py-16">
                    <p className="text-slate-400 text-lg">No VCC stock available</p>
                  </div>
                )}
                </div>
              </>
            )}

            {/* Add VCC Tab Content */}
            {activeTab === 'addVcc' && (
              <div className="relative z-10">
                {/* Header */}
                <div className="text-center">
                  <p className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">Load details</p>
                </div>

                {/* Card Display - Centered */}
                <div className="flex justify-center">
                
                <div className="flex flex-col space-y-6 max-w-lg w-full">
                    <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl border border-slate-600/50" style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)' }}>
                        <div className="absolute inset-0 opacity-5">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
                            <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5"></div>
                            <div className="absolute bottom-8 left-8 w-8 h-8 rounded-full bg-white/5"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/3"></div>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <div className="text-left">
                                    <p className="text-md opacity-80 font-medium">Virtual Debit Card</p>
                                </div>
                                <img 
                                    src={MajorPhonesFavIc} 
                                    alt="MajorPhones" 
                                    className="w-12 h-10 object-contain hidden md:block"
                                />
                            </div>
                            <div className="mb-6">
                                <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Card Number</p>
                                <input
                                    type="text"
                                    placeholder="1234567890123456"
                                    autoComplete="off"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-md font-mono font-light text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Expires</p>
                                    <input
                                        type="text"
                                        placeholder="MM/YY"
                                        autoComplete="off"
                                        value={expirationDate}
                                        onChange={(e) => setExpirationDate(e.target.value)}
                                        disabled={loading}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-md font-mono font-light text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">CVV</p>
                                    <input
                                        type="text"
                                        placeholder="123"
                                        autoComplete="off"
                                        value={cvv}
                                        onChange={(e) => setCvv(e.target.value)}
                                        disabled={loading}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-md font-mono font-light text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1 flex flex-col items-center">
                                    <p className="text-sm opacity-60 mb-2 uppercase tracking-wider">Price</p>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        autoComplete="off"
                                        value={price || ''}
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        disabled={loading}
                                        className="w-1/2 md:w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-md font-mono font-light text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <button
                            onClick={handleLoad}
                            disabled={loading}
                            className="group relative px-8 py-2 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] text-md overflow-hidden w-[150px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-500 hover:to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10 flex items-center justify-center">
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    'Load'
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

      {/* Stock UUID Modal */}
      {showStockUuidModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-70 h-58">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto flex items-center justify-center">
                  <img src={MajorPhonesFavIc} alt="Major Phones" className="w-12 h-10" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Order ID</h3>
              <p className="text-blue-200 mb-4 break-all">{selectedStockUuid}</p>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={handleCopyStockUuid}
                  style={{ width: '5.5rem' }}
                  className={`font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center ${
                    isStockUuidCopied
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600'
                      : 'bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600'
                  } text-white`}
                >
                  {isStockUuidCopied ? (
                    <span>Copied</span>
                  ) : (
                    <span>Copy</span>
                  )}
                </button>
                <button
                  onClick={() => setShowStockUuidModal(false)}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80 max-w-md">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto flex items-center justify-center bg-green-500/20 rounded-full">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Success</h3>
              <p className="text-blue-200 mb-4">This VCC has been loaded</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                >
                  Ok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80 max-w-md">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto flex items-center justify-center bg-red-500/20 rounded-full">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Error</h3>
              <p className="text-blue-200 mb-4">{errorMessage}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setErrorMessage('')}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
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

export default MajorVccStock;