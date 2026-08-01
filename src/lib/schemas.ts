import { z } from "zod";
import { isIsoDate } from "@/lib/date";

export const uuid = z.string().uuid();
const isoDateString = z.string().refine(isIsoDate, "日期格式无效。");
export const nullableIsoDate = isoDateString.nullable();

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(50),
  imagePath: z.string().min(3).max(500),
  imageWidth: z.number().int().positive().max(20000),
  imageHeight: z.number().int().positive().max(20000),
});

export const createLocationSchema = z.object({
  name: z.string().trim().min(1).max(50),
  xRatio: z.number().min(0).max(1),
  yRatio: z.number().min(0).max(1),
});

const itemFieldsSchema = z.object({
  locationId: uuid,
  name: z.string().trim().min(1).max(100),
  imagePath: z.string().min(3).max(500).nullable(),
  produceDate: nullableIsoDate,
  shelfLifeValue: z.number().int().positive().max(9999).nullable(),
  shelfLifeUnit: z.enum(["DAY", "MONTH", "YEAR"]).nullable(),
  expireDate: nullableIsoDate,
  remindDaysBefore: z.number().int().min(0).max(365),
  sourceRawText: z.string().max(20000).nullable(),
});

export const createItemSchema = itemFieldsSchema.superRefine((value, context) => {
  const hasValue = value.shelfLifeValue !== null;
  const hasUnit = value.shelfLifeUnit !== null;
  if (hasValue !== hasUnit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "保质期数值和单位必须同时填写。",
      path: [hasValue ? "shelfLifeUnit" : "shelfLifeValue"],
    });
  }
});

export const patchItemSchema = itemFieldsSchema.partial();

export const passwordSchema = z.object({
  password: z.string().min(8, "新密码至少需要 8 位。").max(128, "新密码过长。"),
});

export const createInviteSchema = z.object({
  expiresAt: z.string().datetime().nullable().optional(),
});

export const disableInviteSchema = z.object({
  inviteId: uuid,
});
