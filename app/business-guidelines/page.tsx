import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

type Section = { title: string; body: string };

const CONTENT: Record<string, { eyebrow: string; title: string; description: string; sections: Section[] }> = {
  en: {
    eyebrow: "Business Policy",
    title: "Business Campaign Guidelines",
    description: "Launch-safe rules for businesses publishing work on FreeEarnHub.",
    sections: [
      {
        title: "Allowed service scope",
        body: "Campaigns must deliver genuine operational work such as testing, listing QA, feedback, content, research, data operations, moderation, or support tasks. Every campaign should have a lawful business objective and a clear work output.",
      },
      {
        title: "Prohibited campaigns",
        body: "Do not publish paid public reviews, rating manipulation, fake engagement, ad-click farming, install-count campaigns outside genuine testing, spam outreach, deceptive promotions, or any task that violates third-party platform rules.",
      },
      {
        title: "Instructions and proof",
        body: "Campaign instructions must be specific, reviewable, and proportionate to the reward. Proof requirements should verify the work itself without collecting unnecessary personal data from workers or third parties.",
      },
      {
        title: "Privacy and lawful use",
        body: "Businesses may only request data that is necessary for the task. Do not ask workers to submit sensitive personal data, account credentials, payment details, or unlawful screenshots. Campaign owners remain responsible for applicable law and platform-policy compliance.",
      },
      {
        title: "Review, holds, and enforcement",
        body: "FreeEarnHub may pause, reject, edit-gate, or remove campaigns that create legal, fraud, trust, or policy risk. Repeated violations can lead to account restrictions, payment holds, refund review, or permanent suspension.",
      },
    ],
  },
  hi: {
    eyebrow: "बिज़नेस नीति",
    title: "बिज़नेस कैंपेन गाइडलाइन्स",
    description: "FreeEarnHub पर काम publish करने वाले businesses के लिए launch-safe नियम।",
    sections: [
      {
        title: "अनुमत service scope",
        body: "Campaigns में genuine operational work होना चाहिए, जैसे testing, listing QA, feedback, content, research, data operations, moderation या support tasks। हर campaign का lawful business objective और साफ work output होना चाहिए।",
      },
      {
        title: "प्रतिबंधित campaigns",
        body: "Paid public reviews, rating manipulation, fake engagement, ad-click farming, genuine testing से बाहर install-count campaigns, spam outreach, deceptive promotion या third-party platform rules तोड़ने वाले tasks publish न करें।",
      },
      {
        title: "Instructions और proof",
        body: "Campaign instructions specific, reviewable और reward के अनुपात में होने चाहिए। Proof requirements काम को verify करें, लेकिन workers या third parties से unnecessary personal data न माँगें।",
      },
      {
        title: "Privacy और lawful use",
        body: "Business केवल वही data माँगे जो task के लिए आवश्यक हो। Sensitive personal data, account credentials, payment details या unlawful screenshots माँगना allowed नहीं है। लागू कानून और platform-policy compliance की जिम्मेदारी business की ही रहती है।",
      },
      {
        title: "Review, hold और enforcement",
        body: "Legal, fraud, trust या policy risk मिलने पर FreeEarnHub campaign को pause, reject, edit-gate या remove कर सकता है। बार-बार violation होने पर account restriction, payment hold, refund review या permanent suspension हो सकता है।",
      },
    ],
  },
  bn: {
    eyebrow: "বিজনেস নীতি",
    title: "বিজনেস ক্যাম্পেইন গাইডলাইনস",
    description: "FreeEarnHub-এ কাজ publish করা business-এর জন্য launch-safe নিয়ম।",
    sections: [
      {
        title: "অনুমোদিত service scope",
        body: "Campaign-এ genuine operational work থাকতে হবে, যেমন testing, listing QA, feedback, content, research, data operations, moderation বা support tasks। প্রতিটি campaign-এর lawful business objective এবং পরিষ্কার work output থাকা উচিত।",
      },
      {
        title: "নিষিদ্ধ campaigns",
        body: "Paid public review, rating manipulation, fake engagement, ad-click farming, genuine testing-এর বাইরে install-count campaign, spam outreach, deceptive promotion বা third-party platform rules ভাঙে এমন task publish করবেন না।",
      },
      {
        title: "Instructions এবং proof",
        body: "Campaign instructions specific, reviewable এবং reward-এর সঙ্গে proportional হতে হবে। Proof requirements কাজটি verify করবে, কিন্তু worker বা third party থেকে unnecessary personal data চাইবে না।",
      },
      {
        title: "Privacy এবং lawful use",
        body: "Business শুধু task-এর জন্য প্রয়োজনীয় data চাইতে পারবে। Sensitive personal data, account credentials, payment details বা unlawful screenshot চাওয়া যাবে না। প্রযোজ্য আইন এবং platform-policy compliance-এর দায়িত্ব business-এর উপরই থাকবে।",
      },
      {
        title: "Review, hold এবং enforcement",
        body: "Legal, fraud, trust বা policy risk পাওয়া গেলে FreeEarnHub campaign pause, reject, edit-gate বা remove করতে পারে। বারবার violation হলে account restriction, payment hold, refund review বা permanent suspension হতে পারে।",
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
