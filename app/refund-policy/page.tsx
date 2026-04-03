import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

type Section = { title: string; body: string };

type Content = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Section[];
};

const CONTENT: Record<string, Content> = {
  en: {
    eyebrow: "Legal",
    title: "Refund Policy",
    description:
      "How FreeEarnHub handles unused campaign budget, settlement boundaries, withdrawals, and dispute review.",
    sections: [
      {
        title: "Unused business budget",
        body:
          "Businesses may request release or refund of eligible unused campaign budget that has not been consumed by approved work, locked settlement, refund hold, or compliance review.",
      },
      {
        title: "What is not refundable",
        body:
          "Amounts already tied to approved submissions, settled rewards, fraud investigation holds, chargeback risk, or platform fee obligations are not automatically refundable. Manual review may be required before any balance is released.",
      },
      {
        title: "User withdrawals",
        body:
          "User withdrawal requests are reviewed before processing. Typical processing windows may vary depending on payout rail availability, fraud controls, reconciliation status, KYC, account flags, and operational load.",
      },
      {
        title: "Disputes and supporting records",
        body:
          "Refund and payout disputes are resolved using platform logs, submission records, moderation decisions, wallet entries, and funding records. Users and businesses should provide relevant transaction IDs and account details when contacting support.",
      },
      {
        title: "Policy discretion",
        body:
          "FreeEarnHub may place balances on hold, request supporting documentation, or deny refunds and withdrawals where fraud, abuse, legal restrictions, or reconciliation issues are present.",
      },
    ],
  },
  hi: {
    eyebrow: "कानूनी",
    title: "रिफंड नीति",
    description:
      "FreeEarnHub unused campaign budget, settlement boundaries, withdrawals और dispute review को कैसे संभालता है।",
    sections: [
      {
        title: "अप्रयुक्त बिज़नेस बजट",
        body:
          "बिज़नेस ऐसे unused campaign budget की release या refund request कर सकते हैं जो approved work, locked settlement, refund hold या compliance review में उपयोग नहीं हुआ हो।",
      },
      {
        title: "क्या refundable नहीं है",
        body:
          "Approved submissions, settled rewards, fraud investigation holds, chargeback risk या platform fee obligations से जुड़े amounts अपने-आप refundable नहीं होते। किसी balance को release करने से पहले manual review आवश्यक हो सकता है।",
      },
      {
        title: "यूज़र withdrawals",
        body:
          "यूज़र withdrawal requests processing से पहले review की जाती हैं। Payout rail availability, fraud controls, reconciliation status, KYC, account flags और operational load के आधार पर processing time बदल सकता है।",
      },
      {
        title: "विवाद और सहायक records",
        body:
          "Refund और payout disputes को platform logs, submission records, moderation decisions, wallet entries और funding records के आधार पर resolve किया जाता है। Support से संपर्क करते समय relevant transaction IDs और account details देना चाहिए।",
      },
      {
        title: "Policy discretion",
        body:
          "Fraud, abuse, legal restriction या reconciliation issue होने पर FreeEarnHub balances hold कर सकता है, supporting documents मांग सकता है या refunds तथा withdrawals deny कर सकता है।",
      },
    ],
  },
  bn: {
    eyebrow: "আইনি",
    title: "রিফান্ড নীতি",
    description:
      "FreeEarnHub কীভাবে unused campaign budget, settlement boundaries, withdrawals এবং dispute review পরিচালনা করে।",
    sections: [
      {
        title: "অব্যবহৃত ব্যবসার বাজেট",
        body:
          "ব্যবসা এমন unused campaign budget-এর release বা refund request করতে পারে যা approved work, locked settlement, refund hold বা compliance review-এ খরচ হয়নি।",
      },
      {
        title: "কী refundable নয়",
        body:
          "Approved submissions, settled rewards, fraud investigation holds, chargeback risk বা platform fee obligations-এর সাথে যুক্ত amounts স্বয়ংক্রিয়ভাবে refundable নয়। কোনো balance release করার আগে manual review প্রয়োজন হতে পারে।",
      },
      {
        title: "ব্যবহারকারীর withdrawals",
        body:
          "ব্যবহারকারীর withdrawal requests processing-এর আগে review করা হয়। Payout rail availability, fraud controls, reconciliation status, KYC, account flags এবং operational load-এর ভিত্তিতে processing time পরিবর্তিত হতে পারে।",
      },
      {
        title: "বিরোধ ও সহায়ক records",
        body:
          "Refund এবং payout disputes platform logs, submission records, moderation decisions, wallet entries এবং funding records ব্যবহার করে resolve করা হয়। Support-এ যোগাযোগের সময় relevant transaction IDs এবং account details দিতে হবে।",
      },
      {
        title: "Policy discretion",
        body:
          "Fraud, abuse, legal restriction বা reconciliation issue থাকলে FreeEarnHub balances hold করতে পারে, supporting documents চাইতে পারে অথবা refunds এবং withdrawals deny করতে পারে।",
      },
    ],
  },
};

export default async function RefundPolicyPage() {
  const locale = await getLocale();
  const content = CONTENT[locale] ?? CONTENT.en;

  return (
    <PublicPageShell
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      lastUpdated="April 3, 2026"
    >
      <div className="space-y-4">
        {content.sections.map((section) => (
          <PolicySection key={section.title} title={section.title}>
            <p>{section.body}</p>
          </PolicySection>
        ))}
      </div>
    </PublicPageShell>
  );
}
