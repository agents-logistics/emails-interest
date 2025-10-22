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
 // - #ClalitText (conditionally replaced based on sendClalitInfo flag)
 // Optional blood test tokens:
 // - #DayOfWeek
 // - #Date
 // - #Hour
 // - #Location
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
     clalitText?: string
     sendClalitInfo?: boolean
     signature?: string
     // Optional blood test scheduling fields
     dayOfWeek?: string
     date?: string
     hour?: string
     location?: string
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

   // Add optional blood test fields if provided
   if (vars.dayOfWeek) {
     map["#DayOfWeek"] = vars.dayOfWeek;
   }
   if (vars.date) {
     // Convert date from yyyy-mm-dd to dd-mm-yyyy format
     const dateParts = vars.date.split('-');
     if (dateParts.length === 3) {
       map["#Date"] = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
     } else {
       map["#Date"] = vars.date; // Fallback to original if format is unexpected
     }
   }
   if (vars.hour) {
     map["#Hour"] = vars.hour;
   }
   if (vars.location) {
     map["#Location"] = vars.location;
   }

  let out = body;
  for (const [token, value] of Object.entries(map)) {
    // Simple replace-all using split/join to avoid regex escaping issues
    out = out.split(token).join(value);
  }
  
  // Handle Clalit text placeholder
  // If sendClalitInfo is true and clalitText is provided, replace with the text
  // Otherwise, remove the placeholder entirely
  if (vars.sendClalitInfo && vars.clalitText) {
    out = out.split("#ClalitText").join(vars.clalitText);
  } else {
    // Remove the placeholder completely (including any surrounding paragraph tags if empty)
    out = out.split("#ClalitText").join("");
  }
  
  // Handle signature placeholder
  // If signature is provided, replace with the signature content
  // Otherwise, remove the placeholder entirely
  if (vars.signature) {
    out = out.split("#signature").join(vars.signature);
  } else {
    out = out.split("#signature").join("");
  }
  
  return out;
}
