const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@earnhub.in";
const SUPPORT_ADDRESS =
  process.env.NEXT_PUBLIC_SUPPORT_ADDRESS ||
  "EarnHub Support Desk, Bengaluru, Karnataka, India";

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-20 text-white">
      <h1 className="mb-6 text-3xl font-bold">Contact</h1>

      <p className="mb-4 text-white/80">
        For account, payment, refund, or compliance support, contact us at:
      </p>

      <p className="mb-6 text-lg font-semibold">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-4">
          {SUPPORT_EMAIL}
        </a>
      </p>

      <p className="mb-4 text-white/80">Average response time: 24-48 business hours.</p>
      <p className="text-white/80">Address: {SUPPORT_ADDRESS}</p>
    </main>
  );
}
