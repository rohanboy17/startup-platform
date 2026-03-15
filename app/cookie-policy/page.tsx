import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

export default async function CookiePolicyPage() {
  const locale = await getLocale();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "अनुपालन",
          title: "कुकी नीति",
          description: "सुरक्षित सत्र चलाने और प्लेटफ़ॉर्म विश्वसनीयता सुधारने के लिए कुकीज़ और समान तकनीकों का उपयोग।",
        }
      : locale === "bn"
        ? {
            eyebrow: "কমপ্লায়েন্স",
            title: "কুকি নীতি",
            description: "নিরাপদ সেশন চালাতে এবং প্ল্যাটফর্ম নির্ভরযোগ্যতা উন্নত করতে কুকি ও অনুরূপ প্রযুক্তির ব্যবহার।",
          }
        : {
            eyebrow: "Compliance",
            title: "Cookie Policy",
            description: "How cookies and similar technologies are used to run secure sessions and improve platform reliability.",
          };

  const sections =
    locale === "hi"
      ? [
          {
            title: "आवश्यक कुकीज़",
            body: "आवश्यक कुकीज़ साइन-इन सत्र, ऑथ स्टेट, अकाउंट सुरक्षा और प्रोटेक्टेड रूट्स के लिए उपयोग होती हैं। इन्हें डिसेबल करने से मुख्य फीचर्स तक पहुंच बाधित हो सकती है।",
          },
          {
            title: "परफ़ॉर्मेंस और प्रेफरेंस कुकीज़",
            body: "हम उत्पाद स्थिरता, इंटरफ़ेस गुणवत्ता और वर्कफ़्लो गति सुधारने के लिए सीमित एनालिटिक्स और प्रेफरेंस स्टोरेज का उपयोग कर सकते हैं।",
          },
          {
            title: "कुकीज़ कैसे नियंत्रित करें",
            body: "आप ब्राउज़र कंट्रोल से कुकीज़ मैनेज कर सकते हैं। सभी कुकीज़ ब्लॉक करने से अनुभव खराब हो सकता है और महत्वपूर्ण ऑपरेशंस सीमित हो सकते हैं।",
          },
        ]
      : locale === "bn"
        ? [
            {
              title: "প্রয়োজনীয় কুকি",
              body: "প্রয়োজনীয় কুকি সাইন-ইন সেশন, অথ স্টেট, অ্যাকাউন্ট সিকিউরিটি এবং প্রোটেক্টেড রুটের জন্য ব্যবহৃত হয়। এগুলো বন্ধ করলে মূল ফিচারগুলো ব্যবহার করা কঠিন হতে পারে।",
            },
            {
              title: "পারফরম্যান্স ও প্রেফারেন্স কুকি",
              body: "পণ্য স্থিতিশীলতা, ইন্টারফেস কোয়ালিটি এবং ওয়ার্কফ্লো গতি উন্নত করতে আমরা সীমিত অ্যানালিটিক্স ও প্রেফারেন্স স্টোরেজ ব্যবহার করতে পারি।",
            },
            {
              title: "কুকি কীভাবে নিয়ন্ত্রণ করবেন",
              body: "আপনি ব্রাউজারের কন্ট্রোল থেকে কুকি ম্যানেজ করতে পারেন। সব কুকি ব্লক করলে অভিজ্ঞতা খারাপ হতে পারে এবং গুরুত্বপূর্ণ অপারেশন সীমিত হতে পারে।",
            },
          ]
        : [
            {
              title: "Essential Cookies",
              body: "Essential cookies are used for sign-in sessions, auth state, account security, and protected routes. Disabling essential cookies may prevent access to core features.",
            },
            {
              title: "Performance and Preference Cookies",
              body: "We may use limited analytics and preference storage to improve product stability, interface quality, and workflow speed.",
            },
            {
              title: "How to Control Cookies",
              body: "You can manage cookies through browser controls. Blocking all cookies may degrade user experience and restrict key platform operations.",
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
            <p>{section.body}</p>
          </PolicySection>
        ))}
      </div>
    </PublicPageShell>
  );
}
