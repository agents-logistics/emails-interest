import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

 // Render a template by replacing required tokens with provided values.
 // Tokens expected:
 // - #nameontemplate
 // - #numinstallaments
 // - #price
 // - #icreditlink (renders as HTML link with icreditText)
 // - #iformslink (renders as HTML link with iformsText)
 // - #nameofpatient
 export function renderTemplate(
   body: string,
   vars: {
     nameOnTemplate: string
     installment: number
     price: number
     icreditText: string
     icreditLink: string
     iformsText: string
     iformsLink: string
     patientName: string
   }
 ): string {
   // Create HTML links for iCredit and iForms
   const icreditHtmlLink = `<a href="${vars.icreditLink}" style="color: #0066cc; text-decoration: underline;">${vars.icreditText}</a>`;
   const iformsHtmlLink = `<a href="${vars.iformsLink}" style="color: #0066cc; text-decoration: underline;">${vars.iformsText}</a>`;

   const map: Record<string, string> = {
     "#nameontemplate": vars.nameOnTemplate,
     "#numinstallaments": String(vars.installment),
     "#price": String(vars.price),
     "#icreditlink": icreditHtmlLink,
     "#iformslink": iformsHtmlLink,
     "#nameofpatient": vars.patientName,
   };

  let out = body;
  for (const [token, value] of Object.entries(map)) {
    // Simple replace-all using split/join to avoid regex escaping issues
    out = out.split(token).join(value);
  }
  return out;
}
