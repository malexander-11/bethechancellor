import { useWorkings } from '../journey/workings';

export function Disclaimer() {
  const workings = useWorkings();
  return (
    <footer className="footer-note">
      {!workings ? (
        <p className="footer-note__workings">
          Every figure is sourced. Turn on <strong>Show workings</strong>, at the top of the page,
          to see where each one comes from.
        </p>
      ) : null}
      <p>
        This game does not model how your choices change growth, or how markets would actually move.
        Costings are official estimates; the economic sliders are assumptions; the rest is
        arithmetic; the reactions are judgements, and say so. Forecasts are uncertain: the
        OBR&rsquo;s typical five-year error on receipts is 0.9% of GDP, more than any recent
        headroom.
      </p>
      <p>
        Contains public sector information licensed under the Open Government Licence v3.0. Not
        affiliated with HM Treasury, the OBR, HMRC, the IFS or Nesta.
      </p>
    </footer>
  );
}
