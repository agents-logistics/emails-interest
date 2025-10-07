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

// Schema for individual pricing option
export const PricingOptionSchema = z.object({
  installment: z.number().int().positive({ message: "Installment must be a positive integer" }),
  price: z.number().nonnegative({ message: "Price must be >= 0" }),
  icreditText: z.string().min(1, { message: "iCredit link text is required" }),
  icreditLink: z.string().url({ message: "iCredit link must be a valid URL" }).refine(u => /^https?:\/\//i.test(u), { message: "iCredit link must start with http or https" }),
  iformsText: z.string().min(1, { message: "iForms link text is required" }),
  iformsLink: z.string().url({ message: "iForms link must be a valid URL" }).refine(u => /^https?:\/\//i.test(u), { message: "iForms link must start with http or https" }),
});

export const TestCreateSchema = z
  .object({
    name: z.string().trim().min(1, { message: "Test name is required" }),
    templateNamesCsv: z.string().min(1, { message: "At least one template name is required" }),
    emailCopiesCsv: z.string().min(1, { message: "At least one email copy is required" }),
    pricingOptions: z.array(PricingOptionSchema).min(1, { message: "At least one pricing option is required" }),
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
      emailCopies: Array.from(new Set(emailCopies)),
      pricingOptions: input.pricingOptions,
    };
  });

export type TestCreateInput = z.infer<typeof TestCreateSchema>;

export const TemplateCreateSchema = z.object({
  testId: z.string().min(1, { message: "testId is required" }),
  body: z.string().min(1, { message: "Template body is required" }),
  subject: z.string().optional(),
  isRTL: z.boolean().optional().default(true),
  reply_to: z.string().email().optional(),
});

export type TemplateCreateInput = z.infer<typeof TemplateCreateSchema>;

// For preview and send. Accepts either a templateId OR a raw body for unsaved previews.
export const EmailPreviewSchema = z
  .object({
    testId: z.string().min(1),
    templateId: z.string().optional(),
    body: z.string().optional(),
    subject: z.string().optional(),
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
  });

export type EmailPreviewInput = z.infer<typeof EmailPreviewSchema>;
