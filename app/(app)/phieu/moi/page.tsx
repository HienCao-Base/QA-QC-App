import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createDraft } from "@/app/actions";
import { PageTitle } from "@/components/common";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export default async function NewTicket() {
  await requireRole("qa");
  const supabase = await createClient();
  const { data: stores } = await supabase.from("stores").select("id, code, name").eq("active", true).order("code");

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <BackLink />
      <PageTitle title="Tạo phiếu lỗi" sub="Bước 1/2 · Chọn cửa hàng đang kiểm tra" />
      <Card className="shadow-xs">
        <CardContent>
          <form action={createDraft}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="store_id">Cửa hàng</FieldLabel>
                <NativeSelect id="store_id" name="store_id" className="w-full" required defaultValue="">
                  <NativeSelectOption value="" disabled>
                    Chọn cửa hàng…
                  </NativeSelectOption>
                  {stores?.map((s) => (
                    <NativeSelectOption key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="note">
                  Ghi chú chung <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
                </FieldLabel>
                <Textarea id="note" name="note" rows={2} placeholder="VD: Kiểm tra định kỳ ca sáng" />
              </Field>
              <Button size="lg" className="w-full sm:w-auto sm:self-end">
                Tiếp tục: thêm lỗi <ArrowRight aria-hidden />
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
