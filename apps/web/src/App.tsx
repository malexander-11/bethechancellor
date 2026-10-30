import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { BudgetProvider } from './state/budget';
import { BudgetDayPage } from './pages/BudgetDay';
import { BalancePage } from './pages/Balance';
import { MeasuresPage } from './pages/Measures';
import { ReviewPage } from './pages/Review';
import { SharedPage } from './pages/Shared';
import { ErrorBoundary } from './components/ErrorBoundary';
import { STAGE_ROUTES } from './journey/routes';
import { SiteFooter } from './components/SiteFooter';

// The two reference pages are opened by few players, so their code loads when one is opened.
const AboutPage = lazy(() => import('./pages/About').then((m) => ({ default: m.AboutPage })));
const MethodologyPage = lazy(() =>
  import('./pages/Methodology').then((m) => ({ default: m.MethodologyPage })),
);
// The leaderboard is opened from the Budget, the footer and Budget day (ADR-0044), not on the road.
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
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to the step
      </a>
      <RouteFocus />
      <div className="shell">
        <header className="site-header">
          <div className="site-header__inner">
            <NavLink to="/" className="brand" end>
              What’s your Budget?
            </NavLink>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="page">
          <Suspense fallback={null}>
            <Routes>
              {/*
            The game opens on the walk (ADR-0047): the site's own address and every retired step's
            (the briefing, the priorities and the flagships, ADR-0045; fine-tuning and the desk
            before it, ADR-0046) open its first page, the query string intact, and a link without
            a game starts one with its measures in it.
          */}
              {[
                '/',
                '/outlook',
                '/assumptions',
                '/pm',
                '/budget',
                '/budget/deliver',
                '/budget/deliver/:n',
                '/budget/afford',
                '/budget/:tab',
                '/finetune',
                '/finetune/:side',
                '/recommendations',
                '/b',
                '/measures',
              ].map((path) => (
                <Route
                  key={path}
                  path={path}
                  element={<RedirectKeepingQuery to={STAGE_ROUTES.measures} />}
                />
              ))}
              <Route path="/measures/:page" element={<MeasuresPage />} />
              <Route path="/balance" element={<BalancePage />} />
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
        <Shell />
      </BudgetProvider>
    </ErrorBoundary>
  );
}
