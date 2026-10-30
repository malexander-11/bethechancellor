import { z } from 'zod';

/**
 * One way to spend what a player saved, or to find what they gave up (ADR-0046): a lever moved a
 * fixed step at a time, pressed again to go a step further. The step is in the lever's own unit
 * (a point, a percentage of a budget, pounds a flight) and its sign says which way; the price is
 * the engine's, worked out on the Budget as it stands.
 */
export const balanceOptionSchema = z.strictObject({
  code: z.string().min(1),
  step: z.number().refine((step) => step !== 0, 'a step moves the lever'),
  /** What the player is choosing, as they would say it: "More for the NHS". */
  label: z.string().min(1).max(48),
  /** What one press does, in the lever's unit: "1% more each time". */
  each: z.string().min(1).max(40),
});

/**
 * A spending budget the player may cut or add to (ADR-0049): one row, a fixed step either way. The
 * step is the size of one press and is positive; the minus cuts the budget by it and the plus adds
 * it.
 */
export const balanceBudgetSchema = balanceOptionSchema.refine(
  (option) => option.step > 0,
  'a budget is stepped by a positive amount, either way',
);

/**
 * The balance page's menus: the spending budgets, each cut or added to (ADR-0049); the taxes to
 * raise, each finding money; and the tax cuts and other priorities, each spending it. Which way an
 * option moves the money is checked against the engine by a test; a lever appears once, on one
 * menu.
 */
export const balanceFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    budgets: z.array(balanceBudgetSchema).min(1).max(16),
    raise: z.array(balanceOptionSchema).min(1).max(14),
    spend: z.array(balanceOptionSchema).min(1).max(14),
  })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    for (const side of ['budgets', 'raise', 'spend'] as const) {
      file[side].forEach((option, i) => {
        if (seen.has(option.code))
          ctx.addIssue({
            code: 'custom',
            message: `${option.code} is offered twice`,
            path: [side, i, 'code'],
          });
        seen.add(option.code);
      });
    }
  });
