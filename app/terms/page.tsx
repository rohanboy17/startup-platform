import { getCmsValue } from "@/lib/cms";
import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

const FALLBACK_EN = `By using EarnHub, you agree to these terms. EarnHub is a micro-task marketplace for users and businesses.

Platform Description
Businesses post campaigns and users submit task proofs. Admin moderation is required for approvals and payout flow.

User Responsibilities
Users must provide genuine submissions, avoid abuse, and comply with anti-fraud checks. One user may submit only within configured platform limits.

Business Responsibilities
Businesses must maintain adequate wallet balance, publish legitimate campaigns, and accept moderation decisions.

Commission Structure
EarnHub charges a 30% platform commission on approved task rewards unless a different policy is formally announced.

Submission & Fraud Policy
Fraudulent, duplicate, or manipulated proofs may be rejected. Accounts can be flagged, suspended, or permanently disabled for abuse, suspicious IP activity, or policy violation.

Refund & Disputes
Refund eligibility is governed by the Refund Policy page. Disputes are reviewed by the platform team and resolved based on platform records and moderation logs.

Liability Limitation
EarnHub is provided on a best-effort basis. We are not liable for indirect losses, third party downtime, or payment rail disruptions beyond our control.`;

export default async function TermsPage() {
  const locale = await getLocale();
  const content = await getCmsValue<{ body: string }>("legal.terms", { body: "" });
  const body = content.body?.trim();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "कानूनी",
          title: "नियम और शर्तें",
          description: "ये शर्तें EarnHub पर प्लेटफ़ॉर्म एक्सेस, टास्क भागीदारी, कैंपेन पब्लिशिंग और पेआउट संचालन को नियंत्रित करती हैं।",
        }
      : locale === "bn"
        ? {
            eyebrow: "আইনি",
            title: "শর্তাবলি",
            description: "এই শর্তগুলো EarnHub প্ল্যাটফর্মে অ্যাক্সেস, টাস্ক অংশগ্রহণ, ক্যাম্পেইন প্রকাশ এবং পেআউট অপারেশন নিয়ন্ত্রণ করে।",
          }
        : {
            eyebrow: "Legal",
            title: "Terms & Conditions",
            description: "These terms govern platform access, task participation, campaign publishing, and payout operations on EarnHub.",
          };

  const fallback =
    locale === "hi"
      ? `EarnHub का उपयोग करके, आप इन शर्तों से सहमत होते हैं। EarnHub यूज़र्स और बिज़नेस के लिए एक माइक्रो-टास्क मार्केटप्लेस है।

प्लेटफ़ॉर्म विवरण
बिज़नेस कैंपेन पोस्ट करते हैं और यूज़र्स टास्क प्रूफ सबमिट करते हैं। अप्रूवल और पेआउट फ्लो के लिए एडमिन मॉडरेशन आवश्यक है।

यूज़र जिम्मेदारियां
यूज़र्स को वास्तविक सबमिशन देना होगा, दुरुपयोग से बचना होगा और एंटी-फ्रॉड चेक्स का पालन करना होगा। एक यूज़र कॉन्फ़िगर प्लेटफ़ॉर्म लिमिट्स के भीतर ही सबमिट कर सकता है।

बिज़नेस जिम्मेदारियां
बिज़नेस को पर्याप्त वॉलेट बैलेंस रखना होगा, वैध कैंपेन पब्लिश करने होंगे और मॉडरेशन निर्णय स्वीकार करने होंगे।

कमीशन संरचना
EarnHub अप्रूव्ड टास्क रिवॉर्ड पर 30% प्लेटफ़ॉर्म कमीशन चार्ज करता है, जब तक कि किसी आधिकारिक घोषणा में अलग नीति न बताई जाए।

सबमिशन और फ्रॉड नीति
फ्रॉड, डुप्लिकेट या मैनिपुलेटेड प्रूफ रिजेक्ट हो सकते हैं। दुरुपयोग, संदिग्ध IP गतिविधि या नीति उल्लंघन पर अकाउंट फ्लैग/सस्पेंड/डिसेबल किया जा सकता है।

रिफंड और विवाद
रिफंड पात्रता Refund Policy पेज के अनुसार है। विवाद प्लेटफ़ॉर्म रिकॉर्ड और मॉडरेशन लॉग के आधार पर रिव्यू/रिज़ॉल्व किए जाते हैं।

देयता सीमा
EarnHub best-effort आधार पर प्रदान किया जाता है। अप्रत्यक्ष नुकसान, थर्ड-पार्टी डाउनटाइम या भुगतान नेटवर्क बाधाओं के लिए हम जिम्मेदार नहीं हैं।`
      : locale === "bn"
        ? `EarnHub ব্যবহার করে আপনি এই শর্তগুলিতে সম্মত হন। EarnHub হলো ব্যবহারকারী ও ব্যবসার জন্য একটি মাইক্রো-টাস্ক মার্কেটপ্লেস।

প্ল্যাটফর্ম বিবরণ
ব্যবসা ক্যাম্পেইন পোস্ট করে এবং ব্যবহারকারীরা টাস্ক প্রুফ সাবমিট করে। অনুমোদন ও পেআউট ফ্লোর জন্য অ্যাডমিন মডারেশন প্রয়োজন।

ব্যবহারকারীর দায়িত্ব
ব্যবহারকারীকে সত্য প্রুফ জমা দিতে হবে, অপব্যবহার এড়িয়ে চলতে হবে এবং অ্যান্টি-ফ্রড চেক মেনে চলতে হবে। একজন ব্যবহারকারী কনফিগার করা প্ল্যাটফর্ম লিমিটের মধ্যে সাবমিট করতে পারবেন।

ব্যবসার দায়িত্ব
ব্যবসাকে পর্যাপ্ত ওয়ালেট ব্যালান্স রাখতে হবে, বৈধ ক্যাম্পেইন প্রকাশ করতে হবে এবং মডারেশন সিদ্ধান্ত গ্রহণ করতে হবে।

কমিশন কাঠামো
আনুষ্ঠানিক ঘোষণা ছাড়া EarnHub অনুমোদিত টাস্ক রিওয়ার্ডে ৩০% প্ল্যাটফর্ম কমিশন নেয়।

সাবমিশন ও ফ্রড নীতি
ফ্রড, ডুপ্লিকেট বা ম্যানিপুলেটেড প্রুফ প্রত্যাখ্যান হতে পারে। অপব্যবহার, সন্দেহজনক IP অ্যাক্টিভিটি বা নীতি লঙ্ঘনে অ্যাকাউন্ট ফ্ল্যাগ/সাসপেন্ড/ডিসেবল করা হতে পারে।

রিফান্ড ও বিরোধ
রিফান্ড যোগ্যতা Refund Policy পেজ অনুযায়ী। বিরোধ প্ল্যাটফর্ম রেকর্ড এবং মডারেশন লগের ভিত্তিতে রিভিউ ও সমাধান করা হয়।

দায়বদ্ধতার সীমা
EarnHub best-effort ভিত্তিতে দেওয়া হয়। পরোক্ষ ক্ষতি, তৃতীয় পক্ষের ডাউনটাইম বা পেমেন্ট নেটওয়ার্ক সমস্যার জন্য আমরা দায়ী নই।`
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
          <PolicySection title="Terms">
            {body.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </PolicySection>
        ) : (
          fallback.split("\n\n").map((paragraph, idx) => (
            <PolicySection key={idx} title={`Section ${idx + 1}`}>
              <p>{paragraph}</p>
            </PolicySection>
          ))
        )}
      </div>
    </PublicPageShell>
  );
}
