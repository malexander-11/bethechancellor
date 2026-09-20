import { sources, vintage } from '../data';
import { usePageTitle } from '../journey/title';

export function AboutPage() {
  usePageTitle('About and sources');
  return (
    <article className="prose">
      <h1>About this project</h1>
      <p className="lede">
        Be the Chancellor is an open-source game about the trade-offs in a UK Budget. It exists
        because the argument about &ldquo;headroom&rdquo; is usually conducted without the
        arithmetic. Here the arithmetic is the game.
      </p>
      <p>
        It is inspired by the Institute for Fiscal Studies and Nesta&rsquo;s{' '}
        <em>Be the Chancellor</em> tool. Unlike a think-tank model it shows, for every number, which
        official document it came from and every step taken to get from that document to the screen.
      </p>
      <h2>Current baseline</h2>
      <p>
        {vintage.event}, published {vintage.publishedOn}. The next OBR forecast accompanies the
        Budget on 28 October 2026; the data will be rebased when it appears and this version will
        remain available for old links.
      </p>
      <h2>Sources</h2>
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
      <h2>Licences</h2>
      <p>
        Code is MIT licensed. Public sector data is reproduced under the Open Government Licence
        v3.0; see <code>DATA-LICENCE.md</code> in the repository. Commentary from other
        organisations is cited by link and never enters the arithmetic.
      </p>
    </article>
  );
}
