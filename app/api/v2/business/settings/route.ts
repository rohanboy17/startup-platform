import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBusinessSettings, type BusinessSettings } from "@/lib/business-settings";
import { canManageBusinessSettings, getBusinessContext } from "@/lib/business-context";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: context.businessUserId },
    select: {
      id: true,
      name: true,
      email: true,
      kycStatus: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Business account not found" }, { status: 404 });
  }

  const settings = await getBusinessSettings(user.id, { name: user.name, email: user.email });

  return NextResponse.json({
    profile: {
      name: user.name || "",
      email: user.email,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt,
    },
    settings,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }
  if (!canManageBusinessSettings(context.accessRole)) {
    return NextResponse.json({ error: "Only the business owner can update settings" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    settings?: BusinessSettings;
  };

  const existingUser = await prisma.user.findUnique({
    where: { id: context.businessUserId },
    select: { id: true, name: true, email: true },
  });

  if (!existingUser) {
    return NextResponse.json({ error: "Business account not found" }, { status: 404 });
  }

  const settings = body.settings;
  if (!settings) {
    return NextResponse.json({ error: "Settings payload is required" }, { status: 400 });
  }

  const nextSettings: BusinessSettings = {
    brandName: settings.brandName.trim(),
    companyName: settings.companyName.trim(),
    contactEmail: settings.contactEmail.trim(),
    supportContact: settings.supportContact.trim(),
    billingDetails: settings.billingDetails.trim(),
    refundPreference: settings.refundPreference.trim(),
    notificationPreferences: {
      campaignStatus: Boolean(settings.notificationPreferences.campaignStatus),
      budgetAlerts: Boolean(settings.notificationPreferences.budgetAlerts),
      paymentAlerts: Boolean(settings.notificationPreferences.paymentAlerts),
      rejectionSpike: Boolean(settings.notificationPreferences.rejectionSpike),
    },
  };

  if (!nextSettings.contactEmail) {
    return NextResponse.json({ error: "Contact email is required" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (typeof body.name === "string") {
      await tx.user.update({
        where: { id: context.businessUserId },
        data: {
          name: body.name.trim() || existingUser.name || "",
        },
      });
    }

    await tx.systemSetting.upsert({
      where: { key: `business.settings.${context.businessUserId}` },
      update: { value: nextSettings },
      create: { key: `business.settings.${context.businessUserId}`, value: nextSettings },
    });

    await tx.activityLog.create({
      data: {
        userId: context.actorUserId,
        action: "BUSINESS_UPDATED_SETTINGS",
        entity: "BusinessSettings",
        details: `businessId=${context.businessUserId}, contactEmail=${nextSettings.contactEmail}`,
      },
    });
  });

  return NextResponse.json({ message: "Business settings updated" });
}
