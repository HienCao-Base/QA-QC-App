// Kiểm thử lớp API (gọi thẳng Supabase bằng từng tài khoản, không qua giao diện).
// Chạy: node --env-file=.env.local --test --test-concurrency=1 tests/api.test.mjs
import { before, after, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  setup, cleanup, ctx, svc, as, uid, call, anonClient, draft, issued, submitted, locked, appealed,
  itemsOf, ticket, keepAll, notifs, events, EVIDENCE, SAMPLE_JPG,
} from "./lib.mjs";

const OK = (err) => assert.equal(err, null, `mong đợi thành công, nhận lỗi: ${err}`);
const NO = (err, re) => {
  assert.ok(err, "mong đợi bị từ chối nhưng lại thành công");
  if (re) assert.match(err, re);
};
const REASON = "TEST lý do đủ dài để hợp lệ";
const rows = async (q) => (await q).data?.length ?? 0;

before(setup, { timeout: 120_000 });
after(async () => {
  if (!process.env.KEEP) await cleanup();
});

// =====================================================================
describe("Nhóm 1 · Phân quyền (API)", () => {
  test("PQ-01 CHT không xem được phiếu của cửa hàng khác", async () => {
    const id = await issued({ store: "TST2", items: [{ vt: "DP01", emp: "TNV3" }] });
    const c = await as("test.cht1");
    assert.equal(await rows(c.from("tickets").select("id").eq("id", id)), 0);
    assert.equal(await rows(c.from("ticket_items").select("id").eq("ticket_id", id)), 0);
    assert.equal(await rows(c.from("ticket_events").select("id").eq("ticket_id", id)), 0);
    assert.equal(await rows((await as("test.cht2")).from("tickets").select("id").eq("id", id)), 1);
  });

  test("PQ-02 Phiếu nháp chỉ QA lập phiếu thấy", async () => {
    const id = await draft();
    for (const u of ["test.qa2", "test.cht1", "test.nv1", "test.admin"])
      assert.equal(await rows((await as(u)).from("tickets").select("id").eq("id", id)), 0, u);
    assert.equal(await rows((await as("test.qa1")).from("tickets").select("id").eq("id", id)), 1);
  });

  test("PQ-03 Nhân viên chỉ xem phiếu của cửa hàng mình", async () => {
    const other = await issued({ store: "TST2", items: [{ vt: "DP01", emp: "TNV3" }] });
    const mine = await issued();
    const c = await as("test.nv1");
    assert.equal(await rows(c.from("tickets").select("id").eq("id", other)), 0);
    assert.equal(await rows(c.from("tickets").select("id").eq("id", mine)), 1);
  });

  test("PQ-04 CHT / NV / Admin không tạo được phiếu", async () => {
    for (const u of ["test.cht1", "test.nv1", "test.admin"]) {
      const { error } = await (await as(u)).from("tickets").insert({ store_id: ctx.store.TST1, created_by: uid(u) });
      assert.ok(error, `${u} tạo được phiếu`);
    }
  });

  test("PQ-05 Không sửa thẳng bảng phiếu / dòng lỗi để vượt quy trình", async () => {
    const id = await submitted();
    const [item] = await itemsOf(id);
    for (const u of ["test.cht1", "test.qa1", "test.admin", "test.nv1"]) {
      const c = await as(u);
      await c.from("tickets").update({ status: "locked" }).eq("id", id);
      await c.from("ticket_items").update({ final_amount: 0, suggested_amount: 1 }).eq("id", item.id);
      await c.from("ticket_items").delete().eq("id", item.id);
    }
    const t = await ticket(id);
    const [after] = await itemsOf(id);
    assert.equal(t.status, "pending_decision");
    assert.equal(after.final_amount, null);
    assert.equal(after.suggested_amount, ctx.vt.DP01.amount);
  });

  test("PQ-06 QA khác không phát hành / sửa / chốt / trả lại / hủy phiếu của QA1", async () => {
    const d = await draft();
    NO(await call("test.qa2", "issue_ticket", { p_ticket: d }));
    const p = await issued();
    const [it] = await itemsOf(p);
    NO(await call("test.qa2", "edit_issued_item", { p_ticket: p, p_item: it.id, p_data: { violation_type_id: ctx.vt.NL01.id, evidence_paths: EVIDENCE }, p_reason: REASON }));
    NO(await call("test.qa2", "cancel_ticket", { p_ticket: p, p_reason: REASON }));
    const s = await submitted();
    NO(await call("test.qa2", "lock_ticket", { p_ticket: s, p_items: await keepAll(s) }));
    NO(await call("test.qa2", "return_to_store", { p_ticket: s, p_reason: REASON }));
  });

  test("PQ-07 CHT cửa hàng khác không giải trình / khiếu nại được", async () => {
    const p = await issued();
    const [it] = await itemsOf(p);
    NO(await call("test.cht2", "save_explanation", { p_ticket: p, p_items: [{ id: it.id, cht_response: "accept" }], p_submit: true }));
    const l = await locked();
    NO(await call("test.cht2", "appeal_ticket", { p_ticket: l, p_reason: REASON }));
  });

  test("PQ-08 Nhân viên: không gửi được, không giải trình lỗi của người khác", async () => {
    const p = await issued({ items: [{ vt: "DP01", emp: "TNV1" }, { vt: "QT01", emp: "TNV2" }] });
    const [a, b] = await itemsOf(p);
    OK(await call("test.nv1", "save_explanation", { p_ticket: p, p_items: [{ id: a.id, cht_response: "accept" }], p_submit: false }));
    NO(await call("test.nv1", "save_explanation", { p_ticket: p, p_items: [{ id: b.id, cht_response: "accept" }], p_submit: false }));
    NO(await call("test.nv1", "save_explanation", { p_ticket: p, p_items: [{ id: a.id, cht_response: "accept" }], p_submit: true }));
    const l = await locked();
    NO(await call("test.nv1", "appeal_ticket", { p_ticket: l, p_reason: REASON }));
  });

  test("PQ-09 Chỉ Admin mở lại phiếu / xử lý khiếu nại", async () => {
    const l = await locked();
    for (const u of ["test.qa1", "test.cht1", "test.nv1"]) NO(await call(u, "reopen_ticket", { p_ticket: l, p_reason: REASON }), undefined);
    const a = await appealed();
    for (const u of ["test.qa1", "test.cht1", "test.nv1"])
      NO(await call(u, "resolve_appeal", { p_ticket: a, p_accept: false, p_items: [], p_reason: REASON }));
  });

  test("PQ-10 Admin không phát hành / chốt thay QA", async () => {
    const s = await submitted();
    NO(await call("test.admin", "lock_ticket", { p_ticket: s, p_items: await keepAll(s) }));
  });

  test("PQ-11 Tài khoản không có hồ sơ (tự đăng ký) không làm được gì", async () => {
    const l = await locked();
    const c = await as("test.ghost");
    assert.equal(await rows(c.from("tickets").select("id")), 0);
    NO(await call("test.ghost", "reopen_ticket", { p_ticket: l, p_reason: REASON }));
    const a = await appealed();
    NO(await call("test.ghost", "resolve_appeal", { p_ticket: a, p_accept: false, p_items: [], p_reason: REASON }));
    assert.equal((await ticket(l)).status, "locked");
    assert.equal((await ticket(a)).appeal_status, "pending");
  });

  test("PQ-12 Tài khoản đã khóa (active=false) không thao tác được", async () => {
    // tạo nháp bằng service role cho test.off rồi thử phát hành bằng phiên còn hiệu lực
    const { data: t } = await svc.from("tickets").insert({ store_id: ctx.store.TST1, created_by: uid("test.off") }).select("id").single();
    await svc.from("ticket_items").insert({ ticket_id: t.id, violation_type_id: ctx.vt.DP01.id, evidence_paths: EVIDENCE });
    NO(await call("test.off", "issue_ticket", { p_ticket: t.id }));
    assert.equal((await ticket(t.id)).status, "draft");
  });

  test("PQ-13 Chưa đăng nhập: không đọc / gọi được gì", async () => {
    const c = anonClient();
    assert.equal(await rows(c.from("tickets").select("id")), 0);
    assert.equal(await rows(c.from("notifications").select("id")), 0);
    const l = await locked();
    assert.ok((await c.rpc("reopen_ticket", { p_ticket: l, p_reason: REASON })).error);
  });

  test("PQ-14 Không gọi được hàm nội bộ (gửi thông báo, ghi lịch sử, job hạn)", async () => {
    const l = await locked();
    for (const [fn, args] of [
      ["notify_store", { p_ticket: l, p_message: "x" }],
      ["notify_user", { p_user: uid("test.qa1"), p_ticket: l, p_message: "x" }],
      ["notify_admins", { p_ticket: l, p_message: "x" }],
      ["log_event", { p_ticket: l, p_actor: uid("test.qa1"), p_action: "locked" }],
      ["process_deadlines", {}],
    ])
      NO(await call("test.qa1", fn, args), undefined);
  });

  test("PQ-15 Người không phải Admin không sửa được danh mục / tài khoản", async () => {
    for (const u of ["test.qa1", "test.cht1", "test.nv1"]) {
      const c = await as(u);
      await c.from("violation_types").update({ amount: 1 }).eq("id", ctx.vt.DP01.id);
      await c.from("stores").update({ name: "HACK" }).eq("id", ctx.store.TST1);
      await c.from("profiles").update({ role: "admin" }).eq("id", uid(u));
    }
    assert.equal((await svc.from("violation_types").select("amount").eq("id", ctx.vt.DP01.id).single()).data.amount, ctx.vt.DP01.amount);
    assert.equal((await svc.from("stores").select("name").eq("id", ctx.store.TST1).single()).data.name, "TEST Cửa hàng 1");
    assert.equal((await svc.from("profiles").select("role").eq("id", uid("test.qa1")).single()).data.role, "qa");
  });

  test("PQ-16 Thông báo: chỉ đọc / đánh dấu thông báo của mình", async () => {
    const id = await issued();
    const c = await as("test.cht2");
    assert.equal(await rows(c.from("notifications").select("id").eq("ticket_id", id)), 0);
    await c.from("notifications").update({ read_at: new Date().toISOString() }).eq("ticket_id", id);
    assert.ok((await notifs("test.cht1", id)).every((n) => !n.read_at));
  });

  test("PQ-17 QA không cài sẵn trạng thái khiếu nại / kết quả vào phiếu nháp", async () => {
    const c = await as("test.qa1");
    const { data: t, error } = await c
      .from("tickets")
      .insert({ store_id: ctx.store.TST1, created_by: uid("test.qa1"), appeal_status: "rejected", appeal_reason: "chặn khiếu nại" })
      .select("id")
      .single();
    if (error) return; // bị chặn ngay khi tạo: đạt
    await c.from("ticket_items").insert({
      ticket_id: t.id, violation_type_id: ctx.vt.DP01.id, evidence_paths: EVIDENCE,
      cht_response: "accept", decision: "keep", final_amount: 999999,
    });
    OK(await call("test.qa1", "issue_ticket", { p_ticket: t.id }));
    const [it] = await itemsOf(t.id);
    assert.equal(it.cht_response, null, "giải trình bị QA điền sẵn");
    assert.equal(it.final_amount, null, "kết quả chốt bị QA điền sẵn");
    const tk = await ticket(t.id);
    assert.equal(tk.appeal_status, null, "trạng thái khiếu nại bị cài sẵn, cửa hàng sẽ không khiếu nại được");
  });

  test("PQ-18 Ảnh minh chứng: cửa hàng khác không đọc được", async () => {
    // ảnh riêng của phiếu cửa hàng 2 (ảnh mẫu chung còn gắn với phiếu cửa hàng 1)
    const path = "test/only-tst2.jpg";
    await svc.storage.from("evidence").upload(path, SAMPLE_JPG, { contentType: "image/jpeg", upsert: true });
    await issued({ store: "TST2", items: [{ vt: "DP01", emp: "TNV3", paths: [path] }] });
    const url = async (u) => (await (await as(u)).storage.from("evidence").createSignedUrl(path, 60)).data?.signedUrl ?? null;
    assert.equal(await url("test.cht1"), null, "CHT cửa hàng 1 tạo được link xem ảnh phiếu cửa hàng 2");
    assert.ok(await url("test.cht2"), "CHT cửa hàng 2 không xem được ảnh phiếu của mình");
    assert.ok(await url("test.admin"), "Admin không xem được ảnh");
  });
});

