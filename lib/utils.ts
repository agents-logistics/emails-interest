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
 // - #icreditlink
 // - #iformslink
 // - #nameofpatient
 export function renderTemplate(
   body: string,
   vars: {
     nameOnTemplate: string
     installment: number
     price: number
     icreditLink: string
     iformsLink: string
     patientName: string
   }
 ): string {
   const map: Record<string, string> = {
     "#nameontemplate": vars.nameOnTemplate,
     "#numinstallaments": String(vars.installment),
     "#price": String(vars.price),
     "#icreditlink": vars.icreditLink,
     "#iformslink": vars.iformsLink,
     "#nameofpatient": vars.patientName,
   };

  let out = body;
  for (const [token, value] of Object.entries(map)) {
    // Simple replace-all using split/join to avoid regex escaping issues
    out = out.split(token).join(value);
  }
  return out;
}
