/**
 * FamilyScore Registration Service
 * Registers families and members with FamilyScore when they first use Chores2026
 */

export class FamilyScoreRegistrationService {
  private familyScoreApiUrl: string;
  private familyScoreApiKey: string;

  constructor() {
    this.familyScoreApiUrl = Deno.env.get("FAMILYSCORE_BASE_URL")!;
    this.familyScoreApiKey = Deno.env.get("FAMILYSCORE_API_KEY")!;
  }

  /**
   * Registers a family with FamilyScore and initializes all members
   * Call this when a family first accesses Chores2026 features
   */
  async registerFamily(familyId: string, familyName: string, members: Array<{
    id: string;
    name: string;
    role: "parent" | "child";
    current_points: number;
  }>): Promise<void> {
    if (!this.familyScoreApiUrl || !this.familyScoreApiKey) {
      console.log("ℹ️ FamilyScore not configured, skipping registration");
      return;
    }

    try {
      console.log(`🚀 Registering family with FamilyScore: ${familyName} (${familyId})`);

      // Initialize each family member in FamilyScore
      for (const member of members) {
        await this.initializeFamilyMember(familyId, member);
      }

      console.log(`✅ Family registration complete: ${familyName}`);
    } catch (error) {
      console.warn("⚠️ FamilyScore registration failed (non-critical):", error);
      // Don't throw - app should work even if FamilyScore is down
    }
  }

  /**
   * Initializes a single family member in FamilyScore
   * Creates a zero-point "system_initialization" transaction to register them
   */
  private async initializeFamilyMember(familyId: string, member: {
    id: string;
    name: string;
    role: "parent" | "child";
    current_points: number;
  }): Promise<void> {
    // If member already has points, award them to sync current state
    const pointsToAward = member.current_points || 0;

    if (pointsToAward > 0) {
      console.log(`🔄 Syncing existing points for ${member.name}: ${pointsToAward}`);
      
      const response = await fetch(`${this.familyScoreApiUrl}/api/points/award`, {
        method: "POST",
        headers: {
          "x-api-key": this.familyScoreApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          family_id: familyId,
          user_id: member.id,
          points: pointsToAward,
          reason: "chores2026_sync_existing_points",
          metadata: {
            source: "chores2026_registration",
            member_name: member.name,
            member_role: member.role,
            sync_type: "existing_points",
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read error");
        console.warn(`⚠️ Failed to sync points for ${member.name}: ${response.status} ${errorText}`);
        return;
      }
    } else {
      // Initialize with zero-point transaction to register the member
      console.log(`➕ Initializing ${member.name} in FamilyScore`);
      
      const response = await fetch(`${this.familyScoreApiUrl}/api/points/award`, {
        method: "POST", 
        headers: {
          "x-api-key": this.familyScoreApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          family_id: familyId,
          user_id: member.id,
          points: 0, // Zero-point initialization
          reason: "chores2026_member_initialization",
          metadata: {
            source: "chores2026_registration",
            member_name: member.name,
            member_role: member.role,
            sync_type: "initialization",
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read error");
        console.warn(`⚠️ Failed to initialize ${member.name}: ${response.status} ${errorText}`);
        return;
      }
    }

    console.log(`✅ ${member.name} registered with FamilyScore`);
  }

  /**
   * Checks if a family is already registered with FamilyScore
   * Returns true if family exists and has active members
   */
  async isFamilyRegistered(familyId: string): Promise<boolean> {
    if (!this.familyScoreApiUrl || !this.familyScoreApiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.familyScoreApiUrl}/api/leaderboard/${familyId}`, {
        method: "GET",
        headers: {
          "x-api-key": this.familyScoreApiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.leaderboard && data.leaderboard.length > 0;
      }
      
      return false;
    } catch (error) {
      console.warn("⚠️ Failed to check family registration:", error);
      return false;
    }
  }
}