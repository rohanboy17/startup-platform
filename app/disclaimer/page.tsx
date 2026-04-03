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
    eyebrow: "Compliance",
    title: "Disclaimer",
    description:
      "Important operating boundaries for using FreeEarnHub as a moderated micro-work platform.",
    sections: [
      {
        title: "No guarantee of income or business outcome",
        body:
          "FreeEarnHub does not guarantee a specific earning level for users or a guaranteed commercial outcome for businesses. Performance depends on campaign quality, review outcomes, user suitability, fraud controls, and third-party factors.",
      },
      {
        title: "Prohibited use warning",
        body:
          "The platform does not approve campaigns for public review posting, rating manipulation, artificial traffic, ad-click farming, fake engagement, or deceptive install-count activity. Businesses remain responsible for ensuring every campaign is lawful and compliant with third-party platform rules.",
      },
      {
        title: "Third-party dependencies",
        body:
          "Platform availability, payments, notifications, cloud services, and other integrations may be affected by third-party systems outside our direct control.",
      },
      {
        title: "Local law and tax responsibility",
        body:
          "Users and businesses are responsible for compliance with local law, tax obligations, contract rules, and industry-specific restrictions that apply in their jurisdiction.",
      },
    ],
  },
  hi: {
    eyebrow: "अनुपालन",
    title: "डिस्क्लेमर",
    description:
      "FreeEarnHub को moderated micro-work platform के रूप में उपयोग करते समय महत्वपूर्ण operating boundaries।",
    sections: [
      {
        title: "कमाई या बिज़नेस परिणाम की गारंटी नहीं",
        body:
          "FreeEarnHub यूज़र के लिए किसी निश्चित earning level या बिज़नेस के लिए किसी निश्चित commercial outcome की गारंटी नहीं देता। Performance campaign quality, review outcomes, user suitability, fraud controls और third-party factors पर निर्भर करती है।",
      },
      {
        title: "प्रतिबंधित उपयोग चेतावनी",
        body:
          "यह प्लेटफ़ॉर्म public review posting, rating manipulation, artificial traffic, ad-click farming, fake engagement या deceptive install-count activity वाले campaigns approve नहीं करता। हर campaign lawful और third-party platform rules के अनुरूप रखना बिज़नेस की जिम्मेदारी है।",
      },
      {
        title: "Third-party dependencies",
        body:
          "Platform availability, payments, notifications, cloud services और अन्य integrations हमारे सीधे नियंत्रण से बाहर third-party systems से प्रभावित हो सकते हैं।",
      },
      {
        title: "Local law और tax responsibility",
        body:
          "अपने क्षेत्र में लागू local law, tax obligations, contract rules और industry-specific restrictions के पालन की जिम्मेदारी यूज़र और बिज़नेस की ही है।",
      },
    ],
  },
  bn: {
    eyebrow: "কমপ্লায়েন্স",
    title: "ডিসক্লেইমার",
    description:
      "FreeEarnHub-কে moderated micro-work platform হিসেবে ব্যবহার করার গুরুত্বপূর্ণ operating boundaries।",
    sections: [
      {
        title: "আয় বা ব্যবসার ফলাফলের গ্যারান্টি নেই",
        body:
          "FreeEarnHub ব্যবহারকারীর জন্য নির্দিষ্ট earning level বা ব্যবসার জন্য নির্দিষ্ট commercial outcome-এর গ্যারান্টি দেয় না। Performance campaign quality, review outcomes, user suitability, fraud controls এবং third-party factors-এর উপর নির্ভর করে।",
      },
      {
        title: "নিষিদ্ধ ব্যবহার সতর্কতা",
        body:
          "এই প্ল্যাটফর্ম public review posting, rating manipulation, artificial traffic, ad-click farming, fake engagement বা deceptive install-count activity-সম্পর্কিত campaigns approve করে না। প্রতিটি campaign lawful এবং third-party platform rules অনুযায়ী রাখা ব্যবসার দায়িত্ব।",
      },
      {
        title: "Third-party dependencies",
        body:
          "Platform availability, payments, notifications, cloud services এবং অন্যান্য integrations আমাদের সরাসরি নিয়ন্ত্রণের বাইরে থাকা third-party systems-এর কারণে প্রভাবিত হতে পারে।",
      },
      {
        title: "Local law ও tax responsibility",
        body:
          "নিজ নিজ অঞ্চলে প্রযোজ্য local law, tax obligations, contract rules এবং industry-specific restrictions মেনে চলার দায় ব্যবহারকারী ও ব্যবসার উপরই থাকে।",
      },
    ],
  },
};

export default async function DisclaimerPage() {
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
