import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from './DashboardLayout';
import MajorPhonesFavIc from '../MajorPhonesFavIc.png';

const Dashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoaded, setIsLoaded] = useState(false);
  const [animatedPurchases, setAnimatedPurchases] = useState(0);
  const [animatedSpent, setAnimatedSpent] = useState(0);
  const [animatedDeposit, setAnimatedDeposit] = useState(0);
  const [animatedTickets, setAnimatedTickets] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState<number | null>(null);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(true);
  const [purchasesError, setPurchasesError] = useState<string | null>(null);
  const [showPurchasesModal, setShowPurchasesModal] = useState(false);
  const [totalSpent, setTotalSpent] = useState<number | null>(null);
  const [isLoadingSpent, setIsLoadingSpent] = useState(true);
  const [spentError, setSpentError] = useState<string | null>(null);
  const [showSpentModal, setShowSpentModal] = useState(false);
  const [totalDeposited, setTotalDeposited] = useState<number | null>(null);
  const [isLoadingDeposited, setIsLoadingDeposited] = useState(true);
  const [depositedError, setDepositedError] = useState<string | null>(null);
  const [showDepositedModal, setShowDepositedModal] = useState(false);
  const [unreadTickets, setUnreadTickets] = useState<number | null>(null);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [showTicketsModal, setShowTicketsModal] = useState(false);

  const { currentUser } = useAuth();

  // Fetch purchases data from Firestore
  useEffect(() => {
    const fetchPurchases = async () => {
      if (!currentUser) {
        setTotalPurchases(null);
        setIsLoadingPurchases(false);
        return;
      }

      try {
        setIsLoadingPurchases(true);
        setPurchasesError(null);

        // Calculate date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysTimestamp = Timestamp.fromDate(thirtyDaysAgo);

        let totalCount = 0;
        let totalSpentAmount = 0;

        // Query orders collection
        const ordersQuery = query(
          collection(db, 'orders'),
          where('uid', '==', currentUser.uid),
          where('createdAt', '>=', thirtyDaysTimestamp)
        );
        const ordersSnapshot = await getDocs(ordersQuery);

        ordersSnapshot.forEach((doc) => {
          const data = doc.data();
          const type = data.type;
          const status = data.status;

          // Filter by status based on type
          if (type === 'Short' && status === 'Completed') {
            totalCount++;
            totalSpentAmount += parseFloat(data.price) || 0;
          } else if ((type === 'Middle' || type === 'Long' || type === 'Empty Simcard') && status !== 'Cancelled') {
            totalCount++;
            totalSpentAmount += parseFloat(data.price) || 0;
          }
        });

        // Query proxyOrders collection
        const proxyOrdersQuery = query(
          collection(db, 'proxyOrders'),
          where('uid', '==', currentUser.uid),
          where('createdAt', '>=', thirtyDaysTimestamp)
        );
        const proxyOrdersSnapshot = await getDocs(proxyOrdersQuery);
        totalCount += proxyOrdersSnapshot.size;

        proxyOrdersSnapshot.forEach((doc) => {
          const data = doc.data();
          totalSpentAmount += parseFloat(data.price) || 0;
        });

        // Query vccOrders collection
        const vccOrdersQuery = query(
          collection(db, 'vccOrders'),
          where('uid', '==', currentUser.uid),
          where('createdAt', '>=', thirtyDaysTimestamp)
        );
        const vccOrdersSnapshot = await getDocs(vccOrdersQuery);
        totalCount += vccOrdersSnapshot.size;

        vccOrdersSnapshot.forEach((doc) => {
          const data = doc.data();
          totalSpentAmount += parseFloat(data.price) || 0;
        });

        // Query recharges collection
        const rechargesQuery = query(
          collection(db, 'recharges'),
          where('uid', '==', currentUser.uid),
          where('createdAt', '>=', thirtyDaysTimestamp),
          where('status', '==', 'Completed')
        );
        const rechargesSnapshot = await getDocs(rechargesQuery);

        let totalDepositedAmount = 0;
        rechargesSnapshot.forEach((doc) => {
          const data = doc.data();
          totalDepositedAmount += parseFloat(data.amount) || 0;
        });

        // Query tickets collection
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('uid', '==', currentUser.uid)
        );
        const ticketsSnapshot = await getDocs(ticketsQuery);

        console.log('Total tickets found:', ticketsSnapshot.size);
        let unreadTicketsCount = 0;
        ticketsSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Ticket data:', doc.id, data);
          const responses = data.response || [];
          console.log('Responses array:', responses);

          // Check if responses array is not empty
          if (responses.length > 0) {
            // Get the last response object
            const lastResponse = responses[responses.length - 1];
            console.log('Last response:', lastResponse);
            console.log('readUser value:', lastResponse.readUser);

            // Check if readUser is false in the last response
            if (lastResponse.readUser === false) {
              console.log('Found unread ticket:', doc.id);
              unreadTicketsCount++;
            }
          } else {
            console.log('No responses for ticket:', doc.id);
          }
        });
        console.log('Total unread tickets count:', unreadTicketsCount);

        setTotalPurchases(totalCount);
        setTotalSpent(totalSpentAmount);
        setTotalDeposited(totalDepositedAmount);
        setUnreadTickets(unreadTicketsCount);
      } catch (error: any) {
        console.error('Error fetching purchases:', error);
        let errorMessage = 'Failed to load purchases data';

        if (error.code === 'permission-denied') {
          errorMessage = 'Access denied to purchases information';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Service temporarily unavailable, try again later';
        } else if (error.code === 'unauthenticated') {
          errorMessage = 'Authentication required';
        }

        setPurchasesError(errorMessage);
        setShowPurchasesModal(true);
        setTotalPurchases(null);
        setSpentError(errorMessage);
        setShowSpentModal(true);
        setTotalSpent(null);
        setDepositedError(errorMessage);
        setShowDepositedModal(true);
        setTotalDeposited(null);
        setTicketsError(errorMessage);
        setShowTicketsModal(true);
        setUnreadTickets(null);
      } finally {
        setIsLoadingPurchases(false);
        setIsLoadingSpent(false);
        setIsLoadingDeposited(false);
        setIsLoadingTickets(false);
      }
    };

    fetchPurchases();
  }, [currentUser]);

  // Page load animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Animated counter effect
  useEffect(() => {
    if (isLoaded && totalPurchases !== null && totalSpent !== null && totalDeposited !== null && unreadTickets !== null) {
      // Reset animated counters when values change
      setAnimatedPurchases(0);
      setAnimatedSpent(0);
      setAnimatedDeposit(0);
      setAnimatedTickets(0);

      // Animate purchases counter
      const purchasesTimer = setInterval(() => {
        setAnimatedPurchases(prev => {
          if (prev < totalPurchases) {
            return prev + 1;
          }
          clearInterval(purchasesTimer);
          return totalPurchases;
        });
      }, 150);

      // Animate spending counter
      const spentTimer = setInterval(() => {
        setAnimatedSpent(prev => {
          if (prev < totalSpent) {
            const increment = totalSpent / 20;
            return Math.min(prev + increment, totalSpent);
          }
          clearInterval(spentTimer);
          return totalSpent;
        });
      }, 100);

      // Animate deposit counter
      const depositTimer = setInterval(() => {
        setAnimatedDeposit(prev => {
          if (prev < totalDeposited) {
            const increment = totalDeposited / 20;
            return Math.min(prev + increment, totalDeposited);
          }
          clearInterval(depositTimer);
          return totalDeposited;
        });
      }, 100);

      // Animate tickets counter
      const ticketsTimer = setInterval(() => {
        setAnimatedTickets(prev => {
          if (prev < unreadTickets) {
            return prev + 1;
          }
          clearInterval(ticketsTimer);
          return unreadTickets;
        });
      }, 200);

      return () => {
        clearInterval(purchasesTimer);
        clearInterval(spentTimer);
        clearInterval(depositTimer);
        clearInterval(ticketsTimer);
      };
    }
  }, [isLoaded, totalPurchases, totalSpent, totalDeposited, unreadTickets]);


  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const userStats = {
    purchases: {
      short: 4,
      middle: 7,
      long: 1,
      emptysim: 3,
      prepaid: 2
    },
    totalSpent: 8945.67,
    totalDeposit: 12450.00,
    totalTickets: 27,
    monthlyIncrease: 15.2,
    spendingIncrease: 8.7,
    depositIncrease: 12.3,
    ticketsIncrease: 18.9
  };

  const handlePurchasesModalClose = () => {
    setShowPurchasesModal(false);
  };

  const handleSpentModalClose = () => {
    setShowSpentModal(false);
  };

  const handleDepositedModalClose = () => {
    setShowDepositedModal(false);
  };

  const handleTicketsModalClose = () => {
    setShowTicketsModal(false);
  };

  const formatSpentAmount = (amount: number | null) => {
    if (amount === null) return '-';

    // Check if the number is an integer
    if (Number.isInteger(amount)) {
      return `$${amount.toLocaleString('en-US')}`;
    } else {
      // Show up to 2 decimal places, removing trailing zeros
      return `$${amount.toFixed(2).replace(/\.00$/, '')}`;
    }
  };

  const formatDepositedAmount = (amount: number | null) => {
    if (amount === null) return '-';

    // Check if the number is an integer
    if (Number.isInteger(amount)) {
      return `$${amount.toLocaleString('en-US')}`;
    } else {
      // Show up to 2 decimal places, removing trailing zeros
      return `$${amount.toFixed(2).replace(/\.00$/, '')}`;
    }
  };

  const renderPurchasesContent = () => {
    if (isLoadingPurchases) {
      return (
        <div className="flex justify-center">
          <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }

    if (purchasesError) {
      return '-';
    }

    return animatedPurchases;
  };

  const renderSpentContent = () => {
    if (isLoadingSpent) {
      return (
        <div className="flex justify-center">
          <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }

    if (spentError) {
      return '-';
    }

    return formatSpentAmount(animatedSpent);
  };

  const renderDepositedContent = () => {
    if (isLoadingDeposited) {
      return (
        <div className="flex justify-center">
          <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }

    if (depositedError) {
      return '-';
    }

    return formatDepositedAmount(animatedDeposit);
  };

  const renderTicketsContent = () => {
    if (isLoadingTickets) {
      return (
        <div className="flex justify-center">
          <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }

    if (ticketsError) {
      return '-';
    }

    return unreadTickets || 0;
  };

  const newsItems = [
    {
      id: 1,
      title: "Get 1 free number",
      description: "Deposit $10 or more through Crypto or Payeer",
      time: "2 hours ago",
      type: "product",
      urgent: true
    },
    {
      id: 2,
      title: "Extended Middle Term Duration",
      description: "Get middle term numbers for more than just 1 day",
      time: "5 hours ago",
      type: "promo",
      urgent: false
    },
    {
      id: 3,
      title: "Reusable Option Now Available",
      description: "Short term numbers can now be reused",
      time: "1 day ago",
      type: "product",
      urgent: false
    },
    {
      id: 4,
      title: "API Available",
      description: "Integrate with our service using our new API endpoints",
      time: "2 days ago",
      type: "system",
      urgent: false
    }
  ];

  const newsGroups = [];
  for (let i = 0; i < newsItems.length; i += 2) {
    newsGroups.push(newsItems.slice(i, i + 2));
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % newsGroups.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + newsGroups.length) % newsGroups.length);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getNewsIcon = (type: string) => {
    switch (type) {
      case 'product':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'promo':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

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
      
    <DashboardLayout currentPath="/dashboard">
      

      <div className={`space-y-6 transition-all duration-1000 ${isLoaded ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
        {/* Combined Welcome & Stats Section */}
        <div 
          className="group rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden hover:shadow-3xl transition-all duration-500 hover:scale-[1.01] cursor-pointer"
          style={{
            backgroundColor: '#1e293b',
            animationDelay: '200ms',
            animation: isLoaded ? 'slideInFromTop 0.8s ease-out forwards' : 'none'
          }}
        >
          
          
          <div className="relative z-10 space-y-8">
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="group-hover:transform group-hover:translate-x-2 transition-transform duration-500 text-center sm:text-left flex-1 sm:flex-none">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent mb-3 group-hover:from-cyan-300 group-hover:to-blue-300 transition-all duration-500">
                  {getGreeting()}! 👋
                </h1>
                <p className="text-slate-300 text-md group-hover:text-slate-200 transition-colors duration-300">
                  Welcome to your Major Phones dashboard
                </p>
              </div>
              <div className="hidden sm:block mt-6 sm:mt-0 text-right group-hover:transform group-hover:-translate-x-2 transition-transform duration-500">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 group-hover:bg-slate-700/50 group-hover:border-slate-600/50 transition-all duration-300">
                  <p className="text-sm text-slate-400 mb-1">Today</p>
                  <p className="text-md font-bold text-white">
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mt-2"></div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6" style={{ marginTop: '1rem' }}>
          {/* Total Tickets */}
          <div
            className="group/stats bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 rounded-2xl shadow-xl p-3 text-white relative overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-104 cursor-pointer border border-orange-500/20"
          >

            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3 group-hover/stats:transform group-hover/stats:translate-y-1 transition-transform duration-300">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover/stats:bg-white/30 group-hover/stats:scale-110 transition-all duration-300 shadow-lg">
                  <svg className="w-6 h-6 group-hover/stats:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
              </div>

              <div className="text-center group-hover/stats:transform group-hover/stats:translate-x-2 transition-transform duration-500">
                <p className="text-orange-100 text-sm font-semibold mb-2 uppercase tracking-wider">Tickets</p>
                <p className="text-1xl font-black mb-1 bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent group-hover/stats:scale-110 transition-transform duration-300">{renderTicketsContent()}</p>
                <p className="text-orange-200 text-sm font-medium">Unread</p>
              </div>
            </div>

            {/* Hover gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>

          {/* Total Purchases */}
          <div
            className="group/stats bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 rounded-2xl shadow-xl p-3 text-white relative overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-104 cursor-pointer border border-emerald-500/20"
          >
            
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3 group-hover/stats:transform group-hover/stats:translate-y-1 transition-transform duration-300">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover/stats:bg-white/30 group-hover/stats:scale-110 transition-all duration-300 shadow-lg">
                  <svg className="w-6 h-6 group-hover/stats:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              
              <div className="text-center group-hover/stats:transform group-hover/stats:translate-x-2 transition-transform duration-500">
                <p className="text-emerald-100 text-sm font-semibold mb-1 uppercase tracking-wider">Purchases</p>
                <div className="mb-1">
                  <p className="text-1xl font-black mb-1 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent group-hover/stats:scale-110 transition-transform duration-300">{renderPurchasesContent()}</p>
                </div>
                <p className="text-emerald-200 text-sm font-medium">Last 30 days</p>
              </div>
            </div>
            
            {/* Hover gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>

          {/* Total Spent */}
          <div 
            className="group/stats bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-3 text-white relative overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-104 cursor-pointer border border-blue-500/20"
          >

            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3 group-hover/stats:transform group-hover/stats:translate-y-1 transition-transform duration-300">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover/stats:bg-white/30 group-hover/stats:scale-110 transition-all duration-300 shadow-lg">
                  <svg className="w-6 h-6 group-hover/stats:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              
              <div className="text-center group-hover/stats:transform group-hover/stats:translate-x-2 transition-transform duration-500">
                <p className="text-blue-100 text-sm font-semibold mb-2 uppercase tracking-wider">Total Spent</p>
                <p className="text-1xl font-black mb-1 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent group-hover/stats:scale-110 transition-transform duration-300">{renderSpentContent()}</p>
                <p className="text-blue-200 text-sm font-medium">Last 30 days</p>
              </div>
            </div>
            
            {/* Hover gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>

          {/* Total Deposit */}
          <div 
            className="group/stats bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-2xl shadow-xl p-3 text-white relative overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-104 cursor-pointer border border-purple-500/20"
          >

            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3 group-hover/stats:transform group-hover/stats:translate-y-1 transition-transform duration-300">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover/stats:bg-white/30 group-hover/stats:scale-110 transition-all duration-300 shadow-lg">
                  <svg className="w-6 h-6 group-hover/stats:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="text-center group-hover/stats:transform group-hover/stats:translate-x-2 transition-transform duration-500">
                <p className="text-purple-100 text-sm font-semibold mb-2 uppercase tracking-wider">Deposited</p>
                <p className="text-1xl font-black mb-1 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent group-hover/stats:scale-110 transition-transform duration-300">{renderDepositedContent()}</p>
                <p className="text-purple-200 text-sm font-medium">Last 30 days</p>
              </div>
            </div>
            
            {/* Hover gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>

            </div>
          </div>
        </div>

        {/* News & Updates Section */}
        <div 
          className="group rounded-3xl shadow-2xl border border-slate-600/50 p-6 relative overflow-hidden hover:shadow-3xl transition-all duration-500"
          style={{
            backgroundColor: '#1e293b',
            animationDelay: '800ms',
            animation: isLoaded ? 'slideInFromBottom 0.8s ease-out forwards' : 'none'
          }}
        >
          
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8 group-hover:transform group-hover:translate-y-1 transition-transform duration-300">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-blue-300 transition-all duration-500">Latest News & Updates</h2>
              </div>
            </div>

            {/* News Slider with Navigation */}
            <div className="relative">
              {/* Navigation Arrows */}
              <button 
                onClick={prevSlide}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 z-20 w-8 h-8 bg-slate-700/80 hover:bg-slate-600/80 rounded-full border border-slate-600/50 hover:border-slate-500/50 transition-all duration-300 flex items-center justify-center text-white hover:scale-110 backdrop-blur-sm shadow-lg"
                disabled={newsGroups.length <= 1}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button 
                onClick={nextSlide}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 z-20 w-10 h-10 bg-slate-700/80 hover:bg-slate-600/80 rounded-full border border-slate-600/50 hover:border-slate-500/50 transition-all duration-300 flex items-center justify-center text-white hover:scale-110 backdrop-blur-sm shadow-lg"
                disabled={newsGroups.length <= 1}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Slider Container */}
              <div className="overflow-hidden rounded-2xl">
                <div 
                  className="flex transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(-${currentSlide * 100}%)`
                  }}
                >
                  {newsGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="w-full flex-none">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                        {group.map((item, itemIndex) => (
                          <div 
                            key={item.id}
                            className={`group/item p-4 rounded-2xl border transition-all duration-300 hover:shadow-xl cursor-pointer hover:scale-[1] relative overflow-hidden ${
                              item.urgent 
                                ? 'bg-gradient-to-r from-red-900/20 to-orange-900/20 border-red-500/30 hover:from-red-800/30 hover:to-orange-800/30 hover:border-red-400/50' 
                                : 'bg-slate-800/50 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50'
                            }`}
                            style={{
                              animationDelay: `${itemIndex * 100}ms`
                            }}
                          >
                            {/* Item background glow */}
                            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 ${
                              item.urgent ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10' : 'bg-gradient-to-r from-slate-600/10 to-slate-500/10'
                            }`}></div>
                            
                            <div className="relative z-10">
                              <div className="flex items-start space-x-3 mb-3">
                                <div className="p-2.5 rounded-lg backdrop-blur-sm transition-all duration-300 group-hover/item:scale-110 shadow-lg flex-none bg-slate-700/50 border border-slate-600/50">
                                  <img src={MajorPhonesFavIc} alt="Major Phones" className="w-5 h-5" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-left font-bold text-white text-sm group-hover/item:text-orange-200 transition-colors duration-300 leading-tight pr-2">{item.title}</h3>
                                    {item.urgent && (
                                      <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full animate-pulse shadow-lg flex-none">
                                        CHECK
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-left text-slate-300 text-xs mb-3 group-hover/item:text-slate-200 transition-colors duration-300 leading-relaxed line-clamp-2">{item.description}</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                                      <p className="text-slate-400 text-xs font-medium">{item.time}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Slide Indicators */}
              <div className="flex justify-center space-x-2 mt-4">
                {newsGroups.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'bg-blue-400 scale-125' 
                        : 'bg-slate-600 opacity-50 hover:opacity-75 hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
      </div>

      {/* Purchases Error Modal */}
      {showPurchasesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Purchases Error</h3>
              <p className="text-blue-200 mb-4">{purchasesError}</p>
              <button
                onClick={handlePurchasesModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spent Error Modal */}
      {showSpentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Total Spent Error</h3>
              <p className="text-blue-200 mb-4">{spentError}</p>
              <button
                onClick={handleSpentModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposited Error Modal */}
      {showDepositedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Deposited Error</h3>
              <p className="text-blue-200 mb-4">{depositedError}</p>
              <button
                onClick={handleDepositedModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Error Modal */}
      {showTicketsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Tickets Error</h3>
              <p className="text-blue-200 mb-4">{ticketsError}</p>
              <button
                onClick={handleTicketsModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    </>
  );
};

export default Dashboard;