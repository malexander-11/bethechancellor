# Data licence and attribution

The code in this repository is MIT licensed (see `LICENSE`). The figures under `data/`
are a different matter: they are reproduced or derived from publications of UK public
bodies and carry their own licences.

## Open Government Licence v3.0

Contains public sector information licensed under the
[Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).

Sources used under OGL v3.0 include:

- Office for Budget Responsibility, _Economic and fiscal outlook_, March 2026, and its published
  sensitivities and forecast-error statistics.
- HM Treasury, _Charter for Budget Responsibility: Autumn 2025_ (in force February 2026) and
  _A strong fiscal framework_ (October 2024).
- HM Treasury, _Budget 2025_ documents, including Table 4.1 policy decisions and the policy
  costings document.
- HM Treasury, _Spending Review 2025_ departmental DEL tables.
- HM Revenue and Customs, _Direct effects of illustrative tax changes_, June 2025 edition.
- Office for National Statistics, _Public sector finances_ time series and
  _Families and households in the UK: 2024_.
- Bank of England, Interactive Statistical Database (Bank Rate series).

Every number in `data/` carries a `source` reference to one of these documents, recorded in
`data/sources/sources.json`. Derived figures record each transformation step.

## Other material

Commentary from the Institute for Government, the Institute for Fiscal Studies, Nesta and
press reports is cited by URL as qualitative context only. No figures are reproduced from
those sources without attribution, and none of them are used in the engine's arithmetic.
