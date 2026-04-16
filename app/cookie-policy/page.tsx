import { PolicySection, PublicPageShell } from "@/components/public-page-shell";
import { getLocale } from "next-intl/server";

export default async function CookiePolicyPage() {
  const locale = await getLocale();

  const meta =
    locale === "hi"
      ? {
          eyebrow: "अनुपालन",
          title: "कुकी नीति",
          description: "सुरक्षित sessions, language preference और platform reliability बेहतर बनाने के लिए cookies और similar technologies का उपयोग।",
        }
      : locale === "bn"
        ? {
            eyebrow: "কমপ্লায়েন্স",
            title: "কুকি নীতি",
            description: "নিরাপদ sessions, language preference এবং platform reliability উন্নত করতে cookies ও similar technologies কীভাবে ব্যবহৃত হয়।",
          }
        : {
            eyebrow: "Compliance",
            title: "Cookie Policy",
            description: "How cookies and similar technologies are used to run secure sessions, remember preferences, and improve platform reliability.",
          };

  const sections =
    locale === "hi"
      ? [
          {
            title: "आवश्यक cookies",
            body: "आवश्यक cookies sign-in sessions, auth state, account security, protected routes और in-app workflow continuity के लिए उपयोग होती हैं। इन्हें disable करने से core features तक पहुँच प्रभावित हो सकती है।",
          },
          {
            title: "Performance और preference cookies",
            body: "हम product stability, interface quality, language selection, theme preference और workflow speed सुधारने के लिए limited analytics और preference storage का उपयोग कर सकते हैं।",
          },
          {
            title: "Cookies को कैसे control करें",
            body: "आप browser controls से cookies manage कर सकते हैं। सभी cookies block करने से experience खराब हो सकता है और महत्वपूर्ण platform operations सीमित हो सकते हैं।",
          },
        ]
      : locale === "bn"
        ? [
            {
              title: "প্রয়োজনীয় cookies",
              body: "প্রয়োজনীয় cookies sign-in sessions, auth state, account security, protected routes এবং in-app workflow continuity-এর জন্য ব্যবহৃত হয়। এগুলো disable করলে core features ব্যবহার করা কঠিন হতে পারে।",
            },
            {
              title: "Performance ও preference cookies",
              body: "আমরা product stability, interface quality, language selection, theme preference এবং workflow speed উন্নত করতে limited analytics ও preference storage ব্যবহার করতে পারি।",
            },
            {
              title: "Cookies কীভাবে control করবেন",
              body: "আপনি browser controls থেকে cookies manage করতে পারেন। সব cookies block করলে experience খারাপ হতে পারে এবং গুরুত্বপূর্ণ platform operations সীমিত হতে পারে।",
            },
          ]
        : [
            {
              title: "Essential Cookies",
              body: "Essential cookies are used for sign-in sessions, auth state, account security, protected routes, and in-app workflow continuity. Disabling essential cookies may prevent access to core features.",
            },
            {
              title: "Performance and Preference Cookies",
              body: "We may use limited analytics and preference storage to improve product stability, interface quality, language selection, theme preference, and workflow speed.",
            },
            {
              title: "How to Control Cookies",
              body: "You can manage cookies through browser controls. Blocking all cookies may degrade user experience and restrict key platform operations.",
            },
          ];

  return (
    <PublicPageShell eyebrow={meta.eyebrow} title={meta.title} description={meta.description} lastUpdated="April 16, 2026">
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
