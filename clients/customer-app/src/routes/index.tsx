// src/routes/index.tsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/auth/loginPage';
import RegisterPage from '../pages/auth/registerPage';
import HomePage from '../pages/home';
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/customer/login" element={<LoginPage />} />
      
      <Route path="/customer/register" element={<RegisterPage />} />
      <Route path="/customer/home" element={<HomePage />} /> 

    </Routes>
  );
};

export default AppRoutes;