// =====================================================================
describe("Nhóm 2 · Vòng đời phiếu", () => {
  test("VD-01 Phát hành: mã phiếu, hạn 48h, snapshot lỗi, báo cửa hàng", async () => {
    const id = await issued({ items: [{ vt: "DP01", emp: "TNV1" }, { vt: "QT01", emp: null }] });
    const t = await ticket(id);
    assert.equal(t.status, "pending_explanation");
    assert.match(t.code, /^QC-\d{6}-\d{4}$/);
    const h = (new Date(t.due_at) - new Date(t.issued_at)) / 3.6e6;
    assert.ok(Math.abs(h - 48) < 0.01, `hạn ${h}h`);
    const items = await itemsOf(id);
    assert.equal(items[0].suggested_amount, ctx.vt.DP01.amount);
    assert.equal(items[0].violation_name, ctx.vt.DP01.name);
    assert.equal((await notifs("test.cht1", id)).length, 1);
    assert.equal((await notifs("test.nv1", id)).length, 1, "nhân viên có lỗi phải được báo");
    assert.equal((await notifs("test.nv2", id)).length, 0, "nhân viên không có lỗi không bị báo");
    assert.equal((await notifs("test.cht2", id)).length, 0);
  });

  test("VD-02 Không phát hành phiếu rỗng / thiếu ảnh / phát hành 2 lần", async () => {
    const empty = await draft({ items: [] });
    NO(await call("test.qa1", "issue_ticket", { p_ticket: empty }), /ít nhất 1 lỗi/);
    const nophoto = await draft({ items: [{ vt: "DP01", paths: [] }] });
    NO(await call("test.qa1", "issue_ticket", { p_ticket: nophoto }), /ảnh/);
    const id = await issued();
    NO(await call("test.qa1", "issue_ticket", { p_ticket: id }));
  });

  test("VD-03 Không phát hành lỗi đã ngưng áp dụng", async () => {
    const id = await draft({ items: [{ vt: "OFF" }] });
    NO(await call("test.qa1", "issue_ticket", { p_ticket: id }), /ngưng/);
  });

  test("VD-04 Lưu nháp giải trình giữ trạng thái; NV soạn thì CHT được báo", async () => {
    const id = await issued();
    const [it] = await itemsOf(id);
    OK(await call("test.nv1", "save_explanation", { p_ticket: id, p_items: [{ id: it.id, cht_response: "dispute", explanation: "NV giải thích" }], p_submit: false }));
    assert.equal((await ticket(id)).status, "pending_explanation");
    assert.ok((await notifs("test.cht1", id)).some((n) => /soạn giải trình/.test(n.message)));
    assert.equal((await itemsOf(id))[0].explained_by, uid("test.nv1"));
  });

  test("VD-05 CHT gửi: chờ chốt, lỗi bỏ trống = chấp nhận, QA được báo", async () => {
    const id = await issued({ items: [{ vt: "DP01", emp: "TNV1" }, { vt: "QT01" }] });
    const [a] = await itemsOf(id);
    OK(await call("test.cht1", "save_explanation", { p_ticket: id, p_items: [{ id: a.id, cht_response: "dispute", explanation: "Không đúng" }], p_submit: true }));
    const t = await ticket(id);
    assert.equal(t.status, "pending_decision");
    assert.ok(t.submitted_at);
    const items = await itemsOf(id);
    assert.deepEqual(items.map((i) => i.cht_response), ["dispute", "accept"]);
    assert.ok((await notifs("test.qa1", id)).some((n) => /đã gửi giải trình/.test(n.message)));
  });

  test("VD-06 Không đồng ý mà không ghi giải trình thì không gửi được", async () => {
    const id = await issued();
    const [a] = await itemsOf(id);
    NO(await call("test.cht1", "save_explanation", { p_ticket: id, p_items: [{ id: a.id, cht_response: "dispute", explanation: "   " }], p_submit: true }));
  });

  test("VD-07 QA chốt: khóa, tổng tiền, báo cửa hàng kèm hạn khiếu nại", async () => {
    const id = await submitted({ items: [{ vt: "DP01", emp: "TNV1" }, { vt: "QT01" }] });
    const [a, b] = await itemsOf(id);
    OK(await call("test.qa1", "lock_ticket", {
      p_ticket: id,
      p_items: [
        { id: a.id, decision: "keep" },
        { id: b.id, decision: "reduce", final_amount: 100000, decision_reason: REASON },
      ],
    }));
    const t = await ticket(id);
    assert.equal(t.status, "locked");
    assert.equal(t.locked_by, uid("test.qa1"));
    const items = await itemsOf(id);
    assert.deepEqual(items.map((i) => i.final_amount), [ctx.vt.DP01.amount, 100000]);
    assert.ok((await notifs("test.cht1", id)).some((n) => /150\.000đ/.test(n.message) && /24 giờ/.test(n.message)));
  });

  test("VD-08 Khiếu nại → Admin chấp nhận giảm: lưu mức QA cũ, báo đủ bên", async () => {
    const id = await appealed();
    assert.equal((await ticket(id)).appeal_status, "pending");
    assert.ok((await notifs("test.admin", id)).some((n) => /khiếu nại/.test(n.message)));
    assert.ok((await notifs("test.qa1", id)).some((n) => /khiếu nại/.test(n.message)));
    const [it] = await itemsOf(id);
    OK(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: true, p_items: [{ id: it.id, final_amount: 20000 }], p_reason: REASON }));
    const [after] = await itemsOf(id);
    assert.equal(after.final_amount, 20000);
    assert.equal(after.qa_final_amount, ctx.vt.DP01.amount);
    const t = await ticket(id);
    assert.equal(t.appeal_status, "accepted");
    assert.equal(t.status, "locked");
    assert.ok((await notifs("test.cht1", id)).some((n) => /Admin đã xử lý/.test(n.message)));
    assert.ok((await notifs("test.qa1", id)).some((n) => /Admin đã xử lý/.test(n.message)));
  });

  test("VD-09 Khiếu nại → Admin giữ nguyên", async () => {
    const id = await appealed();
    OK(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: false, p_items: [], p_reason: REASON }));
    assert.equal((await ticket(id)).appeal_status, "rejected");
    assert.equal((await itemsOf(id))[0].final_amount, ctx.vt.DP01.amount);
  });

  test("VD-10 Admin mở lại → chờ chốt → QA chốt lại", async () => {
    const id = await locked();
    OK(await call("test.admin", "reopen_ticket", { p_ticket: id, p_reason: REASON }));
    assert.equal((await ticket(id)).status, "pending_decision");
    assert.ok((await notifs("test.qa1", id)).some((n) => /mở lại/.test(n.message)));
    OK(await call("test.qa1", "lock_ticket", { p_ticket: id, p_items: await keepAll(id) }));
  });

  test("VD-11 Trả lại cửa hàng: về chờ giải trình, hạn 48h mới, giữ giải trình", async () => {
    const id = await submitted();
    OK(await call("test.qa1", "return_to_store", { p_ticket: id, p_reason: REASON }));
    const t = await ticket(id);
    assert.equal(t.status, "pending_explanation");
    assert.ok(Math.abs((new Date(t.due_at) - Date.now()) / 3.6e6 - 48) < 0.05);
    const [it] = await itemsOf(id);
    assert.equal(it.cht_response, "dispute");
    assert.equal(it.decision, null);
    assert.ok((await notifs("test.cht1", id)).some((n) => /trả lại/.test(n.message)));
    // cửa hàng gửi lại được
    OK(await call("test.cht1", "save_explanation", { p_ticket: id, p_items: [{ id: it.id, cht_response: "accept" }], p_submit: true }));
  });

  test("VD-12 Hủy phiếu: được khi chờ giải trình, không được sau khi cửa hàng gửi", async () => {
    const p = await issued();
    OK(await call("test.qa1", "cancel_ticket", { p_ticket: p, p_reason: REASON }));
    assert.equal((await ticket(p)).status, "cancelled");
    assert.ok((await notifs("test.cht1", p)).some((n) => /hủy/.test(n.message)));
    const s = await submitted();
    NO(await call("test.qa1", "cancel_ticket", { p_ticket: s, p_reason: REASON }));
  });

  test("VD-13 Quá hạn: tự khóa theo mức đề xuất, CHT không gửi được nữa", async () => {
    const id = await issued();
    await svc.from("tickets").update({ due_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", id);
    const [it] = await itemsOf(id);
    NO(await call("test.cht1", "save_explanation", { p_ticket: id, p_items: [{ id: it.id, cht_response: "accept" }], p_submit: true }), /quá hạn/);
    const { error } = await svc.rpc("process_deadlines");
    assert.equal(error, null, error?.message);
    const t = await ticket(id);
    assert.equal(t.status, "locked");
    assert.equal(t.auto_locked, true);
    assert.equal((await itemsOf(id))[0].final_amount, ctx.vt.DP01.amount);
    // vẫn được khiếu nại sau khi tự khóa
    OK(await call("test.cht1", "appeal_ticket", { p_ticket: id, p_reason: REASON }));
  });

  test("VD-14 Xóa phiếu nháp được; phiếu đã phát hành không xóa được", async () => {
    const d = await draft();
    await (await as("test.qa1")).from("tickets").delete().eq("id", d);
    assert.equal(await ticket(d), null);
    const p = await issued();
    await (await as("test.qa1")).from("tickets").delete().eq("id", p);
    assert.ok(await ticket(p));
  });

  test("VD-15 Lịch sử phiếu ghi đủ các bước", async () => {
    const id = await appealed();
    assert.deepEqual((await events(id)).map((e) => e.action), ["issued", "submitted", "locked", "appealed"]);
  });
});

