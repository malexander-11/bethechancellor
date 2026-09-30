import { useEffect, useRef } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ModeProvider, useMode } from './journey/mode';
import { BudgetProvider } from './state/budget';
import { AboutPage } from './pages/About';
import { BudgetDayPage } from './pages/BudgetDay';
import { DeliverPage } from './pages/Deliver';
import { FinetunePage } from './pages/Finetune';
import { MethodologyPage } from './pages/Methodology';
import { OutlookPage } from './pages/Outlook';
import { PMPage } from './pages/PM';
import { ReviewPage } from './pages/Review';
import { StartPage } from './pages/Start';
import { SiteFooter } from './components/SiteFooter';

/** Old and shorthand paths redirect into the journey with the budget's query string intact. */
function RedirectKeepingQuery({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}

/**
 * The desk's old addresses (Phase 26, ADR-0027): its spending screen, and the letters' and the
 * recommendations' screens before it, open step 4's spending; anything else opens its tax screen.
 * The stage guard does the rest: a game lands on step 4, a link with no game on the briefing.
 */
function DeskRedirect() {
  const { tab } = useParams();
  const spending = tab === 'spending' || tab === 'policies' || tab === 'recommendations';
  return <RedirectKeepingQuery to={spending ? '/finetune/spending' : '/finetune/tax'} />;
}

/**
 * A screen change in a single-page app moves nothing by itself: the reader is left wherever they
 * were scrolled, and a screen reader hears nothing at all. So on every change of path the page
 * goes back to the top and focus lands on the main region, whose new title the guide has just
 * set. A link to a part of a page, such as a line of the About page's contents (ADR-0033), lands
 * on that part instead, and focus with it, so the next Tab carries on from there. Not on first
 * paint: the browser has placed focus already, and taking it would be rude.
 */
function RouteFocus() {
  const { pathname, hash } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (first.current) {
      first.current = false;
      target?.scrollIntoView?.();
      return;
    }
    if (target) {
      target.scrollIntoView?.();
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      return;
    }
    document.documentElement.scrollTop = 0;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname, hash]);
  return null;
}

/**
 * The brass plate: the name, which is the way home, and nothing else (ADR-0032). The journey
 * itself is not in the header: one road, entered at the start and walked by the button at the
 * foot of each page. The page about the game and its sources is the footer's one link (ADR-0033),
 * where a reader looks for it once they want it, not above the story.
 */
function Shell() {
  const mode = useMode();
  // The cover fills the screen, its invitation centred between the header and the footer
  // (ADR-0033, revised); every other screen is as long as what it holds.
  const cover = useLocation().pathname === '/';
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to the step
      </a>
      <RouteFocus />
      <div className={cover ? 'shell shell--cover' : 'shell'}>
        <header className="site-header">
          <div className="site-header__inner">
            <NavLink to="/" className="brand" end>
              What’s your Budget?
            </NavLink>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="page" data-mode={mode}>
          <Routes>
            <Route path="/" element={<StartPage />} />
            <Route path="/outlook" element={<OutlookPage />} />
            <Route path="/assumptions" element={<RedirectKeepingQuery to="/outlook" />} />
            <Route path="/pm" element={<PMPage />} />
            <Route path="/budget" element={<RedirectKeepingQuery to="/finetune/tax" />} />
            {/* The flagship screens; the desk's old addresses, below, open step 4. */}
            <Route path="/budget/deliver" element={<DeliverPage />} />
            <Route path="/budget/deliver/:n" element={<DeliverPage />} />
            {/* Paying for it became fine-tuning tax and spending (Phase 24). */}
            <Route path="/budget/afford" element={<RedirectKeepingQuery to="/finetune/tax" />} />
            <Route path="/budget/:tab" element={<DeskRedirect />} />
            <Route path="/finetune" element={<RedirectKeepingQuery to="/finetune/tax" />} />
            <Route path="/finetune/:side" element={<FinetunePage />} />
            <Route
              path="/recommendations"
              element={<RedirectKeepingQuery to="/finetune/spending" />}
            />
            {/*
            The forecast that arrived later, the compromises and the add-ons retired in Phase 24:
            their old addresses open the review, and the stage guard sends an early game back.
          */}
            <Route path="/forecast" element={<RedirectKeepingQuery to="/review" />} />
            <Route path="/compromise" element={<RedirectKeepingQuery to="/review" />} />
            <Route path="/compromise/:n" element={<RedirectKeepingQuery to="/review" />} />
            <Route path="/rabbit" element={<RedirectKeepingQuery to="/review" />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/budget-day" element={<BudgetDayPage />} />
            <Route path="/b" element={<RedirectKeepingQuery to="/finetune/tax" />} />
            <Route path="/methodology" element={<MethodologyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<RedirectKeepingQuery to="/" />} />
          </Routes>
          <SiteFooter />
        </main>
      </div>
    </>
  );
}

export function App() {
  return (
    <BudgetProvider>
      {/* Basic and advanced (Phase 27): one preference, read by the screens that trim their ideas. */}
      <ModeProvider>
        <Shell />
      </ModeProvider>
    </BudgetProvider>
  );
}
