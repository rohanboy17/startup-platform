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
    title: "Terms & Conditions",
    description:
      "These terms govern account access, work posting, hiring, in-app messaging, moderation, and settlement on FreeEarnHub.",
    sections: [
      {
        title: "Platform scope",
        body:
          "FreeEarnHub operates as a moderated work and hiring platform. The live service scope includes digital tasks, internships, local jobs, office work, field work, testing, feedback, content, research, moderation, and operational delivery tasks. The platform is not offered as a ratings marketplace, fake engagement exchange, artificial traffic source, or install-count service.",
      },
      {
        title: "Accounts and verification",
        body:
          "Users and businesses must provide accurate account information and keep login credentials secure. We may require identity, business, payout, or KYC verification before enabling sensitive features such as campaign publishing, job posting, wallet operations, refunds, or withdrawals.",
      },
      {
        title: "Allowed and prohibited work postings",
        body:
          "Businesses may publish only lawful, clearly described tasks and jobs with legitimate operational outcomes. Prohibited postings include paid public reviews or ratings, ad-click or traffic manipulation, follower/like/share/comment inflation, install-count campaigns not tied to genuine testing, deceptive promotions, spam, fake jobs, misleading hiring posts, and any task or role that violates third-party platform rules.",
      },
      {
        title: "Review, approval, hiring, and settlement",
        body:
          "Task submissions and job applications move through the platform workflow. Manager and admin decisions, fraud checks, and proof verification determine whether work or hiring actions are approved, rejected, escalated, or held for manual review. Rewards are credited only after approval under the campaign rules and platform controls. Job postings may require admin approval before going live, and applicant release to the business may depend on platform review state.",
      },
      {
        title: "Wallets, commissions, and withdrawals",
        body:
          "Displayed balances inside FreeEarnHub are internal ledger balances used for platform operations. User take-home amounts and platform commission may vary by task type, job type, and published share rules. Withdrawal requests and business refunds may be delayed, limited, or rejected where fraud, abuse, compliance, reconciliation, or documentation review is required. Job budget locking or deduction may occur only after the relevant admin approval flow, depending on the posting type.",
      },
      {
        title: "In-app messages, suspension, reversals, and liability",
        body:
          "Where enabled by the product flow, businesses and hired candidates may use in-app messages for job-related coordination. Those records may be visible to admins for safety, support, and compliance review. We may pause campaigns or jobs, suspend accounts, block withdrawals, or reverse unsettled credits when fraud, abuse, policy violations, or legal risk is detected. FreeEarnHub is provided on a best-effort basis and relies on third-party infrastructure and payment rails. Users and businesses remain responsible for local law, tax, hiring, and platform-rule compliance in their jurisdiction.",
      },
    ],
  },
  hi: {
    eyebrow: "कानूनी",
    title: "नियम और शर्तें",
    description:
      "ये शर्तें FreeEarnHub पर अकाउंट एक्सेस, work posting, hiring, in-app messaging, moderation और settlement को नियंत्रित करती हैं।",
    sections: [
      {
        title: "प्लेटफ़ॉर्म का दायरा",
        body:
          "FreeEarnHub एक moderated work और hiring platform के रूप में काम करता है। लाइव सर्विस स्कोप में digital tasks, internships, local jobs, office work, field work, testing, feedback, content, research, moderation और operational delivery tasks शामिल हैं। यह प्लेटफ़ॉर्म ratings marketplace, fake engagement exchange, artificial traffic source या install-count service के रूप में उपलब्ध नहीं है।",
      },
      {
        title: "अकाउंट और verification",
        body:
          "यूज़र और बिज़नेस को सही अकाउंट जानकारी देनी होगी और login credentials सुरक्षित रखने होंगे। Campaign publishing, job posting, wallet operations, refunds या withdrawals जैसे sensitive features सक्षम करने से पहले हम identity, business, payout या KYC verification मांग सकते हैं।",
      },
      {
        title: "अनुमत और प्रतिबंधित work postings",
        body:
          "बिज़नेस केवल lawful, clearly described और legitimate operational outcome वाले tasks और jobs ही publish कर सकते हैं। Paid public reviews या ratings, ad-click या traffic manipulation, follower/like/share/comment inflation, genuine testing से अलग install-count campaigns, deceptive promotions, spam, fake jobs, misleading hiring posts और third-party platform rules का उल्लंघन करने वाले tasks या roles प्रतिबंधित हैं।",
      },
      {
        title: "Review, approval, hiring और settlement",
        body:
          "Task submissions और job applications platform workflow के तहत moderated तरीके से आगे बढ़ते हैं। Manager और admin decisions, fraud checks और proof verification यह तय करते हैं कि work या hiring action approved, rejected, escalated या manual review के लिए hold होगा। Reward केवल approval के बाद ही credit होता है। Job postings live होने से पहले admin approval मांग सकते हैं, और applicant release भी review state पर निर्भर हो सकता है।",
      },
      {
        title: "Wallet, commission और withdrawals",
        body:
          "FreeEarnHub के अंदर दिखने वाले balances internal ledger balances हैं जिनका उपयोग platform operations के लिए होता है। User take-home amount और platform commission task type, job type तथा published share rules के अनुसार बदल सकते हैं। Fraud, abuse, compliance, reconciliation या documentation review की स्थिति में withdrawal requests और business refunds में delay, limit या rejection हो सकता है। Posting type के अनुसार job budget locking या deduction admin approval के बाद ही हो सकता है।",
      },
      {
        title: "In-app messages, suspension, reversal और liability",
        body:
          "जहाँ product flow अनुमति देता है, वहाँ business और hired candidate job-related coordination के लिए in-app messages का उपयोग कर सकते हैं। ये records safety, support और compliance review के लिए admin को दिखाई दे सकते हैं। Fraud, abuse, policy violation या legal risk मिलने पर हम campaigns या jobs pause कर सकते हैं, accounts suspend कर सकते हैं, withdrawals block कर सकते हैं या unsettled credits reverse कर सकते हैं। FreeEarnHub best-effort basis पर उपलब्ध है और third-party infrastructure तथा payment rails पर निर्भर करता है। Local law, tax, hiring और platform-rule compliance की जिम्मेदारी यूज़र और बिज़नेस की ही रहती है।",
      },
    ],
  },
  bn: {
    eyebrow: "আইনি",
    title: "শর্তাবলি",
    description:
      "এই শর্তগুলো FreeEarnHub-এ অ্যাকাউন্ট অ্যাক্সেস, work posting, hiring, in-app messaging, moderation এবং settlement নিয়ন্ত্রণ করে।",
    sections: [
      {
        title: "প্ল্যাটফর্মের পরিধি",
        body:
          "FreeEarnHub একটি moderated work এবং hiring platform হিসেবে কাজ করে। লাইভ সার্ভিস স্কোপে digital tasks, internships, local jobs, office work, field work, testing, feedback, content, research, moderation এবং operational delivery tasks অন্তর্ভুক্ত। এই প্ল্যাটফর্ম ratings marketplace, fake engagement exchange, artificial traffic source বা install-count service হিসেবে অফার করা হয় না।",
      },
      {
        title: "অ্যাকাউন্ট ও verification",
        body:
          "ব্যবহারকারী ও ব্যবসাকে সঠিক অ্যাকাউন্ট তথ্য দিতে হবে এবং login credentials নিরাপদ রাখতে হবে। Campaign publishing, job posting, wallet operations, refunds বা withdrawals-এর মতো sensitive features চালুর আগে আমরা identity, business, payout বা KYC verification চাইতে পারি।",
      },
      {
        title: "অনুমোদিত ও নিষিদ্ধ work postings",
        body:
          "ব্যবসা শুধুমাত্র lawful, clearly described এবং legitimate operational outcome-সহ task ও job publish করতে পারবে। Paid public reviews বা ratings, ad-click বা traffic manipulation, follower/like/share/comment inflation, genuine testing-এর বাইরে install-count campaigns, deceptive promotions, spam, fake jobs, misleading hiring posts এবং third-party platform rules ভঙ্গকারী task বা role নিষিদ্ধ।",
      },
      {
        title: "Review, approval, hiring ও settlement",
        body:
          "Task submission এবং job application প্ল্যাটফর্ম workflow-এর মাধ্যমে moderated ভাবে এগোয়। Manager ও admin decisions, fraud checks এবং proof verification ঠিক করে work বা hiring action approved, rejected, escalated বা manual review-এ hold হবে কি না। Reward শুধুমাত্র approval-এর পরে credit করা হয়। Job posting live হওয়ার আগে admin approval লাগতে পারে, এবং applicant release-ও review state-এর উপর নির্ভর করতে পারে।",
      },
      {
        title: "Wallet, commission ও withdrawals",
        body:
          "FreeEarnHub-এর ভেতরে দেখানো balances internal ledger balances, যা platform operations-এর জন্য ব্যবহৃত হয়। User take-home amount এবং platform commission task type, job type ও published share rules অনুযায়ী পরিবর্তিত হতে পারে। Fraud, abuse, compliance, reconciliation বা documentation review লাগলে withdrawal requests এবং business refunds delay, limit বা reject হতে পারে। Posting type অনুযায়ী job budget locking বা deduction admin approval-এর পরে হতে পারে।",
      },
      {
        title: "In-app messages, suspension, reversal ও liability",
        body:
          "যেখানে product flow অনুমতি দেয়, সেখানে business এবং hired candidate job-related coordination-এর জন্য in-app messages ব্যবহার করতে পারে। এই records safety, support এবং compliance review-এর জন্য admin দেখতে পারে। Fraud, abuse, policy violation বা legal risk ধরা পড়লে আমরা campaigns বা jobs pause করতে পারি, accounts suspend করতে পারি, withdrawals block করতে পারি অথবা unsettled credits reverse করতে পারি। FreeEarnHub best-effort basis-এ প্রদান করা হয় এবং third-party infrastructure ও payment rails-এর উপর নির্ভরশীল। Local law, tax, hiring এবং platform-rule compliance-এর দায় ব্যবহারকারী ও ব্যবসার উপরই থাকে।",
      },
    ],
  },
};

export default async function TermsPage() {
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
      </div>
    </PublicPageShell>
  );
}
