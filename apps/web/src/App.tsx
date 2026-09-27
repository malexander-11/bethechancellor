import { useEffect, useRef } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { WorkingsProvider, useWorkingsSwitch } from './journey/workings';
import { BudgetProvider } from './state/budget';
import { AboutPage } from './pages/About';
import { BudgetPage } from './pages/Budget';
import { BudgetDayPage } from './pages/BudgetDay';
import { CompromisePage } from './pages/Compromise';
import { DeliverPage } from './pages/Deliver';
import { FinetunePage } from './pages/Finetune';
import { ForecastPage } from './pages/Forecast';
import { MethodologyPage } from './pages/Methodology';
import { OutlookPage } from './pages/Outlook';
import { PMPage } from './pages/PM';
import { RabbitPage } from './pages/Rabbit';
import { ReviewPage } from './pages/Review';
import { StartPage } from './pages/Start';
import { Disclaimer } from './components/Disclaimer';

/** Old and shorthand paths redirect into the journey with the budget's query string intact. */
function RedirectKeepingQuery({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}

/**
 * A screen change in a single-page app moves nothing by itself: the reader is left wherever they
 * were scrolled, and a screen reader hears nothing at all. So on every change of path the page
 * goes back to the top and focus lands on the main region, whose new title the guide has just
 * set. Not on first paint: the browser has placed focus already, and taking it would be rude.
 */
function RouteFocus() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.documentElement.scrollTop = 0;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

/**
 * The brass plate: the name (which is the way home) and the two reference pages. The journey
 * itself is not in the header: one road, entered at the start and walked by the button at the
 * foot of each page. The utilities (the workings switch, every lever, the sources) sit in the
 * footer, where a reader looks for them, not above the story.
 */
function Shell() {
  const { workings } = useWorkingsSwitch();
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to the step
      </a>
      <RouteFocus />
      <header className="site-header">
        <div className="site-header__inner">
          <NavLink to="/" className="brand" end>
            Be the Chancellor
          </NavLink>
          <nav className="site-nav" aria-label="Main">
            <NavLink to="/methodology">Methodology</NavLink>
            <NavLink to="/about">About &amp; sources</NavLink>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="page" data-workings={workings ? 'on' : 'off'}>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/outlook" element={<OutlookPage />} />
          <Route path="/assumptions" element={<RedirectKeepingQuery to="/outlook" />} />
          <Route path="/pm" element={<PMPage />} />
          <Route path="/budget" element={<RedirectKeepingQuery to="/budget/deliver" />} />
          {/* The flagship screens of the package; the desk's two screens catch everything else. */}
          <Route path="/budget/deliver" element={<DeliverPage />} />
          <Route path="/budget/deliver/:n" element={<DeliverPage />} />
          {/* Paying for it became fine-tuning tax and spending (Phase 24). */}
          <Route path="/budget/afford" element={<RedirectKeepingQuery to="/finetune/tax" />} />
          <Route path="/budget/:tab" element={<BudgetPage />} />
          <Route path="/finetune" element={<RedirectKeepingQuery to="/finetune/tax" />} />
          <Route path="/finetune/:side" element={<FinetunePage />} />
          <Route path="/recommendations" element={<RedirectKeepingQuery to="/budget/spending" />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/compromise" element={<CompromisePage />} />
          <Route path="/compromise/:n" element={<CompromisePage />} />
          <Route path="/rabbit" element={<RabbitPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/budget-day" element={<BudgetDayPage />} />
          <Route path="/b" element={<RedirectKeepingQuery to="/budget/taxes" />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<RedirectKeepingQuery to="/" />} />
        </Routes>
        <Disclaimer />
      </main>
    </>
  );
}

export function App() {
  return (
    <BudgetProvider>
      {/*
        The workings switch lives above the routes: one preference for the whole journey, read by
        every citation on every page.
      */}
      <WorkingsProvider>
        <Shell />
      </WorkingsProvider>
    </BudgetProvider>
  );
}
