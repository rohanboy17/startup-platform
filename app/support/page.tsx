import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";
import { SUPPORT_EMAIL } from "@/lib/public-links";

export default async function SupportPage() {
  const locale = await getLocale();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "सपोर्ट सेंटर",
          title: "हम कैसे मदद कर सकते हैं?",
          description: "अकाउंट एक्सेस, विथड्रॉ, कैंपेन billing, KYC और moderation issues के लिए सहायता प्राप्त करें।",
          accountTitle: "अकाउंट और सुरक्षा",
          walletTitle: "Wallet, funding और payouts",
          campaignTitle: "Campaign और submission support",
          contactTitle: "सपोर्ट से संपर्क करें",
          response: "Response SLA: आमतौर पर 24 से 48 business hours के भीतर।",
          bulletsAccount: ["Login और 2FA issues", "Suspended या restricted account support", "Password reset guidance"],
          bulletsWallet: ["Business wallet deposits या refunds", "User withdrawal status और delays", "Ledger और transaction clarification"],
          bulletsCampaign: ["Campaign approval और KYC checks", "Submission review outcomes", "Rejection reason clarification"],
          emailLabel: "ईमेल:",
        }
      : locale === "bn"
        ? {
            eyebrow: "সাপোর্ট সেন্টার",
            title: "আমরা কীভাবে সাহায্য করতে পারি?",
            description: "অ্যাকাউন্ট access, withdrawals, campaign billing, KYC এবং moderation issues-এর জন্য সাহায্য নিন।",
            accountTitle: "অ্যাকাউন্ট ও নিরাপত্তা",
            walletTitle: "Wallet, funding ও payouts",
            campaignTitle: "Campaign ও submission support",
            contactTitle: "সাপোর্টে যোগাযোগ",
            response: "Response SLA: সাধারণত 24 থেকে 48 business hours-এর মধ্যে।",
            bulletsAccount: ["Login ও 2FA issues", "Suspended বা restricted account support", "Password reset guidance"],
            bulletsWallet: ["Business wallet deposits বা refunds", "User withdrawal status ও delays", "Ledger ও transaction clarification"],
            bulletsCampaign: ["Campaign approval ও KYC checks", "Submission review outcomes", "Rejection reason clarification"],
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
    <PublicPageShell eyebrow={meta.eyebrow} title={meta.title} description={meta.description} lastUpdated="April 3, 2026">
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
