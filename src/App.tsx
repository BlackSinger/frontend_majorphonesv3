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
//import SendMessage from './components/SendMessage';
import SendSMS from './components/SendSMS';
import VirtualCard from './components/VirtualCard';
import VccConfig from './components/VccConfig';
import VirtualCardTest from './components/VirtualCardTest';
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
import MajorDashboardLayout from './components/MajorDashboardLayout';
import MajorHistory from './components/MajorHistory';
import MajorHistoryUser from './components/MajorHistoryUser';
import MajorModeration from './components/MajorModeration';
import MajorTransactions from './components/MajorTransactions';
import MajorTransactionsUser from './components/MajorTransactionsUser';
import MajorUser from './components/MajorUser';
import MajorTickets from './components/MajorTickets';
import MajorVccStock from './components/MajorVccStock';
import MajorExtra from './components/MajorExtra';
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
            {/* <Route path="/sendmessage" element={<PrivateRoute><DashboardLayout><SendMessage /></DashboardLayout></PrivateRoute>} /> */}
            <Route path="/send-sms" element={<PrivateRoute><DashboardLayout><SendSMS /></DashboardLayout></PrivateRoute>} />
            <Route path="/virtualcard" element={<PrivateRoute><DashboardLayout><VirtualCard /></DashboardLayout></PrivateRoute>} />
            <Route path="/vcc-config" element={<PrivateRoute><DashboardLayout><VccConfig /></DashboardLayout></PrivateRoute>} />
            <Route path="/test" element={<PrivateRoute><DashboardLayout><VirtualCardTest /></DashboardLayout></PrivateRoute>} />
            <Route path="/proxies" element={<PrivateRoute><DashboardLayout><Proxies /></DashboardLayout></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><DashboardLayout><History /></DashboardLayout></PrivateRoute>} />
            <Route path="/transactions" element={<PrivateRoute><DashboardLayout><Transactions /></DashboardLayout></PrivateRoute>} />
            <Route path="/tickets" element={<PrivateRoute><DashboardLayout><Tickets /></DashboardLayout></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><DashboardLayout><Profile /></DashboardLayout></PrivateRoute>} />
            <Route path="/add-funds" element={<PrivateRoute><DashboardLayout><AddFunds /></DashboardLayout></PrivateRoute>} />
            <Route path="/api" element={<PrivateRoute><DashboardLayout><API /></DashboardLayout></PrivateRoute>} />
            <Route path="/payment-review" element={<PrivateRoute><DashboardLayout><PaymentReview /></DashboardLayout></PrivateRoute>} />
            <Route path="/payment-return" element={<PrivateRoute><DashboardLayout><PaymentReturn /></DashboardLayout></PrivateRoute>} />

            <Route path="/major-history" element={<PrivateRoute><MajorDashboardLayout><MajorHistory /></MajorDashboardLayout></PrivateRoute>} />
            <Route path="/major-user-history" element={<PrivateRoute><MajorDashboardLayout><MajorHistoryUser /></MajorDashboardLayout></PrivateRoute>} />
            <Route path="/major-moderation" element={<PrivateRoute><MajorDashboardLayout><MajorModeration /></MajorDashboardLayout></PrivateRoute>} />
            <Route path="/major-transactions" element={<PrivateRoute><MajorDashboardLayout><MajorTransactions /></MajorDashboardLayout></PrivateRoute>} />
            <Route path="/major-user-transactions" element={<PrivateRoute><MajorDashboardLayout><MajorTransactionsUser /></MajorDashboardLayout></PrivateRoute>} />
            <Route path="/major-user" element={<PrivateRoute><MajorDashboardLayout><MajorUser /></MajorDashboardLayout></PrivateRoute>} />
            <Route path="/major-tickets" element={<PrivateRoute><MajorDashboardLayout><MajorTickets /></MajorDashboardLayout></PrivateRoute>} />
            <Route path="/major-vcc" element={<PrivateRoute><MajorDashboardLayout><MajorVccStock /></MajorDashboardLayout></PrivateRoute>} />
            <Route path="/major-extra" element={<PrivateRoute><MajorDashboardLayout><MajorExtra /></MajorDashboardLayout></PrivateRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
