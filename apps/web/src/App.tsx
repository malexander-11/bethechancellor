import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ModeProvider, useMode } from './journey/mode';
import { BudgetProvider } from './state/budget';
import { BudgetDayPage } from './pages/BudgetDay';
import { DeliverPage } from './pages/Deliver';
import { FinetunePage } from './pages/Finetune';
import { OutlookPage } from './pages/Outlook';
import { PMPage } from './pages/PM';
import { ReviewPage } from './pages/Review';
import { SharedPage } from './pages/Shared';
import { StartPage } from './pages/Start';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SiteFooter } from './components/SiteFooter';

// The two reference pages are opened by few players, so their code loads when one is opened.
const AboutPage = lazy(() => import('./pages/About').then((m) => ({ default: m.AboutPage })));
const MethodologyPage = lazy(() =>
  import('./pages/Methodology').then((m) => ({ default: m.MethodologyPage })),
);
// The leaderboard is opened from the cover, the footer and Budget day (ADR-0044), not on the road.
const LeaderboardPage = lazy(() =>
  import('./pages/Leaderboard').then((m) => ({ default: m.LeaderboardPage })),
);
const LeaderboardEntryPage = lazy(() =>
  import('./pages/LeaderboardEntry').then((m) => ({ default: m.LeaderboardEntryPage })),
);

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

/** A link's fragment as an id: decoded where it can be, and as written where it cannot. */
function fragmentId(hash: string): string {
  const raw = hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * A screen change in a single-page app moves nothing by itself: the reader is left wherever they
 * were scrolled, and a screen reader hears nothing at all. So on every change of path the page
 * goes back to the top and focus lands on the main region, whose new title the guide has just
 * set. A link to a part of a page, such as a line of the About page's contents (ADR-0033), lands
 * on that part instead, and focus with it, so the next Tab carries on from there; on a page whose
 * code is still loading, it lands there once the part is drawn. Not on first paint: the browser has
 * placed focus already, and taking it would be rude.
 */
function RouteFocus() {
  const { pathname, hash } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    const firstPaint = first.current;
    first.current = false;
    const land = (target: HTMLElement | null) => {
      if (firstPaint) {
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
    };
    const id = hash ? fragmentId(hash) : null;
    const target = id ? document.getElementById(id) : null;
    const main = document.getElementById('main');
    if (!id || target || !main) {
      land(target);
      return;
    }
    // Not drawn yet: start at the top of the screen, and move on to the part when it arrives.
    land(null);
    const observer = new MutationObserver(() => {
      const found = document.getElementById(id);
      if (!found) return;
      observer.disconnect();
      land(found);
    });
    observer.observe(main, { childList: true, subtree: true });
    const giveUp = window.setTimeout(() => observer.disconnect(), 5000);
    return () => {
      observer.disconnect();
      window.clearTimeout(giveUp);
    };
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
          <Suspense fallback={null}>
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
              {/* Where a shared link lands (ADR-0044): its code comes with the page, not after. */}
              <Route path="/shared" element={<SharedPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/leaderboard/:id" element={<LeaderboardEntryPage />} />
              <Route path="/methodology" element={<MethodologyPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<RedirectKeepingQuery to="/" />} />
            </Routes>
          </Suspense>
          <SiteFooter />
        </main>
      </div>
    </>
  );
}

export function App() {
  // A fault while drawing a screen shows a plain page rather than a blank one; moving on tries again.
  const { key } = useLocation();
  return (
    <ErrorBoundary resetKey={key}>
      <BudgetProvider>
        {/* Basic and advanced (Phase 27): one preference, read by the screens that trim their ideas. */}
        <ModeProvider>
          <Shell />
        </ModeProvider>
      </BudgetProvider>
    </ErrorBoundary>
  );
}
