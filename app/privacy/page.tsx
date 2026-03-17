import { getCmsValue } from "@/lib/cms";
import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

const FALLBACK_EN = `We collect necessary data such as name, email, account role, task activity, IP address, and transaction metadata to operate the platform safely.

Payment operations are processed via Razorpay. We do not store raw card, UPI PIN, or other sensitive payment instrument details on our servers.

Data is used for authentication, fraud prevention, moderation, ledger integrity, and legal compliance.

We do not sell personal data. Data may be shared only with service providers or regulators when legally required.

We implement reasonable security controls such as access restrictions, audit logging, and transport encryption.`;

export default async function PrivacyPage() {
  const locale = await getLocale();
  const content = await getCmsValue<{ body: string }>("legal.privacy", { body: "" });
  const body = content.body?.trim();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "कानूनी",
          title: "प्राइवेसी पॉलिसी",
          description: "FreeEarnHub पर हम खाते और लेनदेन डेटा कैसे एकत्र, उपयोग, सुरक्षित और संरक्षित रखते हैं।",
        }
      : locale === "bn"
        ? {
            eyebrow: "আইনি",
            title: "প্রাইভেসি নীতি",
            description: "FreeEarnHub-এ আমরা অ্যাকাউন্ট ও লেনদেন ডেটা কীভাবে সংগ্রহ, ব্যবহার, সুরক্ষা ও সংরক্ষণ করি।",
          }
        : {
            eyebrow: "Legal",
            title: "Privacy Policy",
            description: "How we collect, use, protect, and retain account and transaction data on FreeEarnHub.",
          };

  const fallback =
    locale === "hi"
      ? `हम प्लेटफ़ॉर्म को सुरक्षित रूप से चलाने के लिए नाम, ईमेल, अकाउंट रोल, टास्क गतिविधि, IP एड्रेस और ट्रांज़ैक्शन मेटाडेटा जैसी आवश्यक जानकारी एकत्र करते हैं।

पेमेंट ऑपरेशन Razorpay के माध्यम से प्रोसेस होते हैं। हम अपने सर्वर पर कार्ड/UPI PIN या अन्य संवेदनशील भुगतान विवरण स्टोर नहीं करते।

डेटा का उपयोग ऑथेंटिकेशन, फ्रॉड प्रिवेंशन, मॉडरेशन, लेजर इंटेग्रिटी और कानूनी अनुपालन के लिए किया जाता है।

हम व्यक्तिगत डेटा नहीं बेचते। डेटा केवल आवश्यक सेवा प्रदाताओं या कानूनी रूप से आवश्यक होने पर नियामकों के साथ साझा किया जा सकता है।

हम उचित सुरक्षा नियंत्रण लागू करते हैं जैसे एक्सेस प्रतिबंध, ऑडिट लॉगिंग और ट्रांसपोर्ट एन्क्रिप्शन।`
      : locale === "bn"
        ? `প্ল্যাটফর্ম নিরাপদভাবে পরিচালনা করতে আমরা নাম, ইমেইল, অ্যাকাউন্ট রোল, টাস্ক অ্যাক্টিভিটি, IP ঠিকানা এবং ট্রানজ্যাকশন মেটাডেটা সংগ্রহ করি।

পেমেন্ট অপারেশন Razorpay-এর মাধ্যমে প্রসেস হয়। আমরা আমাদের সার্ভারে কার্ড/UPI PIN বা অন্যান্য সংবেদনশীল পেমেন্ট ডিটেইলস সংরক্ষণ করি না।

ডেটা ব্যবহার করা হয় অথেনটিকেশন, ফ্রড প্রিভেনশন, মডারেশন, লেজার ইন্টিগ্রিটি এবং আইনগত কমপ্লায়েন্সের জন্য।

আমরা ব্যক্তিগত ডেটা বিক্রি করি না। আইনগতভাবে প্রয়োজন হলে কেবল প্রয়োজনীয় সার্ভিস প্রোভাইডার বা নিয়ন্ত্রকদের সাথে ডেটা শেয়ার হতে পারে।

আমরা যুক্তিসঙ্গত সিকিউরিটি কন্ট্রোল ব্যবহার করি যেমন অ্যাক্সেস রেস্ট্রিকশন, অডিট লগিং এবং ট্রান্সপোর্ট এনক্রিপশন।`
        : FALLBACK_EN;

  return (
    <PublicPageShell
      eyebrow={meta.eyebrow}
      title={meta.title}
      description={meta.description}
      lastUpdated="March 11, 2026"
    >
      <div className="space-y-4">
        {locale === "en" && body ? (
          <PolicySection title="Privacy Policy">
            {body.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </PolicySection>
        ) : (
          fallback.split("\n\n").map((paragraph, idx) => (
            <PolicySection key={idx} title={`Privacy Clause ${idx + 1}`}>
              <p>{paragraph}</p>
            </PolicySection>
          ))
        )}
      </div>
    </PublicPageShell>
  );
}

