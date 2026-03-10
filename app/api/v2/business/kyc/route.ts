import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBusinessContext } from "@/lib/business-context";

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
    select: { id: true, name: true, email: true, kycStatus: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Business account not found" }, { status: 404 });
  }

  const latestRequest = await prisma.businessKycRequest.findFirst({
    where: { businessId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    profile: { name: user.name || "", email: user.email, kycStatus: user.kycStatus },
    request: latestRequest,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUSINESS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const context = await getBusinessContext(session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Business context not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    legalName?: string;
    contactName?: string;
    phone?: string;
    address?: string;
    website?: string;
    taxId?: string;
    documentUrl?: string;
  };

  const legalName = body.legalName?.trim() || "";
  const contactName = body.contactName?.trim() || "";
  const phone = body.phone?.trim() || "";
  const address = body.address?.trim() || "";
  const website = body.website?.trim() || null;
  const taxId = body.taxId?.trim() || null;
  const documentUrl = body.documentUrl?.trim() || null;

  if (!legalName || !contactName || !phone || !address) {
    return NextResponse.json({ error: "Legal name, contact name, phone, and address are required" }, { status: 400 });
  }

  const existingPending = await prisma.businessKycRequest.findFirst({
    where: { businessId: context.businessUserId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  if (existingPending) {
    return NextResponse.json({ error: "A KYC request is already pending review" }, { status: 400 });
  }

  const request = await prisma.businessKycRequest.create({
    data: {
      businessId: context.businessUserId,
      legalName,
      contactName,
      phone,
      address,
      website,
      taxId,
      documentUrl,
      status: "PENDING",
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: context.actorUserId,
      action: "BUSINESS_KYC_REQUESTED",
      entity: "BusinessKycRequest",
      details: `businessId=${context.businessUserId}, requestId=${request.id}`,
    },
  });

  return NextResponse.json({ message: "KYC request submitted", request }, { status: 201 });
}

