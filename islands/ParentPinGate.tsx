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

  const handlePinSuccess = () => {
    console.log('✅ Parent PIN verified successfully');
    
    // Elevate session for 5 minutes
    const elevatedUntil = Date.now() + 5 * 60 * 1000;
    sessionStorage.setItem('parent_elevated_until', elevatedUntil.toString());
    
    setNeedsPin(false);
  };

  const verifyParentPin = async (pin: string) => {
    try {
      const response = await fetch('/api/parent/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin }),
      });

      if (response.ok) {
        return true;
      } else {
        const error = await response.json();
        console.error('❌ Parent PIN verification failed:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error verifying parent PIN:', error);
      return false;
    }
  };

  const handlePinCancel = () => {
    console.log('❌ Parent PIN verification cancelled');
    setNeedsPin(false);
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

  if (needsPin && currentParent) {
    return (
      <ParentPinModal
        parentName={currentParent.name}
        operation={operation}
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
        onVerifyPin={verifyParentPin}
      />
    );
  }

  // PIN verified or not needed, show protected content
  return <>{children}</>;
}