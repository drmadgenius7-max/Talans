import { Home, Users, Bell, User, PlusCircle, LineChart } from "lucide-react";

export const primaryNavItems = [
  { href: "/dashboard", label: "الرئيسية", icon: Home },
  { href: "/groups", label: "مجموعاتي", icon: Users },
  { href: "/insights", label: "الإحصائيات", icon: LineChart },
  { href: "/notifications", label: "النشاط", icon: Bell },
  { href: "/settings", label: "حسابي", icon: User },
];

export const bottomNavItems = [
  { href: "/dashboard", label: "الرئيسية", icon: Home },
  { href: "/groups", label: "المجموعات", icon: Users },
  { href: "__create__", label: "إنشاء", icon: PlusCircle },
  { href: "/notifications", label: "النشاط", icon: Bell },
  { href: "/settings", label: "حسابي", icon: User },
];
