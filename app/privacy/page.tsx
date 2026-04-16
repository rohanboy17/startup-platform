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
    title: "Privacy Policy",
    description:
      "How FreeEarnHub collects, uses, protects, and retains account, proof, payout, hiring, and in-app message data.",
    sections: [
      {
        title: "What we collect",
        body:
          "We collect account details such as name, email, mobile number, role, profile preferences, campaign activity, job and application activity, proof submissions, payout details, in-app job message history, IP and device-related security signals, and transaction metadata needed to run the platform responsibly.",
      },
      {
        title: "How we use data",
        body:
          "Data is used for authentication, fraud prevention, moderation, payout and refund processing, hiring workflow review, in-app message oversight, ledger integrity, dispute handling, support, platform safety, and legal compliance. Businesses, managers, and admins only see the data necessary for the work or review scope assigned to them.",
      },
      {
        title: "How data may be shared",
        body:
          "We do not sell personal data. Data may be shared with payment providers, infrastructure vendors, messaging providers, compliance reviewers, auditors, or regulators only when operationally necessary or legally required. Business-to-candidate in-app job messages may be visible to admins for safety, support, and compliance review.",
      },
      {
        title: "Retention and security",
        body:
          "We retain records for fraud review, accounting, moderation history, hiring review, message oversight, support, and legal obligations for as long as reasonably required. We apply access controls, audit logging, transport encryption, and role-based restrictions, but no system can guarantee absolute security.",
      },
      {
        title: "Requests and responsibilities",
        body:
          "You should keep account information accurate and report unauthorized access quickly. Privacy, deletion, correction, or grievance requests can be raised through the support contact listed on the Contact page, subject to legal retention, hiring records, and compliance requirements.",
      },
    ],
  },
  hi: {
    eyebrow: "कानूनी",
    title: "प्राइवेसी नीति",
    description:
      "FreeEarnHub अकाउंट, proof, payout, hiring और in-app message data को कैसे collect, use, protect और retain करता है।",
    sections: [
      {
        title: "हम क्या एकत्र करते हैं",
        body:
          "हम name, email, mobile number, role, profile preferences, campaign activity, job और application activity, proof submissions, payout details, in-app job message history, IP और device-related security signals तथा platform को जिम्मेदारी से चलाने के लिए आवश्यक transaction metadata collect करते हैं।",
      },
      {
        title: "डेटा का उपयोग कैसे होता है",
        body:
          "डेटा का उपयोग authentication, fraud prevention, moderation, payout और refund processing, hiring workflow review, in-app message oversight, ledger integrity, dispute handling, support, platform safety और legal compliance के लिए किया जाता है। Business, manager और admin केवल वही data देखते हैं जो उनके assigned review या work scope के लिए आवश्यक है।",
      },
      {
        title: "डेटा कब साझा किया जा सकता है",
        body:
          "हम personal data बेचते नहीं हैं। Data केवल payment providers, infrastructure vendors, messaging providers, compliance reviewers, auditors या regulators के साथ तभी share किया जा सकता है जब operational necessity या कानूनी आवश्यकता हो। Business-to-candidate in-app job messages safety, support और compliance review के लिए admin को दिखाई दे सकते हैं।",
      },
      {
        title: "Retention और सुरक्षा",
        body:
          "हम fraud review, accounting, moderation history, hiring review, message oversight, support और legal obligations के लिए records उतनी अवधि तक रखते हैं जितनी उचित रूप से आवश्यक हो। हम access controls, audit logging, transport encryption और role-based restrictions लागू करते हैं, लेकिन कोई भी system पूर्ण सुरक्षा की गारंटी नहीं दे सकता।",
      },
      {
        title: "Requests और जिम्मेदारियाँ",
        body:
          "आपको अपनी account information सही रखनी चाहिए और unauthorized access की सूचना तुरंत देनी चाहिए। Privacy, deletion, correction या grievance requests Contact page पर दिए गए support channel के माध्यम से भेजी जा सकती हैं, हालांकि legal retention, hiring records और compliance requirements लागू रहेंगी।",
      },
    ],
  },
  bn: {
    eyebrow: "আইনি",
    title: "প্রাইভেসি নীতি",
    description:
      "FreeEarnHub কীভাবে account, proof, payout, hiring এবং in-app message data সংগ্রহ, ব্যবহার, সুরক্ষা এবং সংরক্ষণ করে।",
    sections: [
      {
        title: "আমরা কী সংগ্রহ করি",
        body:
          "আমরা name, email, mobile number, role, profile preferences, campaign activity, job এবং application activity, proof submissions, payout details, in-app job message history, IP এবং device-related security signals এবং প্ল্যাটফর্ম দায়িত্বশীলভাবে চালাতে প্রয়োজনীয় transaction metadata সংগ্রহ করি।",
      },
      {
        title: "ডেটা কীভাবে ব্যবহার করি",
        body:
          "ডেটা authentication, fraud prevention, moderation, payout ও refund processing, hiring workflow review, in-app message oversight, ledger integrity, dispute handling, support, platform safety এবং legal compliance-এর জন্য ব্যবহার করা হয়। Business, manager এবং admin কেবল সেই data-ই দেখে যা তাদের assigned review বা work scope-এর জন্য দরকার।",
      },
      {
        title: "ডেটা কখন শেয়ার হতে পারে",
        body:
          "আমরা personal data বিক্রি করি না। Data শুধুমাত্র payment providers, infrastructure vendors, messaging providers, compliance reviewers, auditors বা regulators-এর সাথে operational necessity বা আইনি বাধ্যবাধকতার ক্ষেত্রে share করা হতে পারে। Business-to-candidate in-app job messages safety, support এবং compliance review-এর জন্য admin দেখতে পারে।",
      },
      {
        title: "Retention ও নিরাপত্তা",
        body:
          "Fraud review, accounting, moderation history, hiring review, message oversight, support এবং legal obligations-এর জন্য আমরা প্রয়োজন অনুযায়ী records সংরক্ষণ করি। আমরা access controls, audit logging, transport encryption এবং role-based restrictions ব্যবহার করি, তবে কোনো system সম্পূর্ণ নিরাপত্তার গ্যারান্টি দিতে পারে না।",
      },
      {
        title: "Requests ও দায়িত্ব",
        body:
          "আপনার account information সঠিক রাখা এবং unauthorized access দ্রুত রিপোর্ট করা উচিত। Privacy, deletion, correction বা grievance requests Contact page-এ দেওয়া support channel দিয়ে পাঠানো যেতে পারে, তবে legal retention, hiring records এবং compliance requirements তখনও প্রযোজ্য থাকবে।",
      },
    ],
  },
};

export default async function PrivacyPage() {
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
