import * as z from "zod";

export const LoginSchema = z.object(
    {
        email: z.string()
        .email({ message: "Email is required" })
        .refine(email => email.endsWith('@carevox.ai'), {
            message: "Email must be from carevox.ai domain",
        }),
        password: z.string().min(1,{
            message: "Password is required"
        })
    }
);

export const RegisterSchema = z.object({
    email: z.string()
        .email({ message: "Email is required" })
        .refine(email => email.endsWith('@carevox.ai'), {
            message: "Email must be from carevox.ai domain",
        }),
    password: z.string().min(6, {
        message: "Minimum 6 characters",
    }),
    name: z.string(),
});

// ==============================================
// App-specific schemas for Tests/Templates/Email
// ==============================================

export const REQUIRED_TEMPLATE_TOKENS = [
  "#nameontemplate",
  "#numinstallaments",
  "#price",
  "#icreditlink",
  "#iformslink",
  "#nameofpatient",
] as const;

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

export const TestCreateSchema = z
  .object({
    name: z.string().trim().min(1, { message: "Test name is required" }),
    templateNamesCsv: z.string().min(1, { message: "At least one template name is required" }),
    installmentsCsv: z.string().min(1, { message: "At least one installment is required" }),
    pricesCsv: z.string().min(1, { message: "At least one price is required" }),
    emailCopiesCsv: z.string().min(1, { message: "At least one email copy is required" }),
    icreditLink: z.string().url({ message: "iCredit link must be a valid URL" }).refine(u => /^https?:\/\//i.test(u), { message: "iCredit link must start with http or https" }),
    iformsLink: z.string().url({ message: "iForms link must be a valid URL" }).refine(u => /^https?:\/\//i.test(u), { message: "iForms link must start with http or https" }),
  })
  .transform((input) => {
    const templateNames = splitCsv(input.templateNamesCsv);
    if (templateNames.length === 0) {
      throw new z.ZodError([{
        code: "custom",
        path: ["templateNamesCsv"],
        message: "At least one template name is required",
      }]);
    }

    const installments = splitCsv(input.installmentsCsv).map((v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) {
        throw new z.ZodError([{
          code: "custom",
          path: ["installmentsCsv"],
          message: "Installments must be positive integers",
        }]);
      }
      return n;
    });

    const prices = splitCsv(input.pricesCsv).map((v) => {
      const n = Number(v);
      if (!isFinite(n) || n < 0) {
        throw new z.ZodError([{
          code: "custom",
          path: ["pricesCsv"],
          message: "Prices must be numbers >= 0",
        }]);
      }
      return n;
    });

    const emailCopies = splitCsv(input.emailCopiesCsv);
    emailCopies.forEach((email) => {
      const res = z.string().email().safeParse(email);
      if (!res.success) {
        throw new z.ZodError([{
          code: "custom",
          path: ["emailCopiesCsv"],
          message: `Invalid email: ${email}`,
        }]);
      }
    });

    return {
      name: input.name.trim(),
      templateNames: Array.from(new Set(templateNames)),
      installments: Array.from(new Set(installments)).sort((a, b) => a - b),
      prices: Array.from(new Set(prices)).sort((a, b) => a - b),
      emailCopies: Array.from(new Set(emailCopies)),
      icreditLink: input.icreditLink,
      iformsLink: input.iformsLink,
    };
  });

export type TestCreateInput = z.infer<typeof TestCreateSchema>;

export const TemplateCreateSchema = z.object({
  testId: z.string().min(1, { message: "testId is required" }),
  body: z.string().min(1, { message: "Template body is required" }).refine((body) => {
    return REQUIRED_TEMPLATE_TOKENS.every((t) => body.includes(t));
  }, {
    message: `Template must include all placeholders: ${REQUIRED_TEMPLATE_TOKENS.join(", ")}`,
  }),
  isRTL: z.boolean().optional().default(true),
});

export type TemplateCreateInput = z.infer<typeof TemplateCreateSchema>;

// For preview and send. Accepts either a templateId OR a raw body for unsaved previews.
export const EmailPreviewSchema = z
  .object({
    testId: z.string().min(1),
    templateId: z.string().optional(),
    body: z.string().optional(),
    isRTL: z.boolean().optional(),
    nameOnTemplate: z.string().min(1),
    installment: z.number(),
    price: z.number(),
    toEmail: z.string().email(),
    patientName: z.string().min(1),
  })
  .refine((d) => !!(d.templateId || d.body), {
    message: "Either templateId or body must be provided",
    path: ["templateId"],
  })
  .refine((d) => {
    if (d.body) {
      return REQUIRED_TEMPLATE_TOKENS.every((t) => d.body!.includes(t));
    }
    return true;
  }, {
    message: `When passing raw body, it must include: ${REQUIRED_TEMPLATE_TOKENS.join(", ")}`,
    path: ["body"],
  });

export type EmailPreviewInput = z.infer<typeof EmailPreviewSchema>;
