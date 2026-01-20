/**
 * Parent PIN Gate Component
 * Protects sensitive operations with parent PIN verification
 * Reuses existing kid PIN infrastructure for consistency
 */

import { useEffect, useState } from "preact/hooks";
import ParentPinModal from "./ParentPinModal.tsx";

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
  pin_hash?: string;
  has_pin?: boolean; // Session provides this boolean (pin_hash is not exposed to client)
}

interface Props {
  children: any;
  operation?: string;
  familyMembers: FamilyMember[];
  onPinRequired?: () => void;
}

export default function ParentPinGate({ 
  children, 
  operation = "access this feature",
  familyMembers,
  onPinRequired 
}: Props) {
  const [needsPin, setNeedsPin] = useState(false);
  const [currentParent, setCurrentParent] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasDefaultPin, setHasDefaultPin] = useState(false);
  const [cancelAttempted, setCancelAttempted] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false); // First-time PIN setup needed

  useEffect(() => {
    checkParentPinStatus();
  }, []);

  const checkParentPinStatus = async () => {
    try {
      // Check if parent session is elevated (5-minute window)
      const elevatedUntil = sessionStorage.getItem('parent_elevated_until');
      if (elevatedUntil && Date.now() < parseInt(elevatedUntil)) {
        console.log('🔐 Parent session is elevated, allowing access');
        setLoading(false);
        return;
      }

      // Get current parent from session
      const response = await fetch('/api/parent/session', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('❌ Failed to get parent session');
        setLoading(false);
        return;
      }

      const sessionData = await response.json();
      const parent = familyMembers.find(member => 
        member.role === 'parent' && member.id === sessionData.profile_id
      );

      if (!parent) {
        console.error('❌ Parent not found in family members');
        setLoading(false);
        return;
      }

      setCurrentParent(parent);

      // Check if parent has PIN set (use has_pin boolean from session, not pin_hash)
      const hasPin = parent.has_pin || !!parent.pin_hash;
      if (!hasPin) {
        console.log('🔐 Parent has no PIN set, requiring setup');
        setNeedsSetup(true); // First-time setup mode
        setNeedsPin(true);
        if (onPinRequired) onPinRequired();
      } else {
        console.log('🔐 Parent PIN verification required for:', operation);
        setNeedsSetup(false); // PIN exists, verify mode
        setNeedsPin(true);
        if (onPinRequired) onPinRequired();
      }
    } catch (error) {
      console.error('❌ Error checking parent PIN status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSuccess = async (enteredPin?: string) => {
    console.log('✅ Parent PIN verified successfully');
    
    // Clear any cancel message
    setCancelAttempted(false);
    
    // Check if they used the default PIN (1234)
    if (enteredPin === "1234") {
      console.log('⚠️ Parent used default PIN 1234, requiring change');
      setHasDefaultPin(true);
      // Don't elevate session yet - force PIN change first
      return;
    }
    
    // Session elevation is now handled by createParentSession() in ParentPinModal
    // No need to manually set sessionStorage here
    setNeedsPin(false);
  };


  const handlePinCancel = () => {
    console.log('❌ Parent PIN verification cancelled');
    // SECURITY: Never allow access after PIN cancel - show message instead
    setCancelAttempted(true);
    // User must either enter correct PIN or navigate away manually
    // setNeedsPin(false) is NOT called here to prevent bypass
  };

  if (loading) {
    return (
      <div style={{ 
        opacity: 0.5, 
        pointerEvents: 'none',
        position: 'relative' 
      }}>
        {children}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--color-bg)',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: 'var(--color-text-light)'
        }}>
          🔐 Verifying...
        </div>
      </div>
    );
  }

  // Show inline PIN change modal when default PIN is detected
  if (hasDefaultPin && currentParent) {
    return (
      <div>
        <ParentPinModal
          key="change-pin-modal"
          parentName={currentParent.name}
          operation="change your default PIN"
          onSuccess={(newPin) => {
            console.log('✅ Default PIN changed successfully');
            setHasDefaultPin(false);
            setNeedsPin(false);
          }}
          onCancel={() => {
            console.log('❌ Default PIN change cancelled - redirecting to family selector');
            window.location.href = '/';
          }}
          parentData={currentParent}
          forceChangePin={true}
        />
      </div>
    );
  }

  if (needsPin && currentParent) {
    return (
      <div>
        <ParentPinModal
          key="verify-pin-modal"
          parentName={currentParent.name}
          operation={operation}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
          parentData={currentParent}
          needsSetup={needsSetup}
        />
        {cancelAttempted && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-warning)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            zIndex: 1001,
            fontSize: '0.875rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            🔐 PIN is required to {operation}. Navigate away or enter correct PIN.
          </div>
        )}
      </div>
    );
  }

  // PIN verified or not needed, show protected content
  return <>{children}</>;
}