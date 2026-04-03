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
      "How FreeEarnHub collects, uses, protects, and retains account, proof, payout, and operations data.",
    sections: [
      {
        title: "What we collect",
        body:
          "We collect account details such as name, email, mobile number, role, profile preferences, campaign activity, proof submissions, payout details, IP and device-related security signals, and transaction metadata needed to run the platform responsibly.",
      },
      {
        title: "How we use data",
        body:
          "Data is used for authentication, fraud prevention, moderation, payout and refund processing, ledger integrity, dispute handling, support, platform safety, and legal compliance. Businesses and managers only see the data necessary to review or operate the work assigned to them.",
      },
      {
        title: "How data may be shared",
        body:
          "We do not sell personal data. Data may be shared with payment providers, infrastructure vendors, messaging providers, compliance reviewers, auditors, or regulators only when operationally necessary or legally required.",
      },
      {
        title: "Retention and security",
        body:
          "We retain records for fraud review, accounting, moderation history, support, and legal obligations for as long as reasonably required. We apply access controls, audit logging, transport encryption, and role-based restrictions, but no system can guarantee absolute security.",
      },
      {
        title: "Requests and responsibilities",
        body:
          "You should keep account information accurate and report unauthorized access quickly. Privacy, deletion, correction, or grievance requests can be raised through the support contact listed on the Contact page, subject to legal retention and compliance requirements.",
      },
    ],
  },
  hi: {
    eyebrow: "कानूनी",
    title: "प्राइवेसी नीति",
    description:
      "FreeEarnHub अकाउंट, प्रूफ, पेआउट और ऑपरेशन्स डेटा को कैसे एकत्र, उपयोग, सुरक्षित और संरक्षित करता है।",
    sections: [
      {
        title: "हम क्या एकत्र करते हैं",
        body:
          "हम नाम, ईमेल, मोबाइल नंबर, role, profile preferences, campaign activity, proof submissions, payout details, IP और device-related security signals तथा platform को जिम्मेदारी से चलाने के लिए आवश्यक transaction metadata एकत्र करते हैं।",
      },
      {
        title: "डेटा का उपयोग कैसे होता है",
        body:
          "डेटा का उपयोग authentication, fraud prevention, moderation, payout और refund processing, ledger integrity, dispute handling, support, platform safety और legal compliance के लिए किया जाता है। बिज़नेस और मैनेजर केवल वही डेटा देखते हैं जो उनके assigned work की review या operation के लिए आवश्यक है।",
      },
      {
        title: "डेटा कब साझा किया जा सकता है",
        body:
          "हम व्यक्तिगत डेटा बेचते नहीं हैं। डेटा केवल payment providers, infrastructure vendors, messaging providers, compliance reviewers, auditors या regulators के साथ तभी साझा किया जा सकता है जब operational necessity या कानूनी आवश्यकता हो।",
      },
      {
        title: "Retention और सुरक्षा",
        body:
          "हम fraud review, accounting, moderation history, support और legal obligations के लिए records उतनी अवधि तक रखते हैं जितनी उचित रूप से आवश्यक हो। हम access controls, audit logging, transport encryption और role-based restrictions लागू करते हैं, लेकिन कोई भी system पूर्ण सुरक्षा की गारंटी नहीं दे सकता।",
      },
      {
        title: "Requests और जिम्मेदारियाँ",
        body:
          "आपको अपनी account information सही रखनी चाहिए और unauthorized access की सूचना तुरंत देनी चाहिए। Privacy, deletion, correction या grievance requests Contact page पर दिए गए support channel के माध्यम से भेजी जा सकती हैं, हालांकि legal retention और compliance requirements लागू रहेंगी।",
      },
    ],
  },
  bn: {
    eyebrow: "আইনি",
    title: "প্রাইভেসি নীতি",
    description:
      "FreeEarnHub কীভাবে অ্যাকাউন্ট, প্রুফ, পেআউট এবং অপারেশনস ডেটা সংগ্রহ, ব্যবহার, সুরক্ষা এবং সংরক্ষণ করে।",
    sections: [
      {
        title: "আমরা কী সংগ্রহ করি",
        body:
          "আমরা নাম, ইমেইল, মোবাইল নম্বর, role, profile preferences, campaign activity, proof submissions, payout details, IP এবং device-related security signals এবং প্ল্যাটফর্ম দায়িত্বশীলভাবে চালাতে প্রয়োজনীয় transaction metadata সংগ্রহ করি।",
      },
      {
        title: "ডেটা কীভাবে ব্যবহার করি",
        body:
          "ডেটা authentication, fraud prevention, moderation, payout ও refund processing, ledger integrity, dispute handling, support, platform safety এবং legal compliance-এর জন্য ব্যবহার করা হয়। ব্যবসা ও ম্যানেজাররা কেবল সেই ডেটাই দেখে যা তাদের assigned work review বা operate করতে দরকার।",
      },
      {
        title: "ডেটা কখন শেয়ার হতে পারে",
        body:
          "আমরা ব্যক্তিগত ডেটা বিক্রি করি না। ডেটা শুধুমাত্র payment providers, infrastructure vendors, messaging providers, compliance reviewers, auditors বা regulators-এর সাথে operational necessity বা আইনি বাধ্যবাধকতার ক্ষেত্রে শেয়ার করা হতে পারে।",
      },
      {
        title: "Retention ও নিরাপত্তা",
        body:
          "Fraud review, accounting, moderation history, support এবং legal obligations-এর জন্য আমরা প্রয়োজন অনুযায়ী records সংরক্ষণ করি। আমরা access controls, audit logging, transport encryption এবং role-based restrictions ব্যবহার করি, তবে কোনো system সম্পূর্ণ নিরাপত্তার গ্যারান্টি দিতে পারে না।",
      },
      {
        title: "Requests ও দায়িত্ব",
        body:
          "আপনার account information সঠিক রাখা এবং unauthorized access দ্রুত রিপোর্ট করা উচিত। Privacy, deletion, correction বা grievance requests Contact page-এ দেওয়া support channel দিয়ে পাঠানো যেতে পারে, তবে legal retention এবং compliance requirements তখনও প্রযোজ্য থাকবে।",
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
