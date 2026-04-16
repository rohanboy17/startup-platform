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
      "Important operating boundaries for using FreeEarnHub as a moderated work and hiring platform.",
    sections: [
      {
        title: "No guarantee of income, hiring, or business outcome",
        body:
          "FreeEarnHub does not guarantee a specific earning level for users, a guaranteed job offer or internship placement, or a guaranteed commercial outcome for businesses. Performance depends on posting quality, review outcomes, candidate suitability, fraud controls, and third-party factors.",
      },
      {
        title: "Prohibited use warning",
        body:
          "The platform does not approve campaigns or jobs for public review posting, rating manipulation, artificial traffic, ad-click farming, fake engagement, deceptive install-count activity, fake jobs, or misleading hiring. Businesses remain responsible for ensuring every posting is lawful and compliant with third-party platform rules.",
      },
      {
        title: "Marketplace role only",
        body:
          "FreeEarnHub provides platform infrastructure, moderation, and in-app workflow tools. Except where explicitly stated in a separate written agreement, FreeEarnHub is not the employer, staffing agency, payroll operator, or guarantor of worker conduct, workplace safety, or hiring outcomes.",
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
      "FreeEarnHub को moderated work और hiring platform के रूप में उपयोग करते समय महत्वपूर्ण operating boundaries।",
    sections: [
      {
        title: "कमाई, hiring या बिज़नेस परिणाम की गारंटी नहीं",
        body:
          "FreeEarnHub यूज़र के लिए किसी निश्चित earning level, guaranteed job offer या internship placement, या बिज़नेस के लिए किसी निश्चित commercial outcome की गारंटी नहीं देता। Performance posting quality, review outcomes, candidate suitability, fraud controls और third-party factors पर निर्भर करती है।",
      },
      {
        title: "प्रतिबंधित उपयोग चेतावनी",
        body:
          "यह प्लेटफ़ॉर्म public review posting, rating manipulation, artificial traffic, ad-click farming, fake engagement, deceptive install-count activity, fake jobs या misleading hiring वाले campaigns या jobs approve नहीं करता। हर posting lawful और third-party platform rules के अनुरूप रखना बिज़नेस की जिम्मेदारी है।",
      },
      {
        title: "केवल marketplace की भूमिका",
        body:
          "FreeEarnHub platform infrastructure, moderation और in-app workflow tools उपलब्ध कराता है। किसी अलग written agreement में स्पष्ट रूप से न कहा गया हो तो FreeEarnHub employer, staffing agency, payroll operator या worker conduct, workplace safety अथवा hiring outcomes का guarantor नहीं है।",
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
      "FreeEarnHub-কে moderated work এবং hiring platform হিসেবে ব্যবহার করার গুরুত্বপূর্ণ operating boundaries।",
    sections: [
      {
        title: "আয়, hiring বা business outcome-এর গ্যারান্টি নেই",
        body:
          "FreeEarnHub ব্যবহারকারীর জন্য নির্দিষ্ট earning level, guaranteed job offer বা internship placement, অথবা business-এর জন্য নির্দিষ্ট commercial outcome-এর গ্যারান্টি দেয় না। Performance posting quality, review outcomes, candidate suitability, fraud controls এবং third-party factors-এর উপর নির্ভর করে।",
      },
      {
        title: "নিষিদ্ধ ব্যবহার সতর্কতা",
        body:
          "এই প্ল্যাটফর্ম public review posting, rating manipulation, artificial traffic, ad-click farming, fake engagement, deceptive install-count activity, fake jobs বা misleading hiring-সম্পর্কিত campaigns বা jobs approve করে না। প্রতিটি posting lawful এবং third-party platform rules অনুযায়ী রাখা business-এর দায়িত্ব।",
      },
      {
        title: "শুধু marketplace-এর ভূমিকা",
        body:
          "FreeEarnHub platform infrastructure, moderation এবং in-app workflow tools প্রদান করে। আলাদা written agreement-এ স্পষ্টভাবে বলা না থাকলে FreeEarnHub employer, staffing agency, payroll operator বা worker conduct, workplace safety কিংবা hiring outcomes-এর guarantor নয়।",
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
      lastUpdated="April 16, 2026"
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
