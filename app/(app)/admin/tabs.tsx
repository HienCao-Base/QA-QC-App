"use client";

import { saveAccount, saveEntity, type AccountInput } from "@/app/actions";
import { ROLE_LABEL, SEVERITY_LABEL, money } from "@/lib/format";
import type { Employee, Role, Severity, Store } from "@/lib/types";
import { CrudTable, type Field } from "./crud-table";
import type { TabKey } from "./page";

export function AdminTabs({
  tab,
  rows,
  stores,
  employees,
}: {
  tab: TabKey;
  rows: Record<string, unknown>[];
  stores: Store[];
  employees: Employee[];
}) {
  const storeOptions = stores.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }));
  const storeName = (id: unknown) => stores.find((s) => s.id === id)?.name ?? "";
  const employeeOptions = employees
    .filter((e) => e.active)
    .map((e) => ({ value: e.id, label: `${e.code} · ${e.full_name} (${storeName(e.store_id)})` }));

  if (tab === "accounts") {
    const fields: Field[] = [
      { key: "username", label: "Tên đăng nhập", required: true, inTable: true, hint: "Chữ không dấu, số, dấu . _ -" },
      { key: "full_name", label: "Họ tên", required: true, inTable: true },
      {
        key: "role", label: "Vai trò", type: "select", required: true, inTable: true,
        options: (["qa", "cht", "nv", "admin"] as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] })),
        format: (v) => ROLE_LABEL[v as Role] ?? "",
      },
      {
        key: "store_id", label: "Cửa hàng", type: "select", options: storeOptions, inTable: true,
        showIf: (v) => v.role === "cht", format: storeName,
      },
      {
        key: "employee_id", label: "Hồ sơ nhân viên", type: "select", options: employeeOptions, required: true,
        showIf: (v) => v.role === "nv", hint: "Cửa hàng tự lấy theo hồ sơ nhân viên",
      },
      { key: "password", label: "Mật khẩu", type: "password", required: true, hint: "Khi sửa: để trống nếu không đổi mật khẩu" },
      { key: "active", label: "Đang hoạt động", type: "checkbox", inTable: true },
    ];
    return (
      <CrudTable
        title="Tài khoản"
        rows={rows}
        fields={fields}
        defaults={{ role: "qa", active: true }}
        onSave={(id, v) =>
          saveAccount(id, {
            username: String(v.username ?? ""),
            full_name: String(v.full_name ?? ""),
            role: v.role as AccountInput["role"],
            store_id: (v.store_id as string) || null,
            employee_id: (v.employee_id as string) || null,
            active: !!v.active,
            password: String(v.password ?? ""),
          })
        }
      />
    );
  }

  if (tab === "stores") {
    const fields: Field[] = [
      { key: "code", label: "Mã cửa hàng", required: true, inTable: true },
      { key: "name", label: "Tên cửa hàng", required: true, inTable: true },
      { key: "address", label: "Địa chỉ", type: "textarea", inTable: true },
      { key: "active", label: "Đang hoạt động", type: "checkbox", inTable: true },
    ];
    return <CrudTable title="Cửa hàng" rows={rows} fields={fields} defaults={{ active: true }} onSave={(id, v) => saveEntity("stores", id, v)} />;
  }

  if (tab === "employees") {
    const fields: Field[] = [
      { key: "code", label: "Mã nhân viên", required: true, inTable: true },
      { key: "full_name", label: "Họ tên", required: true, inTable: true },
      { key: "store_id", label: "Cửa hàng", type: "select", options: storeOptions, required: true, inTable: true, format: storeName },
      { key: "position", label: "Chức vụ", inTable: true },
      { key: "active", label: "Đang làm việc", type: "checkbox", inTable: true },
    ];
    return <CrudTable title="Nhân viên" rows={rows} fields={fields} defaults={{ active: true }} onSave={(id, v) => saveEntity("employees", id, v)} />;
  }

  const fields: Field[] = [
    { key: "code", label: "Mã lỗi", required: true, inTable: true },
    { key: "name", label: "Tên lỗi", required: true, inTable: true },
    { key: "group_name", label: "Nhóm lỗi", inTable: true },
    {
      key: "severity", label: "Cấp độ", type: "select", required: true, inTable: true,
      options: (Object.keys(SEVERITY_LABEL) as Severity[]).map((s) => ({ value: s, label: SEVERITY_LABEL[s] })),
      format: (v) => SEVERITY_LABEL[v as Severity] ?? "",
    },
    {
      key: "amount", label: "Tiền phạt đề xuất (đ)", type: "number", required: true, inTable: true,
      format: (v) => money(Number(v)), hint: "Thay đổi chỉ áp dụng cho phiếu phát hành sau này",
    },
    { key: "description", label: "Mô tả", type: "textarea" },
    { key: "active", label: "Đang áp dụng", type: "checkbox", inTable: true },
  ];
  return (
    <CrudTable
      title="Danh mục lỗi"
      rows={rows}
      fields={fields}
      defaults={{ active: true, severity: "nhe" }}
      onSave={(id, v) => saveEntity("violation_types", id, v)}
    />
  );
}
