import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { DECISION_LABEL, SEVERITY_LABEL, STATUS_LABEL, dateTime } from "@/lib/format";
import type { Decision, Severity, TicketStatus } from "@/lib/types";

// Xuất Excel: mỗi dòng là một lỗi. Dữ liệu tự lọc theo quyền (RLS) của người đang đăng nhập.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Chưa đăng nhập", { status: 401 });

  const sp = new URL(request.url).searchParams;
  let q = supabase
    .from("tickets")
    .select(
      "code, status, inspected_at, issued_at, locked_at, auto_locked, store:stores(code, name), creator:profiles!tickets_created_by_fkey(full_name), " +
        "items:ticket_items(violation_name, severity, suggested_amount, final_amount, decision, decision_reason, cht_response, explanation, cause, corrective_action, employee:employees(code, full_name), violation_type:violation_types(code))",
    )
    .neq("status", "draft");
  if (sp.get("status")) q = q.eq("status", sp.get("status")!);
  if (sp.get("store")) q = q.eq("store_id", sp.get("store")!);
  if (sp.get("from")) q = q.gte("inspected_at", `${sp.get("from")}T00:00:00+07:00`);
  if (sp.get("to")) q = q.lte("inspected_at", `${sp.get("to")}T23:59:59+07:00`);
  if (sp.get("code")) q = q.ilike("code", `%${sp.get("code")}%`);

  const { data, error } = await q.order("inspected_at", { ascending: false }).limit(5000);
  if (error) return new Response(error.message, { status: 500 });

  type Row = {
    code: string; status: TicketStatus; inspected_at: string; issued_at: string; locked_at: string | null; auto_locked: boolean;
    store: { code: string; name: string } | null; creator: { full_name: string } | null;
    items: {
      violation_name: string | null; severity: Severity | null; suggested_amount: number | null; final_amount: number | null;
      decision: Decision | null; decision_reason: string | null; cht_response: string | null; explanation: string | null;
      cause: string | null; corrective_action: string | null;
      employee: { code: string; full_name: string } | null; violation_type: { code: string } | null;
    }[];
  };

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Phiếu lỗi");
  ws.columns = [
    { header: "Mã phiếu", key: "code", width: 18 },
    { header: "Ngày kiểm tra", key: "inspected", width: 18 },
    { header: "Cửa hàng", key: "store", width: 28 },
    { header: "QA/QC", key: "qa", width: 20 },
    { header: "Trạng thái", key: "status", width: 16 },
    { header: "Mã lỗi", key: "vcode", width: 10 },
    { header: "Lỗi", key: "violation", width: 40 },
    { header: "Cấp độ", key: "severity", width: 12 },
    { header: "Mã NV", key: "ecode", width: 10 },
    { header: "Nhân viên", key: "employee", width: 22 },
    { header: "Tiền đề xuất", key: "suggested", width: 14, style: { numFmt: "#,##0" } },
    { header: "Phản hồi CH", key: "response", width: 14 },
    { header: "Giải trình", key: "explanation", width: 40 },
    { header: "Nguyên nhân", key: "cause", width: 30 },
    { header: "Biện pháp khắc phục", key: "fix", width: 30 },
    { header: "Kết quả", key: "decision", width: 16 },
    { header: "Tiền chốt", key: "final", width: 14, style: { numFmt: "#,##0" } },
    { header: "Lý do chốt", key: "reason", width: 30 },
    { header: "Ngày khóa", key: "locked", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const t of (data ?? []) as unknown as Row[]) {
    for (const i of t.items) {
      ws.addRow({
        code: t.code,
        inspected: dateTime(t.inspected_at),
        store: t.store ? `${t.store.code} · ${t.store.name}` : "",
        qa: t.creator?.full_name ?? "",
        status: STATUS_LABEL[t.status] + (t.auto_locked ? " (tự động)" : ""),
        vcode: i.violation_type?.code ?? "",
        violation: i.violation_name ?? "",
        severity: i.severity ? SEVERITY_LABEL[i.severity] : "",
        ecode: i.employee?.code ?? "",
        employee: i.employee?.full_name ?? "Lỗi chung",
        suggested: i.suggested_amount,
        response: i.cht_response === "dispute" ? "Không đồng ý" : i.cht_response === "accept" ? "Chấp nhận" : "",
        explanation: i.explanation ?? "",
        cause: i.cause ?? "",
        fix: i.corrective_action ?? "",
        decision: i.decision ? DECISION_LABEL[i.decision] : "",
        final: i.final_amount,
        reason: i.decision_reason ?? "",
        locked: t.locked_at ? dateTime(t.locked_at) : "",
      });
    }
  }
  ws.autoFilter = { from: "A1", to: "S1" };

  const buf = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="phieu-loi-${stamp}.xlsx"`,
    },
  });
}
