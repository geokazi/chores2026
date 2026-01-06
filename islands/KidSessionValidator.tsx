/**
 * Kid Session Validator
 * Client-side component that validates kid PIN sessions and redirects if needed
 */

import { useEffect } from "preact/hooks";
import { validateKidSession, isPinRequiredForFamily } from "../lib/auth/kid-session.ts";

interface Props {
  kidId: string;
  family: any;
  children?: preact.ComponentChildren;
}

export default function KidSessionValidator({ kidId, family, children }: Props) {
  useEffect(() => {
    // Only run validation in browser environment
    if (typeof window === 'undefined') return;

    const isPinRequired = isPinRequiredForFamily(family);
    
    if (isPinRequired) {
      const hasValidSession = validateKidSession(kidId, family.children_pins_enabled);
      
      if (!hasValidSession) {
        console.log(`🔐 Kid session invalid for ${kidId}, redirecting to kid selector`);
        // Redirect back to kid selector for PIN entry
        window.location.href = '/';
        return;
      }
      
      console.log(`✅ Kid session valid for ${kidId}`);
    } else {
      console.log(`🔓 PIN not required for family, allowing access`);
    }
  }, [kidId, family.children_pins_enabled]);

  // Render children if validation passes or isn't required
  return <>{children}</>;
}