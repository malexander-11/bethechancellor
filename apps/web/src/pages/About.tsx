import { Link } from 'react-router-dom';

import { sources, vintage } from '../data';
import { KINDS, KIND_WORDS } from '../journey/kinds';
import { usePageTitle } from '../journey/title';

/** The page's parts, in order, for its contents list: each is a heading below. */
const PARTS = [
  { id: 'game', title: 'The game' },
  { id: 'numbers', title: 'How the numbers work' },
  { id: 'limits', title: 'What the game does not do' },
  { id: 'licences', title: 'Licence and attribution' },
  { id: 'sources', title: 'Sources' },
] as const;

/**
 * About the game and its sources (ADR-0033): the one page the footer links to, and the way in to
 * everything behind the game. A contents list, then the game and whose idea it follows, how its
 * numbers work with the way on to the full methodology, what it does not do, its licences, and
 * every source it draws on.
 */
export function AboutPage() {
  usePageTitle('About the game & sources');
  return (
    <article className="prose">
      <h1>About the game &amp; sources</h1>
      <p className="lede">
        <em>What&rsquo;s your Budget?</em> is an open-source game about the trade-offs in a UK
        Budget. It exists because the argument about &ldquo;headroom&rdquo; is usually conducted
        without the arithmetic. Here the arithmetic is the game.
      </p>
      <nav className="contents" aria-labelledby="contents-title">
        <p id="contents-title" className="contents__title">
          On this page
        </p>
        <ol>
          {PARTS.map((part) => (
            <li key={part.id}>
              <Link to={{ hash: part.id }}>{part.title}</Link>
            </li>
          ))}
        </ol>
      </nav>

      <h2 id="game">The game</h2>
      <p>
        You are the Chancellor, with a Budget to deliver. You are briefed on the headroom you have,
        agree your priorities with the Prime Minister, choose flagship policies to deliver them,
        fine-tune tax and spending, then deliver the Budget and see how it lands with Labour
        backbenchers, the markets and the public.
      </p>
      <p>
        It is inspired by the Institute for Fiscal Studies and Nesta&rsquo;s{' '}
        <em>Be the Chancellor</em> tool, whose name it shared until September 2026. Unlike a
        think-tank model, every number in it can be traced to the official document it came from,
        and every step from that document to the screen is written down.
      </p>

      <h2 id="numbers">How the numbers work</h2>
      <p>
        Every figure is an official figure or a stated calculation on one, and everything the game
        tells you is one of five kinds:
      </p>
      <ul className="kinds">
        {KINDS.map((kind) => (
          <li key={kind}>{KIND_WORDS[kind]}</li>
        ))}
      </ul>
      <p>
        <Link to="/methodology">How the numbers work, in full</Link>: the baseline, the fiscal
        rules, how your choices flow through to borrowing and debt, and how the reactions on Budget
        day are judged.
      </p>
      <h3>Current baseline</h3>
      <p>
        {vintage.event}, published {vintage.publishedOn}. The next OBR forecast accompanies the
        Budget on 28 October 2026; the data will be rebased when it appears and this version will
        remain available for old links.
      </p>

      <h2 id="limits">What the game does not do</h2>
      <p>
        It does not model how your choices change growth, or how markets would actually move.
        Costings are official estimates; today&rsquo;s estimate of the economy is an assumption; the
        rest is arithmetic; the reactions are the game&rsquo;s judgements. Forecasts are uncertain:
        the OBR&rsquo;s typical five-year error on receipts is 0.9% of GDP, more than any recent
        headroom.
      </p>

      <h2 id="licences">Licence and attribution</h2>
      <p>
        Code is MIT licensed. Public sector data is reproduced under the Open Government Licence
        v3.0; see <code>DATA-LICENCE.md</code> in the repository. Commentary from other
        organisations is cited by link and never enters the arithmetic. Not affiliated with HM
        Treasury, the OBR, HMRC, the IFS or Nesta.
      </p>

      <h2 id="sources">Sources</h2>
      <p>
        The sources behind the game, {sources.sources.length} in all, with the date each was
        retrieved.
      </p>
      <table>
        <thead>
          <tr>
            <th>Organisation</th>
            <th>Document</th>
            <th>Retrieved</th>
          </tr>
        </thead>
        <tbody>
          {sources.sources.map((s) => (
            <tr key={s.id}>
              <td>{s.org}</td>
              <td>
                <a href={s.landingUrl ?? s.url} rel="noreferrer">
                  {s.title}
                </a>
                {s.edition ? <div className="source">{s.edition}</div> : null}
              </td>
              <td>{s.retrievedOn}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
