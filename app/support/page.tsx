import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@freeearnhub.in";

export default async function SupportPage() {
  const locale = await getLocale();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "सपोर्ट सेंटर",
          title: "हम कैसे मदद कर सकते हैं?",
          description: "अकाउंट एक्सेस, विथड्रॉल, कैंपेन बिलिंग, KYC और मॉडरेशन समस्याओं के लिए सहायता प्राप्त करें।",
          accountTitle: "अकाउंट और सुरक्षा",
          walletTitle: "वॉलेट, फंडिंग और पेआउट",
          campaignTitle: "कैंपेन और सबमिशन सपोर्ट",
          contactTitle: "सपोर्ट से संपर्क करें",
          response: "रिस्पॉन्स SLA: आमतौर पर 24 से 48 बिज़नेस घंटे के भीतर।",
          bulletsAccount: ["लॉगिन और 2FA समस्याएं", "सस्पेंड/रिस्ट्रिक्टेड अकाउंट सपोर्ट", "पासवर्ड रीसेट गाइडेंस"],
          bulletsWallet: ["बिज़नेस वॉलेट डिपॉज़िट/रिफंड", "यूज़र विथड्रॉल स्टेटस और देरी", "लेजर/ट्रांज़ैक्शन स्पष्टीकरण"],
          bulletsCampaign: ["कैंपेन अप्रूवल और KYC चेक", "सबमिशन रिव्यू रिज़ल्ट", "रिजेक्शन कारण स्पष्टीकरण"],
          emailLabel: "ईमेल:",
        }
      : locale === "bn"
        ? {
            eyebrow: "সাপোর্ট সেন্টার",
            title: "আমরা কীভাবে সাহায্য করতে পারি?",
            description: "অ্যাকাউন্ট অ্যাক্সেস, উইথড্র, ক্যাম্পেইন বিলিং, KYC এবং মডারেশন সংক্রান্ত সাপোর্ট নিন।",
            accountTitle: "অ্যাকাউন্ট ও সিকিউরিটি",
            walletTitle: "ওয়ালেট, ফান্ডিং ও পেআউট",
            campaignTitle: "ক্যাম্পেইন ও সাবমিশন সাপোর্ট",
            contactTitle: "সাপোর্টে যোগাযোগ",
            response: "রেসপন্স SLA: সাধারণত ২৪ থেকে ৪৮ কর্মঘণ্টার মধ্যে।",
            bulletsAccount: ["লগইন ও 2FA সমস্যা", "সাসপেন্ড/রেস্ট্রিক্টেড অ্যাকাউন্ট সাপোর্ট", "পাসওয়ার্ড রিসেট গাইডেন্স"],
            bulletsWallet: ["বিজনেস ওয়ালেট ডিপোজিট/রিফান্ড", "ইউজার উইথড্র স্ট্যাটাস ও দেরি", "লেজার/ট্রানজ্যাকশন ব্যাখ্যা"],
            bulletsCampaign: ["ক্যাম্পেইন অনুমোদন ও KYC চেক", "সাবমিশন রিভিউ ফলাফল", "রিজেকশন কারণ ব্যাখ্যা"],
            emailLabel: "ইমেইল:",
          }
        : {
            eyebrow: "Support Center",
            title: "How Can We Help?",
            description: "Get support for account access, withdrawals, campaign billing, KYC, and moderation issues.",
            accountTitle: "Account & Security",
            walletTitle: "Wallet, Funding & Payouts",
            campaignTitle: "Campaign & Submission Support",
            contactTitle: "Contact Support",
            response: "Response SLA: usually within 24 to 48 business hours.",
            bulletsAccount: ["Login and 2FA issues", "Suspended or restricted account support", "Password reset guidance"],
            bulletsWallet: ["Business wallet deposits/refunds", "User withdrawal status and delays", "Ledger and transaction clarification"],
            bulletsCampaign: ["Campaign approval and KYC checks", "Submission review outcomes", "Rejection reason clarification"],
            emailLabel: "Email:",
          };

  return (
    <PublicPageShell
      eyebrow={meta.eyebrow}
      title={meta.title}
      description={meta.description}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PolicySection title={meta.accountTitle}>
          <ul className="list-disc space-y-1 pl-5">
            {meta.bulletsAccount.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </PolicySection>
        <PolicySection title={meta.walletTitle}>
          <ul className="list-disc space-y-1 pl-5">
            {meta.bulletsWallet.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </PolicySection>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <PolicySection title={meta.campaignTitle}>
          <ul className="list-disc space-y-1 pl-5">
            {meta.bulletsCampaign.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </PolicySection>
        <PolicySection title={meta.contactTitle}>
          <p>
            {meta.emailLabel}{" "}
            <a className="font-medium text-foreground underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>{meta.response}</p>
        </PolicySection>
      </div>
    </PublicPageShell>
  );
}
