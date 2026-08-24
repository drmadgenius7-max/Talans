/** Central Arabic display copy for enum values — keeps backend/DB names in
 * English (per spec §75) while the UI always speaks natural Saudi Arabic. */

export const GROUP_TYPE_LABELS_AR: Record<string, string> = {
  TRIP: "رحلة",
  HOME: "منزل",
  FRIENDS: "أصدقاء",
  RESTAURANT: "مطعم",
  EVENT: "مناسبة",
  FAMILY: "عائلة",
  HOUSING: "سكن",
  PROJECT: "مشروع",
  OTHER: "أخرى",
};

export const GROUP_ROLE_LABELS_AR: Record<string, string> = {
  OWNER: "مالك",
  ADMIN: "مشرف",
  MEMBER: "عضو",
  VIEWER: "مشاهد",
};

export const SPLIT_TYPE_LABELS_AR: Record<string, string> = {
  EQUAL: "بالتساوي",
  EXACT: "مبلغ محدد",
  PERCENTAGE: "نسبة",
  SHARES: "حصص",
  ITEMIZED: "حسب العناصر",
};

export const PAYMENT_REQUEST_STATUS_LABELS_AR: Record<string, string> = {
  DRAFT: "مسودة",
  PENDING: "بانتظار الدفع",
  VIEWED: "تمت المشاهدة",
  PARTIALLY_PAID: "مدفوع جزئيًا",
  PAID: "مدفوع",
  OVERDUE: "متأخر",
  CANCELLED: "ملغى",
  REFUNDED: "مسترد",
  FAILED: "فشل",
};

export const SHARED_PAYMENT_STATUS_LABELS_AR: Record<string, string> = {
  DRAFT: "مسودة",
  ACTIVE: "نشطة",
  PARTIALLY_FUNDED: "ممولة جزئيًا",
  FUNDED: "مكتملة",
  PROCESSING: "جاري التنفيذ",
  COMPLETED: "منتهية",
  EXPIRED: "منتهية المهلة",
  CANCELLED: "ملغاة",
  REFUND_PENDING: "بانتظار الاسترداد",
  REFUNDED: "تم الاسترداد",
  FAILED: "فشلت",
};

export const ADJUSTMENT_TYPE_LABELS_AR: Record<string, string> = {
  TAX: "ضريبة",
  VAT: "ضريبة القيمة المضافة",
  DISCOUNT: "خصم",
  DELIVERY: "توصيل",
  SERVICE_CHARGE: "رسوم خدمة",
  TIP: "إكرامية",
  OTHER: "رسوم أخرى",
};

export const SETTLEMENT_METHOD_LABELS_AR: Record<string, string> = {
  ONLINE: "دفع إلكتروني",
  CASH: "نقدًا",
  BANK_TRANSFER: "تحويل بنكي",
  OTHER: "أخرى",
};

export const NOTIFICATION_TYPE_LABELS_AR: Record<string, string> = {
  PAYMENT_RECEIVED: "استلام دفعة",
  PAYMENT_REQUEST_CREATED: "مطالبة جديدة",
  PAYMENT_REQUEST_DUE: "استحقاق مطالبة",
  PAYMENT_REQUEST_OVERDUE: "مطالبة متأخرة",
  EXPENSE_ADDED: "مصروف جديد",
  EXPENSE_UPDATED: "تعديل مصروف",
  GROUP_INVITE: "دعوة مجموعة",
  GROUP_MEMBER_JOINED: "انضمام عضو",
  SHARED_PAYMENT_PROGRESS: "تقدّم الدفع التشاركي",
  SHARED_PAYMENT_COMPLETED: "اكتمال الدفع التشاركي",
  SHARED_PAYMENT_EXPIRED: "انتهاء مهلة الدفع التشاركي",
  SETTLEMENT_RECORDED: "تسوية حساب",
  REFUND_ISSUED: "استرداد مبلغ",
  SYSTEM: "إشعار من قِطّة",
};
