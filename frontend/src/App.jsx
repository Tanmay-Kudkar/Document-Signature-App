// App routes
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Sign from './pages/Sign';
import Layout from './components/Layout';
import Home from './pages/Home';

function App() {
  return (
    <div className="min-h-screen w-full flex flex-col font-sans text-gray-800 animate-page-fade overflow-x-hidden">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sign" element={<Sign />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
