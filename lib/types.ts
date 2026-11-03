export type Role = "admin" | "qa" | "cht" | "nv";
/** Vai trò thuộc về một cửa hàng (chỉ thấy phiếu của cửa hàng mình). */
export const isStoreRole = (r: Role) => r === "cht" || r === "nv";
export type Severity = "nhe" | "trung_binh" | "nang";
export type TicketStatus = "draft" | "pending_explanation" | "pending_decision" | "locked" | "cancelled";
export type Decision = "keep" | "reduce" | "waive" | "adjust" | "auto";
export type ChtResponse = "accept" | "dispute";

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  store_id: string | null;
  store_name: string | null;
  employee_id: string | null;
  active: boolean;
};

export type Store = { id: string; code: string; name: string; address: string | null; active: boolean };
export type Employee = { id: string; code: string; full_name: string; store_id: string; position: string | null; active: boolean };
export type ViolationType = {
  id: string; code: string; name: string; group_name: string | null;
  severity: Severity; amount: number; description: string | null; active: boolean;
};

export type TicketItem = {
  id: string;
  ticket_id: string;
  violation_type_id: string;
  employee_id: string | null;
  description: string | null;
  evidence_paths: string[];
  violation_name: string | null;
  severity: Severity | null;
  suggested_amount: number | null;
  cht_response: ChtResponse | null;
  explanation: string | null;
  cause: string | null;
  corrective_action: string | null;
  explanation_paths: string[];
  explained_by: string | null;
  explained_at: string | null;
  /** Lần cuối QA sửa lỗi này sau khi phát hành */
  edited_at: string | null;
  /** Mức QA đã chốt, chỉ có khi Admin giảm tiền lúc xử lý khiếu nại */
  qa_final_amount: number | null;
  decision: Decision | null;
  final_amount: number | null;
  decision_reason: string | null;
  sort: number;
};

export type Ticket = {
  id: string;
  code: string | null;
  store_id: string;
  created_by: string;
  status: TicketStatus;
  note: string | null;
  inspected_at: string;
  issued_at: string | null;
  due_at: string | null;
  submitted_at: string | null;
  locked_at: string | null;
  auto_locked: boolean;
  cancel_reason: string | null;
  created_at: string;
  /** Khiếu nại của cửa hàng sau khi khóa (1 lần, trong 24h) — Admin xử lý */
  appeal_status: AppealStatus | null;
  appeal_reason: string | null;
  appealed_at: string | null;
  appeal_resolution: string | null;
  appeal_resolved_at: string | null;
};

export type AppealStatus = "pending" | "rejected" | "accepted";
