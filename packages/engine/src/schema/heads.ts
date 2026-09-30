/**
 * The vintage's heads, as plain lists: the schemas are built from them, and the arithmetic reads
 * them without loading a schema.
 */

/** Receipts heads in the vintage's receiptsByHeadPctGdp, plus nominal GDP itself. */
export const TAX_HEADS = [
  'incomeTax',
  'nics',
  'vat',
  'onshoreCorporationTax',
  'capitalTaxes',
  'businessRates',
  'fuelDuties',
  'alcoholAndTobaccoDuties',
  'otherTaxes',
  'nominalGdp',
] as const;

/** Spending lines in the vintage that a baseline can be taken from or a published figure can grow with. */
export const SPENDING_HEADS = [
  'rdel',
  'cdel',
  'welfareTotal',
  'welfareInCap',
  'pensionerSpending',
  'universalCreditAndLegacy',
  'disabilityBenefits',
  'childBenefit',
  'otherWelfare',
] as const;
