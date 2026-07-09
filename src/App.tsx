import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

import { ProtectedRoute } from './components/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';

import { HomePage } from './pages/HomePage';

import { UsersPage } from './pages/UsersPage';

import { ServicesPage } from './pages/ServicesPage';

import { OrdersPage } from './pages/OrdersPage';

import { MessagesPage } from './pages/MessagesPage';

import { LocationsPage } from './pages/LocationsPage';

import { TimeSlotsPage } from './pages/TimeSlotsPage';

import { ClothTypesPage } from './pages/ClothTypesPage';

import { ReferralPage } from './pages/ReferralPage';

import { ReferralAnalyticsPage } from './pages/ReferralAnalyticsPage';

import { DeleteRequestsPage } from './pages/DeleteRequestsPage';

import './App.css';



import { ThemeProvider } from './context/ThemeContext';



function App() {

  return (

    <Router>

      <ThemeProvider>

        <AuthProvider>

          <Routes>

            <Route path="/login" element={<LoginPage />} />

            

            <Route

              path="/home"

              element={

                <ProtectedRoute>

                  <HomePage />

                </ProtectedRoute>

              }

            />

            

            <Route

              path="/users"

              element={

                <ProtectedRoute>

                  <UsersPage />

                </ProtectedRoute>

              }

            />

            

            <Route

              path="/services"

              element={

                <ProtectedRoute>

                  <ServicesPage />

                </ProtectedRoute>

              }

            />



            <Route

              path="/cloth-types"

              element={

                <ProtectedRoute>

                  <ClothTypesPage />

                </ProtectedRoute>

              }

            />



            <Route

              path="/orders"

              element={

                <ProtectedRoute>

                  <OrdersPage />

                </ProtectedRoute>

              }

            />



            <Route

              path="/locations"

              element={

                <ProtectedRoute>

                  <LocationsPage />

                </ProtectedRoute>

              }

            />



            <Route

              path="/messages"

              element={

                <ProtectedRoute>

                  <MessagesPage />

                </ProtectedRoute>

              }

            />

            

            <Route

              path="/time-slots"

              element={

                <ProtectedRoute>

                  <TimeSlotsPage />

                </ProtectedRoute>

              }

            />



            <Route
              path="/referrals"
              element={
                <ProtectedRoute>
                  <ReferralPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/referrals/analytics"
              element={
                <ProtectedRoute>
                  <ReferralAnalyticsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/delete-requests"
              element={
                <ProtectedRoute>
                  <DeleteRequestsPage />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/login" replace />} />

          </Routes>

        </AuthProvider>

      </ThemeProvider>

    </Router>

  );

}



export default App;

