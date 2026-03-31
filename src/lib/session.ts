import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user;
}

/**
 * Get the engagement ID for the current user.
 * Admin: returns engagementId param or first engagement.
 * Client: returns their linked engagement (ignores param).
 */
export async function getUserEngagementId(requestedId?: string): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;

  if (user.role === "ADMIN") {
    if (requestedId) return requestedId;
    const engagement = await prisma.engagement.findFirst();
    return engagement?.id ?? null;
  }

  // Client — find their linked engagement
  const link = await prisma.engagementUser.findFirst({
    where: { userId: user.id },
    include: { engagement: true },
  });

  return link?.engagementId ?? null;
}

/**
 * Verify user has access to a specific engagement.
 */
export async function canAccessEngagement(engagementId: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  const link = await prisma.engagementUser.findFirst({
    where: { userId: user.id, engagementId },
  });

  return !!link;
}
