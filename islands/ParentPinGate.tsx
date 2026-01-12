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

      // Check if parent has PIN set
      if (!parent.pin_hash) {
        console.log('🔐 Parent has no PIN set, requiring setup');
        setNeedsPin(true);
        if (onPinRequired) onPinRequired();
      } else {
        console.log('🔐 Parent PIN verification required for:', operation);
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

  if (hasDefaultPin && currentParent) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: 'var(--color-warning)', marginBottom: '1rem' }}>
            🔒 Default PIN Detected
          </h3>
          <p style={{ marginBottom: '1.5rem', color: 'var(--color-text)' }}>
            You're using the default PIN (1234). For security, you must change it before accessing parent features.
          </p>
          <button
            onClick={() => {
              // Redirect to settings to change PIN
              window.location.href = '/parent/settings';
            }}
            style={{
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              marginRight: '1rem'
            }}
          >
            Change PIN Now
          </button>
          <button
            onClick={() => {
              // For default PIN modal, redirect to family selector
              console.log('❌ Default PIN change cancelled - redirecting to family selector');
              window.location.href = '/';
            }}
            style={{
              background: '#e5e7eb',
              color: 'var(--color-text)',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (needsPin && currentParent) {
    return (
      <div>
        <ParentPinModal
          parentName={currentParent.name}
          operation={operation}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
          parentData={currentParent}
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