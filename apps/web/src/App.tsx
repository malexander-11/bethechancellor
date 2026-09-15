import { NavLink, Route, Routes } from 'react-router-dom';
import { BudgetProvider } from './state/budget';
import { AboutPage } from './pages/About';
import { BudgetPage } from './pages/Budget';
import { MethodologyPage } from './pages/Methodology';
import { Disclaimer } from './components/Disclaimer';

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
              Your Budget
            </NavLink>
            <NavLink to="/methodology">Methodology</NavLink>
            <NavLink to="/about">About &amp; sources</NavLink>
          </nav>
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<BudgetPage />} />
          <Route path="/b" element={<BudgetPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<BudgetPage />} />
        </Routes>
        <Disclaimer />
      </main>
    </BudgetProvider>
  );
}
