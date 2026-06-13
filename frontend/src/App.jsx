// App routes
import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Sign from './pages/Sign';
import SignedSuccess from './pages/SignedSuccess';
import Layout from './components/Layout';
import Home from './pages/Home';

function App() {
  const location = useLocation();

  useEffect(() => {
    switch (location.pathname) {
      case '/':
        document.title = 'DocSign - Sign PDF Documents';
        break;
      case '/dashboard':
        document.title = 'DocSign - Dashboard';
        break;
      case '/login':
        document.title = 'DocSign - Login';
        break;
      case '/signup':
        document.title = 'DocSign - Create Account';
        break;
      case '/sign':
        document.title = 'DocSign - Sign Document';
        break;
      case '/signed':
        document.title = 'DocSign - Document Signed';
        break;
      default:
        document.title = 'DocSign';
    }
  }, [location]);

  return (
    <div className="min-h-screen w-full flex flex-col font-sans text-gray-800 animate-page-fade overflow-x-hidden">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sign" element={<Sign />} />
          <Route path="signed" element={<SignedSuccess />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
