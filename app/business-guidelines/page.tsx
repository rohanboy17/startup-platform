import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

type Section = { title: string; body: string };

const CONTENT: Record<string, { eyebrow: string; title: string; description: string; sections: Section[] }> = {
  en: {
    eyebrow: "Business Policy",
    title: "Business Work Guidelines",
    description: "Launch-safe rules for businesses publishing campaigns and jobs on FreeEarnHub.",
    sections: [
      {
        title: "Allowed service scope",
        body: "Campaigns and jobs must deliver genuine operational work such as testing, listing QA, feedback, content, research, data operations, moderation, support tasks, internships, or lawful local hiring. Every posting should have a lawful business objective and a clear work output or role scope.",
      },
      {
        title: "Prohibited postings",
        body: "Do not publish paid public reviews, rating manipulation, fake engagement, ad-click farming, install-count campaigns outside genuine testing, spam outreach, deceptive promotions, fake jobs, misleading hiring posts, or any work that violates third-party platform rules.",
      },
      {
        title: "Instructions, requirements, and proof",
        body: "Campaign instructions and job requirements must be specific, reviewable, and proportionate to the reward or role. Proof or application requirements should verify the work itself without collecting unnecessary personal data from workers or third parties.",
      },
      {
        title: "Privacy and lawful use",
        body: "Businesses may only request data that is necessary for the task or job. Do not ask workers to submit sensitive personal data, account credentials, payment details, unlawful screenshots, or off-platform hiring requirements that bypass FreeEarnHub review controls. Businesses remain responsible for applicable law and platform-policy compliance.",
      },
      {
        title: "Review, holds, and enforcement",
        body: "FreeEarnHub may pause, reject, edit-gate, or remove campaigns and jobs that create legal, fraud, trust, privacy, or policy risk. Repeated violations can lead to account restrictions, payment holds, refund review, or permanent suspension.",
      },
    ],
  },
  hi: {
    eyebrow: "बिज़नेस नीति",
    title: "बिज़नेस वर्क गाइडलाइन्स",
    description: "FreeEarnHub पर campaigns और jobs publish करने वाले businesses के लिए launch-safe नियम।",
    sections: [
      {
        title: "अनुमत service scope",
        body: "Campaigns और jobs में genuine operational work होना चाहिए, जैसे testing, listing QA, feedback, content, research, data operations, moderation, support tasks, internships या lawful local hiring। हर posting का lawful business objective और साफ work output या role scope होना चाहिए।",
      },
      {
        title: "प्रतिबंधित postings",
        body: "Paid public reviews, rating manipulation, fake engagement, ad-click farming, genuine testing से बाहर install-count campaigns, spam outreach, deceptive promotion, fake jobs, misleading hiring posts या third-party platform rules तोड़ने वाले tasks publish न करें।",
      },
      {
        title: "Instructions, requirements और proof",
        body: "Campaign instructions और job requirements specific, reviewable और reward या role के अनुपात में होने चाहिए। Proof या application requirements काम को verify करें, लेकिन workers या third parties से unnecessary personal data न माँगें।",
      },
      {
        title: "Privacy और lawful use",
        body: "Business केवल वही data माँगे जो task या job के लिए आवश्यक हो। Sensitive personal data, account credentials, payment details, unlawful screenshots या FreeEarnHub review controls को bypass करने वाली off-platform hiring requirements माँगना allowed नहीं है। लागू कानून और platform-policy compliance की जिम्मेदारी business की ही रहती है।",
      },
      {
        title: "Review, hold और enforcement",
        body: "Legal, fraud, trust, privacy या policy risk मिलने पर FreeEarnHub campaigns और jobs को pause, reject, edit-gate या remove कर सकता है। बार-बार violation होने पर account restriction, payment hold, refund review या permanent suspension हो सकता है।",
      },
    ],
  },
  bn: {
    eyebrow: "বিজনেস নীতি",
    title: "বিজনেস ওয়ার্ক গাইডলাইনস",
    description: "FreeEarnHub-এ campaign এবং job publish করা business-এর জন্য launch-safe নিয়ম।",
    sections: [
      {
        title: "অনুমোদিত service scope",
        body: "Campaign এবং job-এ genuine operational work থাকতে হবে, যেমন testing, listing QA, feedback, content, research, data operations, moderation, support tasks, internships বা lawful local hiring। প্রতিটি posting-এর lawful business objective এবং পরিষ্কার work output বা role scope থাকা উচিত।",
      },
      {
        title: "নিষিদ্ধ postings",
        body: "Paid public review, rating manipulation, fake engagement, ad-click farming, genuine testing-এর বাইরে install-count campaign, spam outreach, deceptive promotion, fake jobs, misleading hiring post বা third-party platform rules ভাঙে এমন task publish করবেন না।",
      },
      {
        title: "Instructions, requirements এবং proof",
        body: "Campaign instructions এবং job requirements specific, reviewable এবং reward বা role-এর সঙ্গে proportional হতে হবে। Proof বা application requirements কাজটি verify করবে, কিন্তু worker বা third party থেকে unnecessary personal data চাইবে না।",
      },
      {
        title: "Privacy এবং lawful use",
        body: "Business শুধু task বা job-এর জন্য প্রয়োজনীয় data চাইতে পারবে। Sensitive personal data, account credentials, payment details, unlawful screenshot বা FreeEarnHub review controls bypass করে এমন off-platform hiring requirements চাওয়া যাবে না। প্রযোজ্য আইন এবং platform-policy compliance-এর দায়িত্ব business-এর উপরই থাকবে।",
      },
      {
        title: "Review, hold এবং enforcement",
        body: "Legal, fraud, trust, privacy বা policy risk পাওয়া গেলে FreeEarnHub campaign এবং job pause, reject, edit-gate বা remove করতে পারে। বারবার violation হলে account restriction, payment hold, refund review বা permanent suspension হতে পারে।",
      },
    ],
  },
};

export default async function BusinessGuidelinesPage() {
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
