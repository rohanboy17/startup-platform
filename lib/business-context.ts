import { prisma } from "@/lib/prisma";

export type ResolvedBusinessAccessRole = "OWNER" | "EDITOR" | "VIEWER";

export type BusinessContext = {
  actorUserId: string;
  actorName: string | null;
  actorEmail: string;
  businessUserId: string;
  businessName: string | null;
  businessEmail: string;
  accessRole: ResolvedBusinessAccessRole;
  isOwner: boolean;
};

export async function getBusinessContext(userId: string): Promise<BusinessContext | null> {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      businessOwnerId: true,
      businessAccessRole: true,
      businessOwner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!actor || actor.role !== "BUSINESS") {
    return null;
  }

  if (!actor.businessOwnerId) {
    return {
      actorUserId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      businessUserId: actor.id,
      businessName: actor.name,
      businessEmail: actor.email,
      accessRole: "OWNER",
      isOwner: true,
    };
  }

  if (!actor.businessOwner || actor.businessOwner.role !== "BUSINESS") {
    return null;
  }

  return {
    actorUserId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    businessUserId: actor.businessOwner.id,
    businessName: actor.businessOwner.name,
    businessEmail: actor.businessOwner.email,
    accessRole: actor.businessAccessRole || "VIEWER",
    isOwner: false,
  };
}

export function canManageBusinessCampaigns(role: ResolvedBusinessAccessRole) {
  return role === "OWNER" || role === "EDITOR";
}

export function canManageBusinessBilling(role: ResolvedBusinessAccessRole) {
  return role === "OWNER";
}

export function canManageBusinessSettings(role: ResolvedBusinessAccessRole) {
  return role === "OWNER";
}
