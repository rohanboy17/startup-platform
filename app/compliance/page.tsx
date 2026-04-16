import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";
import { SUPPORT_EMAIL } from "@/lib/public-links";

type Section = { title: string; body: string };

const CONTENT: Record<string, { eyebrow: string; title: string; description: string; sections: Section[]; contactLead: string }> = {
  en: {
    eyebrow: "Compliance",
    title: "Compliance & Grievance",
    description: "How FreeEarnHub handles review holds, evidence requests, payout checks, and grievance escalation.",
    contactLead: "For grievance, compliance, or policy review matters, contact",
    sections: [
      {
        title: "Verification and review checks",
        body: "Accounts, campaigns, jobs, payouts, refunds, in-app hiring messages, and unusual activity may be reviewed for fraud, policy, KYC, reconciliation, or legal risk before approval or release.",
      },
      {
        title: "Payout and reconciliation handling",
        body: "Wallet balances, withdrawals, business funding, approved job-budget locks, and refunds are subject to ledger checks, payout-rail availability, documentation review, and settlement reconciliation. Processing windows may vary when exceptions or holds are present.",
      },
      {
        title: "Evidence and audit trail",
        body: "FreeEarnHub may rely on campaign records, job and application records, moderation decisions, proof snapshots, transaction logs, device or IP signals, in-app message history, and uploaded supporting documents when resolving disputes or investigating abuse.",
      },
      {
        title: "Grievance escalation",
        body: "Users and businesses may raise correction, deletion, payout, refund, privacy, or conduct concerns through support. Complex cases may be escalated for manual compliance review before a final decision is issued.",
      },
      {
        title: "Account restrictions",
        body: "Where fraud, abuse, deception, sanctions risk, or serious policy violations are detected, we may pause services, limit balances, reject campaigns, deny withdrawals, or suspend accounts while review is underway.",
      },
    ],
  },
  hi: {
    eyebrow: "अनुपालन",
    title: "Compliance और Grievance",
    description: "FreeEarnHub review hold, evidence request, payout check और grievance escalation को कैसे संभालता है।",
    contactLead: "Grievance, compliance या policy review मामलों के लिए संपर्क करें",
    sections: [
      {
        title: "Verification और review checks",
        body: "Fraud, policy, KYC, reconciliation या legal risk के आधार पर accounts, campaigns, jobs, payouts, refunds, in-app hiring messages और unusual activity को approval या release से पहले review किया जा सकता है।",
      },
      {
        title: "Payout और reconciliation handling",
        body: "Wallet balance, withdrawal, business funding, approved job-budget locks और refund ledger checks, payout-rail availability, document review और settlement reconciliation के अधीन रहते हैं। Exception या hold होने पर processing window बदल सकती है।",
      },
      {
        title: "Evidence और audit trail",
        body: "Dispute resolve करने या abuse investigate करने के लिए FreeEarnHub campaign records, job और application records, moderation decisions, proof snapshots, transaction logs, device/IP signals, in-app message history और supporting documents पर भरोसा कर सकता है।",
      },
      {
        title: "Grievance escalation",
        body: "Users और businesses correction, deletion, payout, refund, privacy या conduct concern support के जरिए raise कर सकते हैं। Complex cases को final decision से पहले manual compliance review तक escalate किया जा सकता है।",
      },
      {
        title: "Account restrictions",
        body: "Fraud, abuse, deception, sanctions risk या गंभीर policy violation मिलने पर हम review के दौरान services pause कर सकते हैं, balance limit कर सकते हैं, campaigns reject कर सकते हैं, withdrawals deny कर सकते हैं या account suspend कर सकते हैं।",
      },
    ],
  },
  bn: {
    eyebrow: "কমপ্লায়েন্স",
    title: "Compliance এবং Grievance",
    description: "FreeEarnHub কীভাবে review hold, evidence request, payout check এবং grievance escalation পরিচালনা করে।",
    contactLead: "Grievance, compliance বা policy review বিষয়ক ক্ষেত্রে যোগাযোগ করুন",
    sections: [
      {
        title: "Verification এবং review checks",
        body: "Fraud, policy, KYC, reconciliation বা legal risk-এর কারণে account, campaign, job, payout, refund, in-app hiring messages এবং unusual activity approval বা release-এর আগে review করা হতে পারে।",
      },
      {
        title: "Payout এবং reconciliation handling",
        body: "Wallet balance, withdrawal, business funding, approved job-budget locks এবং refund ledger checks, payout-rail availability, document review এবং settlement reconciliation-এর অধীনে থাকে। Exception বা hold থাকলে processing window বদলাতে পারে।",
      },
      {
        title: "Evidence এবং audit trail",
        body: "Dispute resolve করা বা abuse investigate করার সময় FreeEarnHub campaign records, job এবং application records, moderation decisions, proof snapshots, transaction logs, device/IP signals, in-app message history এবং supporting documents ব্যবহার করতে পারে।",
      },
      {
        title: "Grievance escalation",
        body: "Users এবং businesses correction, deletion, payout, refund, privacy বা conduct concern support-এর মাধ্যমে raise করতে পারে। Complex case final decision-এর আগে manual compliance review-এ escalate হতে পারে।",
      },
      {
        title: "Account restrictions",
        body: "Fraud, abuse, deception, sanctions risk বা গুরুতর policy violation ধরা পড়লে review চলাকালে service pause, balance limit, campaign reject, withdrawal deny বা account suspend করা হতে পারে।",
      },
    ],
  },
};

export default async function CompliancePage() {
  const locale = await getLocale();
  const content = CONTENT[locale] ?? CONTENT.en;

  return (
    <PublicPageShell
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      lastUpdated="April 16, 2026"
    >
      <div className="space-y-4">
        {content.sections.map((section) => (
          <PolicySection key={section.title} title={section.title}>
            <p>{section.body}</p>
          </PolicySection>
        ))}
        <PolicySection title="Contact">
          <p>
            {content.contactLead}{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-4">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}
