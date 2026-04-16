import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

export default async function KycPolicyPage() {
  const locale = await getLocale();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "अनुपालन",
          title: "KYC नीति",
          description: "Business access, job posting, fraud prevention और payout safety के लिए KYC verification rules।",
        }
      : locale === "bn"
        ? {
            eyebrow: "কমপ্লায়েন্স",
            title: "KYC নীতি",
            description: "Business access, job posting, fraud prevention এবং payout safety-এর জন্য KYC verification rules।",
          }
        : {
            eyebrow: "Compliance",
            title: "KYC Policy",
            description: "Know-your-customer verification rules for business access, job posting, fraud prevention, and payout safety.",
          };

  const sections =
    locale === "hi"
      ? [
          {
            title: "KYC कब आवश्यक है",
            body: "Business campaign operations, job posting approval, higher-risk payout workflows, suspicious activity flags या regulatory obligations के लिए KYC आवश्यक हो सकता है।",
          },
          {
            title: "कौन-सी जानकारी मांगी जा सकती है",
            bullets: [
              "Legal business name और contact details",
              "Registered address और supporting documents",
              "जहाँ लागू हो वहाँ tax identifiers",
              "Authorized representatives के verification documents",
            ],
          },
          {
            title: "Verification outcomes",
            body: "Accounts approved, rejected या re-submission के लिए marked हो सकते हैं। Pending KYC की स्थिति में campaign creation, job posting, funding use या payout operations review पूरा होने तक सीमित हो सकते हैं।",
          },
          {
            title: "Data handling",
            body: "KYC data strict access controls के साथ process होता है और केवल हमारी Privacy Policy में परिभाषित legal, risk और compliance obligations के लिए रखा जाता है।",
          },
        ]
      : locale === "bn"
        ? [
            {
              title: "KYC কখন প্রয়োজন",
              body: "Business campaign operations, job posting approval, higher-risk payout workflows, suspicious activity flags বা regulatory obligations-এর জন্য KYC প্রয়োজন হতে পারে।",
            },
            {
              title: "কোন তথ্য চাওয়া হতে পারে",
              bullets: [
                "Legal business name এবং contact details",
                "Registered address এবং supporting documents",
                "প্রযোজ্য হলে tax identifiers",
                "Authorized representatives-এর verification documents",
              ],
            },
            {
              title: "Verification outcomes",
              body: "Accounts approved, rejected বা re-submission-এর জন্য marked হতে পারে। Pending KYC থাকলে review সম্পন্ন না হওয়া পর্যন্ত campaign creation, job posting, funding use বা payout operations সীমিত হতে পারে।",
            },
            {
              title: "Data handling",
              body: "KYC data strict access controls-এর মাধ্যমে process করা হয় এবং শুধু আমাদের Privacy Policy-তে নির্ধারিত legal, risk এবং compliance obligations-এর জন্য রাখা হয়।",
            },
          ]
        : [
            {
              title: "When KYC Is Required",
              body: "KYC may be required for business campaign operations, job posting approval, higher-risk payout workflows, suspicious activity flags, or regulatory obligations.",
            },
            {
              title: "What Information May Be Requested",
              bullets: [
                "Legal business name and contact details",
                "Registered address and supporting documentation",
                "Tax identifiers where applicable",
                "Verification documents for authorized representatives",
              ],
            },
            {
              title: "Verification Outcomes",
              body: "Accounts may be approved, rejected, or asked for re-submission. Pending KYC can limit campaign creation, job posting, funding use, or payout operations until review is complete.",
            },
            {
              title: "Data Handling",
              body: "KYC data is processed with strict access controls and retained only for legal, risk, and compliance obligations defined in our Privacy Policy.",
            },
          ];

  return (
    <PublicPageShell eyebrow={meta.eyebrow} title={meta.title} description={meta.description} lastUpdated="April 16, 2026">
      <div className="space-y-4">
        {sections.map((section) => (
          <PolicySection key={section.title} title={section.title}>
            {"bullets" in section ? (
              <ul className="list-disc space-y-1 pl-5">
                {(section.bullets || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>{(section as { body: string }).body}</p>
            )}
          </PolicySection>
        ))}
      </div>
    </PublicPageShell>
  );
}
