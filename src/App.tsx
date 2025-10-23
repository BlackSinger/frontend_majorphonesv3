import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './components/DashboardLayout';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import Account from './components/Account';
import Dashboard from './components/Dashboard';
import ShortNumbers from './components/ShortNumbers';
import Middle from './components/Middle';
import LongTerm from './components/LongTerm';
import EmptySimcard from './components/EmptySimcard';
import SendMessage from './components/SendMessage';
import VirtualCard from './components/VirtualCard';
import Proxies from './components/Proxies';
import History from './components/History';
import Transactions from './components/Transactions';
import Tickets from './components/Tickets';
import Profile from './components/Profile';
import AddFunds from './components/AddFunds';
import API from './components/API';
import PaymentReturn from './components/PaymentReturn';
import PaymentReview from './components/PaymentReview';
/**/
import MajorDashboard from './components/MajorDashboard';
import MajorHistory from './components/MajorHistory';
import MajorHistoryUser from './components/MajorHistoryUser';
import MajorTransactions from './components/MajorTransactions';
import MajorTransactionsUser from './components/MajorTransactionsUser';
import MajorUser from './components/MajorUser';
import MajorExtra from './components/MajorExtra';
import MajorTickets from './components/MajorTickets';
import './App.css';


function App() {
  useEffect(() => {
    document.title = 'Major Phones LLC';
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes - Without DashboardLayout */}
            <Route path="/" element={<SignIn />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/account" element={<Account />} />

            {/* Protected routes - All wrapped with DashboardLayout */}
            <Route path="/dashboard" element={<PrivateRoute><DashboardLayout><Dashboard /></DashboardLayout></PrivateRoute>} />
            <Route path="/short" element={<PrivateRoute><DashboardLayout><ShortNumbers /></DashboardLayout></PrivateRoute>} />
            <Route path="/middle" element={<PrivateRoute><DashboardLayout><Middle /></DashboardLayout></PrivateRoute>} />
            <Route path="/long" element={<PrivateRoute><DashboardLayout><LongTerm /></DashboardLayout></PrivateRoute>} />
            <Route path="/emptysimcard" element={<PrivateRoute><DashboardLayout><EmptySimcard /></DashboardLayout></PrivateRoute>} />
            <Route path="/sendmessage" element={<PrivateRoute><DashboardLayout><SendMessage /></DashboardLayout></PrivateRoute>} />
            <Route path="/virtualcard" element={<PrivateRoute><DashboardLayout><VirtualCard /></DashboardLayout></PrivateRoute>} />
            <Route path="/proxies" element={<PrivateRoute><DashboardLayout><Proxies /></DashboardLayout></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><DashboardLayout><History /></DashboardLayout></PrivateRoute>} />
            <Route path="/transactions" element={<PrivateRoute><DashboardLayout><Transactions /></DashboardLayout></PrivateRoute>} />
            <Route path="/tickets" element={<PrivateRoute><DashboardLayout><Tickets /></DashboardLayout></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><DashboardLayout><Profile /></DashboardLayout></PrivateRoute>} />
            <Route path="/add-funds" element={<PrivateRoute><DashboardLayout><AddFunds /></DashboardLayout></PrivateRoute>} />
            <Route path="/api" element={<PrivateRoute><DashboardLayout><API /></DashboardLayout></PrivateRoute>} />
            <Route path="/payment-review" element={<PrivateRoute><DashboardLayout><PaymentReview /></DashboardLayout></PrivateRoute>} />
            <Route path="/payment-return" element={<PrivateRoute><DashboardLayout><PaymentReturn /></DashboardLayout></PrivateRoute>} />

            {/* Major Admin Routes */}
            <Route path="/major-dashboard" element={<PrivateRoute><DashboardLayout><MajorDashboard /></DashboardLayout></PrivateRoute>} />
            <Route path="/major-history" element={<PrivateRoute><DashboardLayout><MajorHistory /></DashboardLayout></PrivateRoute>} />
            <Route path="/major-user-history" element={<PrivateRoute><DashboardLayout><MajorHistoryUser /></DashboardLayout></PrivateRoute>} />
            <Route path="/major-transactions" element={<PrivateRoute><DashboardLayout><MajorTransactions /></DashboardLayout></PrivateRoute>} />
            <Route path="/major-user-transactions" element={<PrivateRoute><DashboardLayout><MajorTransactionsUser /></DashboardLayout></PrivateRoute>} />
            <Route path="/major-user" element={<PrivateRoute><DashboardLayout><MajorUser /></DashboardLayout></PrivateRoute>} />
            <Route path="/major-tickets" element={<PrivateRoute><DashboardLayout><MajorTickets /></DashboardLayout></PrivateRoute>} />
            <Route path="/major-extra" element={<PrivateRoute><DashboardLayout><MajorExtra /></DashboardLayout></PrivateRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
