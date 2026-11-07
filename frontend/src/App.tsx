import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { BottomNavigation } from './components/layout/BottomNavigation';

// Public & Farmer Pages
import { HomePage } from './pages/HomePage';
import { ReportAnimalPage } from './pages/report/ReportAnimalPage';
import { ReportVoicePage } from './pages/report/ReportVoicePage';
import { ReportProcessingPage } from './pages/report/ReportProcessingPage';
import { ReportReviewPage } from './pages/report/ReportReviewPage';
import { ReportUrgencyPage } from './pages/report/ReportUrgencyPage';
import { ReportLocationPage } from './pages/report/ReportLocationPage';
import { ReportConfirmPage } from './pages/report/ReportConfirmPage';
import { CaseSuccessPage } from './pages/report/CaseSuccessPage';
import { TrackCasePage } from './pages/TrackCasePage';

// Operator Console
import { OperatorLayout } from './components/layout/OperatorLayout';
import { OperatorLoginPage } from './pages/operator/OperatorLoginPage';
import { DashboardOverviewPage } from './pages/operator/DashboardOverviewPage';
import { CaseQueuePage } from './pages/operator/CaseQueuePage';
import { CaseDetailPage } from './pages/operator/CaseDetailPage';
import { VetDirectoryPage } from './pages/operator/VetDirectoryPage';
import { ReportsPage } from './pages/operator/ReportsPage';
import { SettingsPage } from './pages/operator/SettingsPage';

const PublicLayout: React.FC = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-1 pb-16 md:pb-0">
      <Outlet />
    </main>
    <Footer />
    <BottomNavigation />
  </div>
);

export function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          {/* Public & Farmer Flow with Standard Navigation */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/report" element={<ReportAnimalPage />} />
            <Route path="/report/voice" element={<ReportVoicePage />} />
            <Route path="/report/processing" element={<ReportProcessingPage />} />
            <Route path="/report/review" element={<ReportReviewPage />} />
            <Route path="/report/urgency" element={<ReportUrgencyPage />} />
            <Route path="/report/location" element={<ReportLocationPage />} />
            <Route path="/report/confirm" element={<ReportConfirmPage />} />
            <Route path="/case/:id/success" element={<CaseSuccessPage />} />
            <Route path="/track" element={<TrackCasePage />} />
          </Route>

          {/* Operator Login */}
          <Route path="/operator/login" element={<OperatorLoginPage />} />

          {/* Veterinary Console with Dedicated Operations Sidebar */}
          <Route path="/operator" element={<OperatorLayout />}>
            <Route index element={<DashboardOverviewPage />} />
            <Route path="cases" element={<CaseQueuePage />} />
            <Route path="cases/:id" element={<CaseDetailPage />} />
            <Route path="vets" element={<VetDirectoryPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
