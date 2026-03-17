import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

export default async function DisclaimerPage() {
  const locale = await getLocale();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "अनुपालन",
          title: "डिस्क्लेमर",
          description: "FreeEarnHub प्लेटफ़ॉर्म उपयोग के लिए महत्वपूर्ण सीमाएँ और संचालन सीमाबंध।",
        }
      : locale === "bn"
        ? {
            eyebrow: "কমপ্লায়েন্স",
            title: "ডিসক্লেইমার",
            description: "FreeEarnHub প্ল্যাটফর্ম ব্যবহারের জন্য গুরুত্বপূর্ণ সীমাবদ্ধতা ও অপারেশনাল সীমা।",
          }
        : {
            eyebrow: "Compliance",
            title: "Disclaimer",
            description: "Important limitations and operational boundaries for using the FreeEarnHub platform.",
          };

  const sections =
    locale === "hi"
      ? [
          {
            title: "सेवा का दायरा",
            body: "FreeEarnHub कैंपेन निष्पादन और यूज़र भागीदारी के लिए वर्कफ़्लो इंफ़्रास्ट्रक्चर प्रदान करता है। हम किसी विशेष बिज़नेस परिणाम, कमाई परिणाम या निरंतर उपलब्धता की गारंटी नहीं देते।",
          },
          {
            title: "थर्ड-पार्टी निर्भरता",
            body: "पेमेंट प्रोवाइडर, क्लाउड इंफ़्रास्ट्रक्चर, टेलीकॉम नेटवर्क और बाहरी APIs उपलब्धता या प्रोसेसिंग टाइमलाइन को प्रभावित कर सकते हैं जो हमारे सीधे नियंत्रण से बाहर है।",
          },
          {
            title: "क्षेत्रीय अनुपालन जिम्मेदारी",
            body: "यूज़र्स और बिज़नेस अपने क्षेत्र में लागू स्थानीय कानूनों, टैक्स आवश्यकताओं और डिजिटल मार्केटिंग नियमों के अनुपालन के लिए जिम्मेदार हैं।",
          },
        ]
      : locale === "bn"
        ? [
            {
              title: "সার্ভিসের পরিধি",
              body: "FreeEarnHub ক্যাম্পেইন এক্সিকিউশন ও ব্যবহারকারী অংশগ্রহণের জন্য ওয়ার্কফ্লো অবকাঠামো প্রদান করে। আমরা নির্দিষ্ট ব্যবসায়িক ফলাফল, আয়ের ফলাফল বা নিরবচ্ছিন্ন উপলভ্যতার গ্যারান্টি দিই না।",
            },
            {
              title: "তৃতীয় পক্ষের নির্ভরতা",
              body: "পেমেন্ট প্রোভাইডার, ক্লাউড অবকাঠামো, টেলিকম নেটওয়ার্ক এবং বাহ্যিক API আমাদের সরাসরি নিয়ন্ত্রণের বাইরে থাকা কারণে উপলভ্যতা বা প্রসেসিং টাইমলাইন প্রভাবিত করতে পারে।",
            },
            {
              title: "অঞ্চলভিত্তিক কমপ্লায়েন্স দায়িত্ব",
              body: "ব্যবহারকারী ও ব্যবসা তাদের অঞ্চলে প্রযোজ্য স্থানীয় আইন, ট্যাক্স প্রয়োজনীয়তা এবং ডিজিটাল মার্কেটিং রুলস মেনে চলার জন্য দায়ী।",
            },
          ]
        : [
            {
              title: "Service Scope",
              body: "FreeEarnHub provides workflow infrastructure for campaign execution and user participation. We do not guarantee specific business results, earning outcomes, or uninterrupted availability.",
            },
            {
              title: "Third-Party Dependencies",
              body: "Payment providers, cloud infrastructure, telecom networks, and external APIs may affect availability or processing timelines beyond our direct control.",
            },
            {
              title: "Jurisdictional Responsibility",
              body: "Users and businesses are responsible for compliance with local laws, tax requirements, and digital marketing rules applicable in their region.",
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

