import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { BudgetProvider } from './state/budget';
import { AboutPage } from './pages/About';
import { AssumptionsPage } from './pages/Assumptions';
import { BudgetPage } from './pages/Budget';
import { BudgetDayPage } from './pages/BudgetDay';
import { MethodologyPage } from './pages/Methodology';
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
          <Route path="/assumptions" element={<AssumptionsPage />} />
          <Route path="/budget" element={<RedirectKeepingQuery to="/budget/taxes" />} />
          <Route path="/budget/:tab" element={<BudgetPage />} />
          <Route path="/budget-day" element={<BudgetDayPage />} />
          <Route path="/b" element={<RedirectKeepingQuery to="/budget/taxes" />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<RedirectKeepingQuery to="/" />} />
        </Routes>
        <Disclaimer />
      </main>
    </BudgetProvider>
  );
}
