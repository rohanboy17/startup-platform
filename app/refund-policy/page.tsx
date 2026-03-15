import { getCmsValue } from "@/lib/cms";
import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

const FALLBACK_EN = `Businesses may request refunds for unused campaign budget that has not been spent on approved submissions.

Once a submission is approved and reward settlement is completed, that amount is not refundable.

Withdrawals are reviewed and typically processed within 3 to 5 business days, subject to compliance and fraud checks.

For disputes, contact support with relevant transaction IDs and account details for manual review.`;

export default async function RefundPolicyPage() {
  const locale = await getLocale();
  const content = await getCmsValue<{ body: string }>("legal.refund", { body: "" });
  const body = content.body?.trim();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "कानूनी",
          title: "रिफंड पॉलिसी",
          description: "कैंपेन बैलेंस, सेटलमेंट सीमाएँ और विथड्रॉल प्रोसेसिंग टाइमलाइन के लिए रिफंड नियम।",
        }
      : locale === "bn"
        ? {
            eyebrow: "আইনি",
            title: "রিফান্ড নীতি",
            description: "ক্যাম্পেইন ব্যালান্স, সেটেলমেন্ট সীমা এবং উইথড্র প্রক্রিয়াকরণ সময়সীমা সম্পর্কিত নীতি।",
          }
        : {
            eyebrow: "Legal",
            title: "Refund Policy",
            description: "Refund handling for campaign balances, settlement boundaries, and withdrawal processing timelines.",
          };

  const fallback =
    locale === "hi"
      ? `बिज़नेस अप्रयुक्त कैंपेन बजट के लिए रिफंड अनुरोध कर सकते हैं जो अप्रूव्ड सबमिशन पर खर्च नहीं हुआ है।

एक बार सबमिशन अप्रूव हो जाए और रिवॉर्ड सेटलमेंट पूरा हो जाए, वह राशि रिफंड योग्य नहीं होती।

विथड्रॉल रिक्वेस्ट मैन्युअली रिव्यू होती हैं और आमतौर पर 3 से 5 बिज़नेस डेज़ में प्रोसेस होती हैं, कंप्लायंस और फ्रॉड चेक के अधीन।

विवाद के लिए, सपोर्ट से संपर्क करें और संबंधित ट्रांज़ैक्शन IDs तथा अकाउंट विवरण साझा करें ताकि मैन्युअल रिव्यू हो सके।`
      : locale === "bn"
        ? `ব্যবসা অনুমোদিত সাবমিশনে খরচ না হওয়া অব্যবহৃত ক্যাম্পেইন বাজেটের জন্য রিফান্ড অনুরোধ করতে পারে।

একবার কোনো সাবমিশন অনুমোদিত হয়ে রিওয়ার্ড সেটেলমেন্ট সম্পন্ন হলে, সেই পরিমাণ রিফান্ডযোগ্য নয়।

উইথড্র রিকোয়েস্ট ম্যানুয়ালি রিভিউ করা হয় এবং সাধারণত ৩ থেকে ৫ কর্মদিবসের মধ্যে প্রসেস হয়, কমপ্লায়েন্স ও ফ্রড চেক সাপেক্ষে।

বিরোধের ক্ষেত্রে, সংশ্লিষ্ট ট্রানজ্যাকশন আইডি ও অ্যাকাউন্ট ডিটেইলসসহ সাপোর্টে যোগাযোগ করুন।`
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
          <PolicySection title="Refund Rules">
            {body.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </PolicySection>
        ) : (
          fallback.split("\n\n").map((paragraph, idx) => (
            <PolicySection key={idx} title={`Refund Rule ${idx + 1}`}>
              <p>{paragraph}</p>
            </PolicySection>
          ))
        )}
      </div>
    </PublicPageShell>
  );
}