// =====================================================================
describe("Nhóm 3 · Quy tắc nghiệp vụ", () => {
  const lockOne = async (id, row) => {
    const [it] = await itemsOf(id);
    return call("test.qa1", "lock_ticket", { p_ticket: id, p_items: [{ id: it.id, ...row }] });
  };

  test("NV-01 Chốt cao hơn mức đề xuất bị từ chối (mọi cách)", async () => {
    const id = await submitted();
    NO(await lockOne(id, { decision: "reduce", final_amount: 500000, decision_reason: REASON }));
    NO(await lockOne(id, { decision: "adjust", final_amount: 500000, decision_reason: REASON }));
    NO(await lockOne(id, { decision: "auto", final_amount: 500000, decision_reason: REASON }));
    NO(await lockOne(id, { decision: "keep", final_amount: 500000 }).then(async (e) => {
      // "Giữ" luôn lấy mức đề xuất, số tiền gửi kèm phải bị bỏ qua
      if (!e) {
        assert.equal((await itemsOf(id))[0].final_amount, ctx.vt.DP01.amount);
        return "ok-ignored";
      }
      return e;
    }));
  });

  test("NV-02 Giảm phải nhỏ hơn mức đề xuất; không âm", async () => {
    const id = await submitted();
    NO(await lockOne(id, { decision: "reduce", final_amount: ctx.vt.DP01.amount, decision_reason: REASON }));
    NO(await lockOne(id, { decision: "reduce", final_amount: -1, decision_reason: REASON }));
    NO(await lockOne(id, { decision: "reduce", final_amount: null, decision_reason: REASON }));
  });

  test("NV-03 Lý do giảm / miễn tối thiểu 15 ký tự (khoảng trắng không tính)", async () => {
    const id = await submitted();
    NO(await lockOne(id, { decision: "waive", decision_reason: "oke" }));
    NO(await lockOne(id, { decision: "waive", decision_reason: "x" }));
    NO(await lockOne(id, { decision: "waive", decision_reason: "a              b" })); // 3 ký tự sau khi gộp khoảng trắng
    NO(await lockOne(id, { decision: "waive", decision_reason: "12345678901234" })); // 14
    OK(await lockOne(id, { decision: "waive", decision_reason: "123456789012345" })); // 15
  });

  test("NV-04 Phải chốt đủ lỗi, không chốt lỗi của phiếu khác", async () => {
    const id = await submitted({ items: [{ vt: "DP01" }, { vt: "QT01" }] });
    const other = await submitted();
    const [a] = await itemsOf(id);
    const [x] = await itemsOf(other);
    NO(await call("test.qa1", "lock_ticket", { p_ticket: id, p_items: [{ id: a.id, decision: "keep" }] }));
    NO(await call("test.qa1", "lock_ticket", { p_ticket: id, p_items: [{ id: a.id, decision: "keep" }, { id: x.id, decision: "keep" }] }));
    NO(await call("test.qa1", "lock_ticket", { p_ticket: id, p_items: [{ id: a.id, decision: "keep" }, { id: a.id, decision: "keep" }] }), undefined);
  });

  test("NV-05 Chốt khi chưa ở trạng thái chờ chốt bị từ chối", async () => {
    const p = await issued();
    NO(await lockOne(p, { decision: "keep" }));
    const l = await locked();
    NO(await lockOne(l, { decision: "keep" }));
  });

  test("NV-06 Khiếu nại: 1 lần, trong 24h, lý do ≥ 15 ký tự", async () => {
    const id = await locked();
    NO(await call("test.cht1", "appeal_ticket", { p_ticket: id, p_reason: "không đồng ý" }), /15/);
    OK(await call("test.cht1", "appeal_ticket", { p_ticket: id, p_reason: REASON }));
    NO(await call("test.cht1", "appeal_ticket", { p_ticket: id, p_reason: REASON }), /1 lần|rồi/);
    const late = await locked();
    await svc.from("tickets").update({ locked_at: new Date(Date.now() - 24 * 3.6e6 - 60_000).toISOString() }).eq("id", late);
    NO(await call("test.cht1", "appeal_ticket", { p_ticket: late, p_reason: REASON }), /24/);
    const notLocked = await submitted();
    NO(await call("test.cht1", "appeal_ticket", { p_ticket: notLocked, p_reason: REASON }));
  });

  test("NV-07 Sau khi Admin xử lý, không khiếu nại lại được", async () => {
    const id = await appealed();
    OK(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: false, p_items: [], p_reason: REASON }));
    NO(await call("test.cht1", "appeal_ticket", { p_ticket: id, p_reason: REASON }));
    NO(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: false, p_items: [], p_reason: REASON }));
  });

  test("NV-08 Admin xử lý: không tăng tiền, chấp nhận phải giảm ít nhất 1 lỗi, lý do ≥ 15", async () => {
    const id = await appealed();
    const [it] = await itemsOf(id);
    NO(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: true, p_items: [{ id: it.id, final_amount: it.final_amount + 1 }], p_reason: REASON }));
    NO(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: true, p_items: [{ id: it.id, final_amount: it.final_amount }], p_reason: REASON }));
    NO(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: true, p_items: [], p_reason: REASON }));
    NO(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: true, p_items: [{ id: it.id, final_amount: -5 }], p_reason: REASON }));
    NO(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: false, p_items: [], p_reason: "ok" }));
    const other = await locked();
    const [x] = await itemsOf(other);
    NO(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: true, p_items: [{ id: x.id, final_amount: 0 }], p_reason: REASON }));
    assert.equal((await ticket(id)).appeal_status, "pending");
  });

  test("NV-09 Không mở lại phiếu đang có khiếu nại; lý do mở lại ≥ 15", async () => {
    const id = await appealed();
    NO(await call("test.admin", "reopen_ticket", { p_ticket: id, p_reason: REASON }), /khiếu nại/);
    const l = await locked();
    NO(await call("test.admin", "reopen_ticket", { p_ticket: l, p_reason: "sai" }), /15/);
  });

  test("NV-10 Trả lại cửa hàng: lý do ≥ 15, chỉ khi chờ chốt", async () => {
    const s = await submitted();
    NO(await call("test.qa1", "return_to_store", { p_ticket: s, p_reason: "tăng tiền" }), /15/);
    const p = await issued();
    NO(await call("test.qa1", "return_to_store", { p_ticket: p, p_reason: REASON }));
  });

  test("NV-11 Mở lại phiếu đã xử lý khiếu nại: QA không được chốt cao hơn mức Admin đã giảm", async () => {
    const id = await appealed();
    const [it] = await itemsOf(id);
    OK(await call("test.admin", "resolve_appeal", { p_ticket: id, p_accept: true, p_items: [{ id: it.id, final_amount: 10000 }], p_reason: REASON }));
    OK(await call("test.admin", "reopen_ticket", { p_ticket: id, p_reason: REASON }));
    const err = await call("test.qa1", "lock_ticket", { p_ticket: id, p_items: [{ id: it.id, decision: "keep" }] });
    const [after] = await itemsOf(id);
    assert.ok(err || after.final_amount <= 10000, `QA chốt lại ${after.final_amount}đ, vượt mức Admin đã giảm (10.000đ)`);
  });

  // ---- Sửa phiếu đang chờ giải trình (0004) ----
  const data = (vt, extra = {}) => ({ violation_type_id: ctx.vt[vt].id, employee_id: ctx.emp.TNV1, description: "Mô tả lỗi 1", evidence_paths: EVIDENCE, ...extra });

  test("NV-12 Sửa nhỏ không cần lý do; đổi lỗi / nhân viên / thêm lỗi bắt buộc lý do", async () => {
    const id = await issued();
    const [it] = await itemsOf(id);
    OK(await call("test.qa1", "edit_issued_item", { p_ticket: id, p_item: it.id, p_data: data("DP01", { description: "Mô tả mới" }), p_reason: "" }));
    NO(await call("test.qa1", "edit_issued_item", { p_ticket: id, p_item: it.id, p_data: data("NL01"), p_reason: "" }), /lý do/);
    NO(await call("test.qa1", "edit_issued_item", { p_ticket: id, p_item: it.id, p_data: data("DP01", { employee_id: ctx.emp.TNV2 }), p_reason: " " }), /lý do/);
    NO(await call("test.qa1", "edit_issued_item", { p_ticket: id, p_item: null, p_data: data("QT01"), p_reason: "" }), /lý do/);
    OK(await call("test.qa1", "edit_issued_item", { p_ticket: id, p_item: it.id, p_data: data("NL01"), p_reason: REASON }));
    const [after] = await itemsOf(id);
    assert.equal(after.suggested_amount, ctx.vt.NL01.amount, "đổi lỗi phải cập nhật mức tiền theo danh mục");
    assert.ok(after.edited_at);
    assert.ok((await events(id)).some((e) => e.action === "edited"));
  });

  test("NV-13 Đổi lỗi: xóa giải trình cũ của lỗi đó, gia hạn còn ≥ 24h", async () => {
    const id = await issued();
    const [it] = await itemsOf(id);
    OK(await call("test.cht1", "save_explanation", { p_ticket: id, p_items: [{ id: it.id, cht_response: "dispute", explanation: "abc" }], p_submit: false }));
    await svc.from("tickets").update({ due_at: new Date(Date.now() + 2 * 3.6e6).toISOString() }).eq("id", id);
    OK(await call("test.qa1", "edit_issued_item", { p_ticket: id, p_item: it.id, p_data: data("QT01"), p_reason: REASON }));
    const [after] = await itemsOf(id);
    assert.equal(after.cht_response, null);
    assert.equal(after.explanation, null);
    const h = (new Date((await ticket(id)).due_at) - Date.now()) / 3.6e6;
    assert.ok(h > 23.9 && h <= 24.01, `hạn còn ${h}h`);
  });

  test("NV-14 Không xóa ảnh đã phát hành; nhân viên khác cửa hàng / lỗi ngưng áp dụng bị từ chối", async () => {
    const id = await issued();
    const [it] = await itemsOf(id);
    NO(await call("test.qa1", "edit_issued_item", { p_ticket: id, p_item: it.id, p_data: data("DP01", { evidence_paths: ["test/other.jpg"] }), p_reason: REASON }), /ảnh/);
    NO(await call("test.qa1", "edit_issued_item", { p_ticket: id, p_item: it.id, p_data: data("DP01", { employee_id: ctx.emp.TNV3 }), p_reason: REASON }), /cửa hàng/);
    NO(await call("test.qa1", "edit_issued_item", { p_ticket: id, p_item: it.id, p_data: data("OFF"), p_reason: REASON }), /ngưng/);
    NO(await call("test.qa1", "edit_issued_item", { p_ticket: id, p_item: null, p_data: data("DP01", { evidence_paths: [] }), p_reason: REASON }), /ảnh/);
  });

  test("NV-15 Không sửa phiếu sau khi cửa hàng gửi hoặc đã quá hạn", async () => {
    const s = await submitted();
    const [a] = await itemsOf(s);
    NO(await call("test.qa1", "edit_issued_item", { p_ticket: s, p_item: a.id, p_data: data("DP01", { description: "x" }), p_reason: REASON }));
    const p = await issued();
    const [b] = await itemsOf(p);
    await svc.from("tickets").update({ due_at: new Date(Date.now() - 1000).toISOString() }).eq("id", p);
    NO(await call("test.qa1", "edit_issued_item", { p_ticket: p, p_item: b.id, p_data: data("DP01", { description: "x" }), p_reason: REASON }), /quá hạn/);
  });

  test("NV-16 Xóa lỗi: bắt buộc lý do, phải còn ít nhất 1 lỗi", async () => {
    const id = await issued({ items: [{ vt: "DP01", emp: "TNV1" }, { vt: "QT01" }] });
    const [a, b] = await itemsOf(id);
    NO(await call("test.qa1", "delete_issued_item", { p_ticket: id, p_item: b.id, p_reason: "" }), /lý do/i);
    OK(await call("test.qa1", "delete_issued_item", { p_ticket: id, p_item: b.id, p_reason: REASON }));
    NO(await call("test.qa1", "delete_issued_item", { p_ticket: id, p_item: a.id, p_reason: REASON }), /ít nhất 1 lỗi/);
  });

  test("NV-17 Lý do hủy phiếu / xóa lỗi / sửa lớn cũng phải đủ 15 ký tự", async () => {
    const p = await issued({ items: [{ vt: "DP01", emp: "TNV1" }, { vt: "QT01" }] });
    const [a, b] = await itemsOf(p);
    const edit = (reason) => call("test.qa1", "edit_issued_item", { p_ticket: p, p_item: a.id, p_data: data("NL01"), p_reason: reason });
    NO(await call("test.qa1", "delete_issued_item", { p_ticket: p, p_item: b.id, p_reason: "nhầm" }), /15/);
    NO(await edit("chọn nhầm"), /15/);
    NO(await call("test.qa1", "cancel_ticket", { p_ticket: p, p_reason: "nhầm" }), /15/);
    NO(await call("test.qa1", "cancel_ticket", { p_ticket: p, p_reason: "a              b" }), /15/);
    OK(await edit("Chọn nhầm lỗi khi kiểm tra"));
    OK(await call("test.qa1", "delete_issued_item", { p_ticket: p, p_item: b.id, p_reason: "Lỗi này ghi trùng với lỗi 1" }));
    OK(await call("test.qa1", "cancel_ticket", { p_ticket: p, p_reason: "Phát hành nhầm cửa hàng" }));
  });

});

