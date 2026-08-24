"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteAccountAction } from "@/server/auth/actions";

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> حذف الحساب
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف الحساب</DialogTitle>
            <DialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيتم إلغاء تفعيل حسابك وإخفاء بياناتك الشخصية، لكن سجلاتك المالية
              التاريخية تبقى للحفاظ على دقة حسابات المجموعات.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              className="w-full"
              loading={loading}
              onClick={async () => {
                setLoading(true);
                await deleteAccountAction();
              }}
            >
              نعم، احذف حسابي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
