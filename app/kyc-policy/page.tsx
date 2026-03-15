import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

export default async function KycPolicyPage() {
  const locale = await getLocale();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "अनुपालन",
          title: "KYC नीति",
          description: "बिज़नेस एक्सेस, फ्रॉड प्रिवेंशन और पेआउट सुरक्षा के लिए KYC सत्यापन नियम।",
        }
      : locale === "bn"
        ? {
            eyebrow: "কমপ্লায়েন্স",
            title: "KYC নীতি",
            description: "ব্যবসায়িক অ্যাক্সেস, ফ্রড প্রতিরোধ এবং পেআউট নিরাপত্তার জন্য KYC যাচাইকরণ নীতি।",
          }
        : {
            eyebrow: "Compliance",
            title: "KYC Policy",
            description: "Know-your-customer verification rules for business access, fraud prevention, and payout safety.",
          };

  const sections =
    locale === "hi"
      ? [
          {
            title: "KYC कब आवश्यक है",
            body: "बिज़नेस कैंपेन संचालन, उच्च-जोखिम पेआउट वर्कफ़्लो, संदिग्ध गतिविधि फ्लैग, या नियामकीय दायित्वों के लिए KYC आवश्यक हो सकता है।",
          },
          {
            title: "कौन-सी जानकारी मांगी जा सकती है",
            bullets: [
              "कानूनी बिज़नेस नाम और संपर्क विवरण",
              "रजिस्टर्ड पता और सहायक दस्तावेज़",
              "जहाँ लागू हो वहाँ टैक्स पहचान",
              "अधिकृत प्रतिनिधियों के सत्यापन दस्तावेज़",
            ],
          },
          {
            title: "वेरिफ़िकेशन परिणाम",
            body: "अकाउंट अप्रूव, रिजेक्ट या री-सबमिशन के लिए कहा जा सकता है। पेंडिंग KYC से रिव्यू पूरा होने तक कैंपेन क्रिएशन या पेआउट ऑपरेशन सीमित हो सकते हैं।",
          },
          {
            title: "डेटा हैंडलिंग",
            body: "KYC डेटा सख्त एक्सेस कंट्रोल के साथ प्रोसेस होता है और केवल हमारी Privacy Policy में परिभाषित कानूनी/रिस्क/अनुपालन दायित्वों के लिए ही रखा जाता है।",
          },
        ]
      : locale === "bn"
        ? [
            {
              title: "কখন KYC প্রয়োজন",
              body: "ব্যবসায়িক ক্যাম্পেইন অপারেশন, উচ্চ-ঝুঁকির পেআউট ওয়ার্কফ্লো, সন্দেহজনক অ্যাক্টিভিটি ফ্ল্যাগ, বা নিয়ন্ত্রক বাধ্যবাধকতার জন্য KYC প্রয়োজন হতে পারে।",
            },
            {
              title: "কোন তথ্য চাওয়া হতে পারে",
              bullets: [
                "আইনি ব্যবসার নাম ও যোগাযোগ তথ্য",
                "রেজিস্টার্ড ঠিকানা ও সহায়ক ডকুমেন্ট",
                "প্রযোজ্য হলে ট্যাক্স আইডেন্টিফায়ার",
                "অনুমোদিত প্রতিনিধিদের যাচাইকরণ ডকুমেন্ট",
              ],
            },
            {
              title: "যাচাইকরণ ফলাফল",
              body: "অ্যাকাউন্ট অনুমোদিত, প্রত্যাখ্যাত বা পুনরায় সাবমিশনের জন্য বলা হতে পারে। KYC পেন্ডিং থাকলে রিভিউ সম্পন্ন না হওয়া পর্যন্ত ক্যাম্পেইন তৈরি বা পেআউট অপারেশন সীমিত হতে পারে।",
            },
            {
              title: "ডেটা হ্যান্ডলিং",
              body: "KYC ডেটা কঠোর অ্যাক্সেস কন্ট্রোলসহ প্রসেস করা হয় এবং আমাদের Privacy Policy-তে নির্ধারিত আইনগত/রিস্ক/কমপ্লায়েন্স দায়বদ্ধতার জন্যই সংরক্ষণ করা হয়।",
            },
          ]
        : [
            {
              title: "When KYC Is Required",
              body: "KYC may be required for business campaign operations, higher-risk payout workflows, suspicious activity flags, or regulatory obligations.",
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
              body: "Accounts may be approved, rejected, or asked for re-submission. Pending KYC can limit campaign creation or payout operations until review is complete.",
            },
            {
              title: "Data Handling",
              body: "KYC data is processed with strict access controls and retained only for legal, risk, and compliance obligations defined in our Privacy Policy.",
            },
          ];

  return (
    <PublicPageShell
      eyebrow={meta.eyebrow}
      title={meta.title}
      description={meta.description}
      lastUpdated="March 11, 2026"
    >
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