// =====================================================================
describe("Nhóm 5 · Thông báo (API)", () => {
  test("TB-01 Mỗi bước báo đúng người, không báo nhầm", async () => {
    const id = await appealed();
    const n = async (u) => (await notifs(u, id)).length;
    assert.equal(await n("test.cht2"), 0);
    assert.equal(await n("test.qa2"), 0);
    assert.equal(await n("test.nv2"), 0);
    assert.ok((await n("test.cht1")) >= 2); // phát hành + chốt
    assert.ok((await n("test.qa1")) >= 2); // gửi + khiếu nại
    assert.equal(await n("test.admin"), 1); // khiếu nại
  });

  test("TB-02 Đánh dấu đã đọc từng thông báo, đếm chưa đọc đúng", async () => {
    const id = await issued();
    const c = await as("test.cht1");
    const count = async () => (await c.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)).count;
    const before = await count();
    const { data: [one] } = await c.from("notifications").select("id").eq("ticket_id", id).limit(1);
    await c.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", one.id);
    assert.equal(await count(), before - 1);
  });

  test("TB-03 Người dùng không sửa được nội dung thông báo của mình", async () => {
    const id = await issued();
    const c = await as("test.cht1");
    const { data: [one] } = await c.from("notifications").select("id, message").eq("ticket_id", id).limit(1);
    await c.from("notifications").update({ message: "HACK", ticket_id: null }).eq("id", one.id);
    const { data } = await svc.from("notifications").select("message, ticket_id").eq("id", one.id).single();
    assert.equal(data.message, one.message, "người dùng sửa được nội dung thông báo");
  });
});
