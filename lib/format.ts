import type { Decision, Role, Severity, TicketStatus } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  qa: "QA/QC",
  cht: "Cửa hàng trưởng",
  nv: "Nhân viên",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  draft: "Nháp",
  pending_explanation: "Chờ giải trình",
  pending_decision: "Chờ chốt",
  locked: "Đã khóa",
  cancelled: "Đã hủy",
};

/** Màu huy hiệu trạng thái: vàng = cần làm, xanh trời = chờ người khác, xanh lá = xong, đỏ = hủy. */
export const STATUS_STYLE: Record<TicketStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  pending_explanation: "border-amber-200 bg-amber-50 text-amber-800",
  pending_decision: "border-sky-200 bg-sky-50 text-sky-800",
  locked: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

export const STATUS_DOT: Record<TicketStatus, string> = {
  draft: "bg-slate-400",
  pending_explanation: "bg-amber-500",
  pending_decision: "bg-sky-500",
  locked: "bg-emerald-500",
  cancelled: "bg-rose-500",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  nhe: "Nhẹ",
  trung_binh: "Trung bình",
  nang: "Nặng",
};

export const SEVERITY_STYLE: Record<Severity, string> = {
  nhe: "bg-slate-100 text-slate-700",
  trung_binh: "bg-orange-100 text-orange-800",
  nang: "bg-red-100 text-red-800",
};

export const DECISION_LABEL: Record<Decision, string> = {
  keep: "Giữ nguyên",
  reduce: "Giảm",
  waive: "Miễn",
  adjust: "Điều chỉnh",
  auto: "Tự áp (quá hạn)",
};

export const EVENT_LABEL: Record<string, string> = {
  issued: "Phát hành phiếu",
  cancelled: "Hủy phiếu",
  submitted: "Gửi giải trình",
  locked: "Chốt và khóa phiếu",
  auto_locked: "Hệ thống tự khóa",
  reopened: "Mở lại phiếu",
  edited: "Sửa phiếu",
  returned: "QA trả lại cửa hàng",
  appealed: "Cửa hàng khiếu nại",
  appeal_accepted: "Admin chấp nhận khiếu nại",
  appeal_rejected: "Admin giữ nguyên kết quả",
};

/** Lý do (giảm, miễn, trả lại, khiếu nại…) tối thiểu bao nhiêu ký tự — khớp hàm SQL valid_reason. */
export const MIN_REASON = 15;
export const reasonLength = (s: string) => s.trim().replace(/s+/g, " ").length;

/** Cửa hàng được khiếu nại trong bao lâu sau khi phiếu bị khóa. */
export const APPEAL_WINDOW_MS = 24 * 3_600_000;

export const money = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("vi-VN").format(n) + "đ";

const TZ = "Asia/Ho_Chi_Minh";
export const dateTime = (s: string | null | undefined) =>
  s
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: TZ, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
      }).format(new Date(s))
    : "—";

export const dateOnly = (s: string | null | undefined) =>
  s ? new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(s)) : "—";

export { cn } from "./utils";
