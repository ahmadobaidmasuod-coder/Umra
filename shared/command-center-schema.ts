import { z } from "zod";

const primitive = z.union([z.string(), z.number()]);
const rule = z.object({
  field: z.string().min(1),
  operator: z.enum(["EQ", "NEQ", "GT", "GTE", "LT", "LTE", "IN"]),
  value: z.union([primitive, z.array(primitive)]),
  result: primitive,
});

export const configValueSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("FIXED"), value: primitive }),
  z.object({ mode: z.literal("RULE"), rules: z.array(rule).min(1), fallback: primitive.optional() }),
  z.object({ mode: z.literal("INSTRUCTION"), instruction: z.string().min(3) }),
]);

const margin = z.object({ type: z.enum(["PERCENT", "FIXED"]), value: configValueSchema });
export const commandCenterPayloadSchema = z.object({
  programNaming: z.object({ template: z.string().min(1) }),
  groundServices: z.array(z.object({ key: z.string(), selection: configValueSchema, purchasePrice: configValueSchema, margin })),
  hotels: z.record(z.enum(["MAKKAH", "MADINAH"]), z.object({ preferredHotels: z.array(z.string()), purchasePrice: configValueSchema, margin, agreementNumber: configValueSchema })),
  transport: z.object({
    carrierSelection: configValueSchema,
    companyName: configValueSchema,
    tripNumber: configValueSchema,
    vehicleModel: configValueSchema,
    vehicleType: configValueSchema,
    purchasePrice: configValueSchema,
    margin,
  }),
  defaults: z.object({ programType: z.string(), language: z.enum(["ar", "en"]), publishSettings: z.record(z.string(), z.unknown()) }),
});
export type CommandCenterPayload = z.infer<typeof commandCenterPayloadSchema>;
