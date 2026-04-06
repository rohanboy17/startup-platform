import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

type Section = { title: string; body: string };

const CONTENT: Record<string, { eyebrow: string; title: string; description: string; sections: Section[] }> = {
  en: {
    eyebrow: "Services",
    title: "Digital Work, Local Jobs, and Internships",
    description:
      "FreeEarnHub helps businesses run moderated digital operations and local hiring from one controlled platform.",
    sections: [
      {
        title: "Digital work campaigns",
        body: "Businesses can launch structured digital work such as testing, feedback, content operations, research, moderation, listing QA, and data tasks. These run through proof-based review and controlled settlement.",
      },
      {
        title: "Local jobs and internships",
        body: "Businesses can also publish moderated local jobs, field roles, office roles, and internship opportunities. Job applications move through manager and admin review before the business takes final hiring action.",
      },
      {
        title: "Privacy and trust controls",
        body: "FreeEarnHub keeps sensitive worker data protected during early review stages. Businesses see moderated applicant profiles, experience, and fit signals before any later-stage hiring decisions.",
      },
      {
        title: "Funding and accountability",
        body: "Work is backed by wallet funding, visible commission rules, review logs, and clear moderation trails so delivery, hiring, and payouts remain accountable.",
      },
    ],
  },
  hi: {
    eyebrow: "Services",
    title: "Digital Work, Local Jobs, and Internships",
    description:
      "FreeEarnHub businesses को moderated digital operations और local hiring एक controlled platform से चलाने में मदद करता है.",
    sections: [
      {
        title: "Digital work campaigns",
        body: "Businesses testing, feedback, content operations, research, moderation, listing QA और data tasks जैसे structured digital work launch कर सकते हैं. ये proof-based review और controlled settlement के साथ चलते हैं.",
      },
      {
        title: "Local jobs and internships",
        body: "Businesses moderated local jobs, field roles, office roles और internship opportunities भी publish कर सकते हैं. Job applications business के final hiring action से पहले manager और admin review से गुजरती हैं.",
      },
      {
        title: "Privacy and trust controls",
        body: "FreeEarnHub शुरुआती review stages में sensitive worker data को protected रखता है. Businesses later-stage hiring decision से पहले moderated applicant profile, experience और fit signals देखते हैं.",
      },
      {
        title: "Funding and accountability",
        body: "Work wallet funding, visible commission rules, review logs और clear moderation trails से backed रहता है ताकि delivery, hiring और payouts accountable रहें.",
      },
    ],
  },
  bn: {
    eyebrow: "Services",
    title: "Digital Work, Local Jobs, and Internships",
    description:
      "FreeEarnHub business-কে moderated digital operations এবং local hiring একটি controlled platform থেকে চালাতে সাহায্য করে।",
    sections: [
      {
        title: "Digital work campaigns",
        body: "Business testing, feedback, content operations, research, moderation, listing QA এবং data tasks-এর মতো structured digital work launch করতে পারে। এগুলো proof-based review এবং controlled settlement-এর মাধ্যমে চলে।",
      },
      {
        title: "Local jobs and internships",
        body: "Business moderated local jobs, field roles, office roles এবং internship opportunities-ও publish করতে পারে। Business final hiring action নেওয়ার আগে job applications manager এবং admin review-এর মধ্য দিয়ে যায়।",
      },
      {
        title: "Privacy and trust controls",
        body: "FreeEarnHub early review stage-এ sensitive worker data protected রাখে। Later-stage hiring decision-এর আগে business moderated applicant profile, experience এবং fit signals দেখে।",
      },
      {
        title: "Funding and accountability",
        body: "Work wallet funding, visible commission rules, review logs এবং clear moderation trails-এর মাধ্যমে backed থাকে, যাতে delivery, hiring এবং payouts accountable থাকে।",
      },
    ],
  },
};

export default async function ServicesPage() {
  const locale = await getLocale();
  const content = CONTENT[locale] ?? CONTENT.en;

  return (
    <PublicPageShell
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      lastUpdated="April 7, 2026"
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
