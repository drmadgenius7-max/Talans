import type { Metadata } from "next";
import { OnboardingCarousel } from "./onboarding-carousel";

export const metadata: Metadata = { title: "أهلًا بك في قِطّة" };

const screens = [
  {
    emoji: "🧾",
    title: "دفعت عن أصحابك؟",
    body: "قسّم المبلغ وطالبهم بسهولة — قِطّة تحسب حصة كل واحد وترسل له رابط دفع جاهز.",
  },
  {
    emoji: "🎁",
    title: "تبغون تشترون شيء مع بعض؟",
    body: "اجمعوا المبلغ أولًا بالدفع التشاركي، وتابعوا التقدّم لحظة بلحظة حتى الوصول لـ 100%.",
  },
  {
    emoji: "🐱",
    title: "ودّعوا حسبة: مين له ومين عليه",
    body: "قِطّة تسوي الحساب عنكم بأقل عدد تحويلات ممكن.",
  },
];

export default function OnboardingPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <OnboardingCarousel screens={screens} />
    </div>
  );
}
