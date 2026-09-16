import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { BeatsProvider } from './journey/beats';
import { BudgetProvider } from './state/budget';
import { AboutPage } from './pages/About';
import { BudgetPage } from './pages/Budget';
import { BudgetDayPage } from './pages/BudgetDay';
import { MethodologyPage } from './pages/Methodology';
import { OutlookPage } from './pages/Outlook';
import { PMPage } from './pages/PM';
import { StartPage } from './pages/Start';
import { Disclaimer } from './components/Disclaimer';

/** Old and shorthand paths redirect into the journey with the budget's query string intact. */
function RedirectKeepingQuery({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}

export function App() {
  return (
    <BudgetProvider>
      {/*
        Beat progress lives above the routes, because /budget/taxes and /budget/spending are two
        routes but one journey step: keeping it in the page would replay the adviser's hand-off
        every time you switched tab.
      */}
      <BeatsProvider>
        <header className="site-header">
          <div className="site-header__inner">
            <NavLink to="/" className="brand">
              Be the Chancellor
              <small>UK fiscal trade-offs, every number sourced</small>
            </NavLink>
            <nav className="site-nav" aria-label="Main">
              <NavLink to="/" end>
                Start
              </NavLink>
              <NavLink to="/budget/taxes">Your Budget</NavLink>
              <NavLink to="/methodology">Methodology</NavLink>
              <NavLink to="/about">About &amp; sources</NavLink>
            </nav>
          </div>
        </header>
        <main className="page">
          <Routes>
            <Route path="/" element={<StartPage />} />
            <Route path="/outlook" element={<OutlookPage />} />
            <Route path="/assumptions" element={<RedirectKeepingQuery to="/outlook" />} />
            <Route path="/pm" element={<PMPage />} />
            <Route path="/budget" element={<RedirectKeepingQuery to="/budget/taxes" />} />
            <Route path="/budget/:tab" element={<BudgetPage />} />
            <Route
              path="/recommendations"
              element={<RedirectKeepingQuery to="/budget/policies" />}
            />
            <Route path="/budget-day" element={<BudgetDayPage />} />
            <Route path="/b" element={<RedirectKeepingQuery to="/budget/taxes" />} />
            <Route path="/methodology" element={<MethodologyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<RedirectKeepingQuery to="/" />} />
          </Routes>
          <Disclaimer />
        </main>
      </BeatsProvider>
    </BudgetProvider>
  );
}
