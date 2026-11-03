// Kiểm thử giao diện trên điện thoại giả lập (iPhone 13, thao tác chạm).
// Cần app đang chạy: BASE=http://localhost:3123 (mặc định).
// Chạy: node --env-file=.env.local --test --test-concurrency=1 tests/ui.test.mjs
import { before, after, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright-core";
import {
  setup, cleanup, ctx, svc, uid, PASSWORD, draft, issued, submitted, locked, appealed, itemsOf, ticket, events,
} from "./lib.mjs";

const BASE = process.env.BASE ?? "http://localhost:3123";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SHOTS = fileURLToPath(new URL("./shots/", import.meta.url));
fs.mkdirSync(SHOTS, { recursive: true });
let browser;
const T = { timeout: 20_000 };
const id36 = /\/phieu\/[0-9a-f-]{36}/;

before(async () => {
  await setup();
  browser = await chromium.launch({ executablePath: CHROME });
}, { timeout: 120_000 });
after(async () => {
  await browser?.close();
  if (!process.env.KEEP) await cleanup();
});

/** Mở điện thoại, đăng nhập. Trả về page có danh sách lỗi JS. */
async function phone(username, { device = "iPhone 13" } = {}) {
  const c = await browser.newContext({ ...devices[device], locale: "vi-VN" });
  const page = await c.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) page.errors.push(m.text());
  });
  if (username) {
    await page.goto(BASE + "/login");
    await page.getByLabel("Tên đăng nhập").fill(username);
    await page.getByLabel("Mật khẩu").fill(PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).tap();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), T);
    await page.getByRole("heading", { level: 1 }).first().waitFor(T);
  }
  page.done = async (name) => {
    await page.screenshot({ path: SHOTS + `${name.replace(/[^\w]+/g, "_").slice(0, 50)}.png` });
    await c.close();
  };
  return page;
}

async function open(page, path) {
  await page.goto(BASE + path);
  await page.waitForLoadState("networkidle");
}

/** Kiểm tra chung cho một màn: không lỗi JS, không cuộn ngang, có tiêu đề. */
async function screenOk(page, label) {
  const problems = [];
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) problems.push(`cuộn ngang ${overflow}px`);
  if (!(await page.locator("h1").count())) problems.push("không có tiêu đề h1");
  if (await page.getByText(/Application error|Unhandled Runtime Error|Có lỗi xảy ra/).count()) problems.push("hiện trang lỗi");
  // vùng chạm quá nhỏ (trừ link nằm trong đoạn văn)
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=radio], [role=tab]")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        if (el.closest(".sr-only") || getComputedStyle(el).visibility === "hidden") return false;
        if (el.tagName === "A" && el.closest("p")) return false;
        return r.height < 32 || r.width < 32;
      })
      .map((el) => `${el.tagName.toLowerCase()}"${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24)}"(${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)})`),
  );
  if (small.length) problems.push(`vùng chạm < 32px: ${[...new Set(small)].slice(0, 6).join(", ")}`);
  if (page.errors.length) problems.push(`lỗi JS: ${[...new Set(page.errors)].slice(0, 3).join(" | ")}`);
  page.errors.length = 0;
  return problems.length ? `${label}: ${problems.join("; ")}` : null;
}

const jpeg = async (page) =>
  Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 480; c.height = 360;
      const g = c.getContext("2d");
      g.fillStyle = "#1f5fa8"; g.fillRect(0, 0, 480, 360);
      g.fillStyle = "#fff"; g.font = "48px sans-serif"; g.fillText("TEST", 170, 190);
      return c.toDataURL("image/jpeg").split(",")[1];
    }),
    "base64",
  );

async function confirmDialog(page, { reason, button }) {
  const dlg = page.getByRole("alertdialog");
  await dlg.waitFor(T);
  if (reason != null) await dlg.getByRole("textbox").fill(reason);
  await dlg.getByRole("button", { name: button, exact: true }).tap();
}

const toast = (page, text) => page.locator("[data-sonner-toast]").filter({ hasText: text }).first().waitFor(T);

// =====================================================================
describe("Nhóm 7 · Màn hình & mobile", () => {
  test("MH-01 Đăng nhập: sai mật khẩu báo lỗi, để trống không gửi", async () => {
    const page = await phone(null);
    await open(page, "/login");
    await page.getByRole("button", { name: "Đăng nhập" }).tap();
    assert.match(page.url(), /\/login/);
    await page.getByLabel("Tên đăng nhập").fill("test.qa1");
    await page.getByLabel("Mật khẩu").fill("sai-mat-khau");
    await page.getByRole("button", { name: "Đăng nhập" }).tap();
    await page.getByText("Sai tên đăng nhập hoặc mật khẩu").waitFor(T);
    const p = await screenOk(page, "/login");
    await page.done("MH-01");
    assert.equal(p, null, p);
  });

  const STATES = async () => ({
    draft: await draft(),
    pending_explanation: await issued({ items: [{ vt: "DP01", emp: "TNV1" }, { vt: "QT01" }] }),
    pending_decision: await submitted(),
    locked: await locked(),
    appealed: await appealed(),
  });

  const SCREENS = {
    "test.qa1": ["/", "/phieu", "/phieu/moi", "/thong-bao"],
    "test.cht1": ["/", "/phieu", "/thong-bao"],
    "test.nv1": ["/", "/phieu", "/thong-bao"],
    "test.admin": ["/", "/phieu", "/thong-bao", "/admin"],
  };

  for (const [user, paths] of Object.entries(SCREENS)) {
    test(`MH-02 Mọi màn của ${user} hiển thị đúng trên điện thoại`, { timeout: 180_000 }, async () => {
      const ids = await STATES();
      const page = await phone(user);
      const problems = [];
      for (const p of paths) {
        await open(page, p);
        problems.push(await screenOk(page, p));
      }
      for (const [state, id] of Object.entries(ids)) {
        await open(page, `/phieu/${id}`);
        if (state === "draft" && user !== "test.qa1") continue; // không được xem (kiểm ở nhóm 1)
        problems.push(await screenOk(page, `phiếu ${state}`));
      }
      if (user === "test.admin") {
        await open(page, "/admin");
        for (const name of await page.getByRole("navigation", { name: "Danh mục quản trị" }).getByRole("link").allInnerTexts()) {
          await page.getByRole("navigation", { name: "Danh mục quản trị" }).getByRole("link", { name }).tap();
          await page.waitForLoadState("networkidle");
          problems.push(await screenOk(page, `admin tab ${name}`));
        }
      }
      await page.done(`MH-02-${user}`);
      const bad = problems.filter(Boolean);
      assert.deepEqual(bad, [], "\n" + bad.join("\n"));
    });
  }

  test("MH-03 Điều hướng: tab dưới đáy, nút quay lại, menu tài khoản, đăng xuất", async () => {
    const id = await submitted();
    const page = await phone("test.qa1");
    const nav = page.getByRole("navigation", { name: "Điều hướng chính" }).last();
    await nav.getByRole("link", { name: "Phiếu", exact: true }).tap();
    await page.waitForURL(/\/phieu$/, T);
    await page.locator(`a[href='/phieu/${id}']`).first().tap();
    await page.waitForURL(id36, T);
    assert.equal(await nav.isVisible(), false, "thanh tab phải ẩn trong trang phiếu");
    await page.getByRole("link", { name: /Quay lại|Danh sách/ }).first().tap();
    await page.waitForURL(/\/phieu$/, T);
    await page.getByRole("button", { name: "Tài khoản" }).tap();
    await page.getByRole("menuitem", { name: "Đăng xuất" }).tap();
    await page.waitForURL(/\/login/, T);
    await open(page, "/qa");
    assert.match(page.url(), /\/login/, "đăng xuất rồi vẫn vào được trang trong");
    await page.done("MH-03");
  });

  test("MH-04 Bộ lọc danh sách phiếu (bảng trượt trên điện thoại)", async () => {
    await issued({ store: "TST2", items: [{ vt: "DP01", emp: "TNV3" }] });
    const page = await phone("test.admin");
    await open(page, "/phieu");
    await page.getByRole("button", { name: /^Lọc/ }).tap();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Cửa hàng").selectOption(ctx.store.TST2);
    await dlg.getByRole("button", { name: "Áp dụng" }).tap();
    await page.waitForURL(/store=/, T);
    await page.waitForLoadState("networkidle");
    const stores = await page.locator("main a[href^='/phieu/']").allInnerTexts();
    assert.ok(stores.length > 0 && stores.every((s) => s.includes("TEST Cửa hàng 2")), "lọc theo cửa hàng sai: " + stores.slice(0, 3).join(" | "));
    await page.done("MH-04");
  });
});

// =====================================================================
describe("Nhóm 1 · Phân quyền (giao diện)", () => {
  test("PQ-UI-01 Gõ URL trang của role khác bị chuyển về trang của mình", async () => {
    const cases = { "test.cht1": ["/admin", "/qa", "/phieu/moi"], "test.nv1": ["/admin", "/qa", "/cht", "/phieu/moi"], "test.qa1": ["/admin", "/cht"] };
    const bad = [];
    for (const [u, paths] of Object.entries(cases)) {
      const page = await phone(u);
      for (const p of paths) {
        await open(page, p);
        if (new URL(page.url()).pathname === p) bad.push(`${u} vào được ${p}`);
      }
      await page.done(`PQ-UI-01-${u}`);
    }
    assert.deepEqual(bad, []);
  });

  test("PQ-UI-02 Mở phiếu không có quyền xem → trang không tìm thấy", async () => {
    const other = await issued({ store: "TST2", items: [{ vt: "DP01", emp: "TNV3" }] });
    const d = await draft();
    const page = await phone("test.cht1");
    for (const id of [other, d]) {
      await open(page, `/phieu/${id}`);
      assert.ok(await page.getByText(/không tìm thấy|404|not found/i).count(), `CHT1 xem được phiếu ${id}`);
      assert.equal(await page.getByText("TEST Cửa hàng 2").count(), 0);
    }
    await open(page, "/phieu/khong-phai-uuid");
    assert.ok(await page.getByText(/không tìm thấy|404|not found/i).count(), "id sai không ra trang không tìm thấy");
    await page.done("PQ-UI-02");
  });

  test("PQ-UI-03 Nút thao tác chỉ hiện cho đúng người", async () => {
    const dec = await submitted();
    const lk = await locked();
    const ap = await appealed();
    const has = async (u, id, name) => {
      const page = await phone(u);
      await open(page, `/phieu/${id}`);
      const n = await page.getByRole("button", { name }).count();
      await page.close();
      return n > 0;
    };
    const bad = [];
    const expect = (cond, msg) => cond || bad.push(msg);
    expect(await has("test.qa1", dec, /Chốt và khóa/), "QA1 không thấy nút Chốt");
    expect(!(await has("test.qa2", dec, /Chốt và khóa/)), "QA2 thấy nút Chốt phiếu của QA1");
    expect(!(await has("test.admin", dec, /Chốt và khóa/)), "Admin thấy nút Chốt");
    expect(!(await has("test.cht1", dec, /Chốt và khóa/)), "CHT thấy nút Chốt");
    expect(await has("test.cht1", lk, /Khiếu nại lên Admin/), "CHT không thấy nút Khiếu nại");
    expect(!(await has("test.nv1", lk, /Khiếu nại lên Admin/)), "NV thấy nút Khiếu nại");
    expect(!(await has("test.qa1", lk, /Khiếu nại lên Admin/)), "QA thấy nút Khiếu nại");
    expect(await has("test.admin", lk, /Mở lại phiếu/), "Admin không thấy nút Mở lại");
    expect(!(await has("test.admin", ap, /Mở lại phiếu/)), "Admin thấy nút Mở lại khi đang có khiếu nại");
    expect(await has("test.admin", ap, /Giữ nguyên kết quả/), "Admin không thấy nút xử lý khiếu nại");
    expect(!(await has("test.qa1", ap, /Giữ nguyên kết quả/)), "QA thấy nút xử lý khiếu nại");
    assert.deepEqual(bad, []);
  });
});

// =====================================================================
describe("Nhóm 2 · Luồng liên role qua giao diện", () => {
  let id;
  test("LT-01 QA tạo phiếu, thêm lỗi + ảnh, phát hành", { timeout: 120_000 }, async () => {
    const page = await phone("test.qa1");
    await page.getByRole("navigation", { name: "Điều hướng chính" }).last().getByRole("link", { name: "Tạo phiếu" }).tap();
    await page.waitForURL(/\/phieu\/moi/, T);
    await page.getByLabel("Cửa hàng").selectOption(ctx.store.TST1);
    await page.getByLabel(/Ghi chú chung/).fill("TEST luồng giao diện — Kiểm tra ca sáng");
    await page.getByRole("button", { name: /Tiếp tục/ }).tap();
    await page.waitForURL(id36, T);
    id = page.url().match(/[0-9a-f-]{36}/)[0];
    await page.getByPlaceholder(/Tìm theo mã hoặc tên lỗi/).fill("DP01");
    await page.locator("[cmdk-item]").first().tap();
    const [chooser] = await Promise.all([page.waitForEvent("filechooser", T), page.getByText("Thêm ảnh", { exact: true }).tap()]);
    await chooser.setFiles({ name: "a.jpg", mimeType: "image/jpeg", buffer: await jpeg(page) });
    await page.getByAltText("Ảnh đã chọn 1").waitFor({ timeout: 30_000 });
    await page.getByLabel("Nhân viên vi phạm").selectOption(ctx.emp.TNV1);
    await page.getByRole("button", { name: "Lưu lỗi" }).tap();
    await toast(page, "Đã thêm lỗi");
    await page.getByRole("button", { name: /Phát hành phiếu/ }).tap();
    await confirmDialog(page, { button: "Phát hành" });
    await page.getByText("Chờ giải trình").first().waitFor(T);
    await page.done("LT-01");
    assert.equal((await ticket(id)).status, "pending_explanation");
  });

  test("LT-02 CHT thấy phiếu mới, không đồng ý + giải trình, gửi", { timeout: 120_000 }, async () => {
    assert.ok(id, "phụ thuộc LT-01");
    const page = await phone("test.cht1");
    await page.locator(`#can-giai-trinh a[href='/phieu/${id}']`).tap();
    await page.waitForURL(id36, T);
    await page.getByRole("radio", { name: /Không đồng ý/ }).first().tap();
    const send = page.getByRole("button", { name: /Gửi giải trình/ });
    assert.ok(await send.isDisabled(), "chưa ghi giải trình mà nút Gửi vẫn bật");
    await page.getByLabel(/Nội dung giải trình/).first().fill("Nhân viên đã thay đồng phục ngay, có ảnh đính kèm — tiếng Việt có dấu ✓");
    await send.tap();
    await confirmDialog(page, { button: "Gửi" });
    await toast(page, "Đã gửi giải trình");
    await page.done("LT-02");
    assert.equal((await ticket(id)).status, "pending_decision");
    assert.match((await itemsOf(id))[0].explanation, /tiếng Việt có dấu ✓/);
  });

  test("LT-03 QA thấy cần chốt, giảm tiền có lý do, chốt", { timeout: 120_000 }, async () => {
    assert.ok(id, "phụ thuộc LT-01");
    const page = await phone("test.qa1");
    await page.locator(`#can-chot a[href='/phieu/${id}']`).tap();
    await page.waitForURL(id36, T);
    await page.getByRole("radio", { name: "Giảm" }).first().tap();
    await page.getByLabel("Số tiền sau khi giảm").fill("20000");
    await page.getByLabel(/Lý do giảm/).fill("Cửa hàng đã khắc phục ngay tại chỗ");
    await page.getByRole("button", { name: /Chốt và khóa phiếu/ }).tap();
    await confirmDialog(page, { button: "Chốt phiếu" });
    await toast(page, "Đã chốt và khóa phiếu");
    await page.done("LT-03");
    assert.equal((await ticket(id)).status, "locked");
    assert.equal((await itemsOf(id))[0].final_amount, 20000);
  });

  test("LT-04 CHT khiếu nại lên Admin", { timeout: 120_000 }, async () => {
    assert.ok(id, "phụ thuộc LT-01");
    const page = await phone("test.cht1");
    await open(page, `/phieu/${id}`);
    await page.getByRole("button", { name: /Khiếu nại lên Admin/ }).tap();
    await confirmDialog(page, { reason: "Nhân viên đã thay đồng phục ngay, xin miễn phạt", button: "Gửi khiếu nại" });
    await toast(page, "Đã gửi khiếu nại");
    await page.getByText("Chờ Admin xử lý").waitFor(T);
    await page.done("LT-04");
    assert.equal((await ticket(id)).appeal_status, "pending");
  });

  test("LT-05 Admin thấy khiếu nại chờ xử lý, chấp nhận giảm", { timeout: 120_000 }, async () => {
    assert.ok(id, "phụ thuộc LT-01");
    const page = await phone("test.admin");
    await open(page, "/admin");
    await page.locator(`a[href='/phieu/${id}']`).first().tap();
    await page.waitForURL(id36, T);
    await page.locator("input[id^='ap-']").first().fill("10000");
    await page.getByLabel(/Lý do xử lý/).fill("Đồng ý giảm vì cửa hàng khắc phục ngay");
    await page.getByRole("button", { name: /Chấp nhận, giảm còn 10\.000/ }).tap();
    await confirmDialog(page, { button: "Chấp nhận" });
    await toast(page, "Đã chấp nhận khiếu nại");
    await page.done("LT-05");
    assert.equal((await ticket(id)).appeal_status, "accepted");
    assert.equal((await itemsOf(id))[0].final_amount, 10000);
  });

  test("LT-06 CHT thấy kết quả cuối cùng và lịch sử đủ bước", async () => {
    assert.ok(id, "phụ thuộc LT-01");
    const page = await phone("test.cht1");
    await open(page, `/phieu/${id}`);
    await page.getByText("Đã chấp nhận").first().waitFor(T);
    assert.ok(await page.getByText("10.000đ").count(), "không thấy tổng tiền mới");
    await page.done("LT-06");
    assert.deepEqual((await events(id)).map((e) => e.action), ["issued", "submitted", "locked", "appealed", "appeal_accepted"]);
  });
});

// =====================================================================
describe("Nhóm 4 · Nhập liệu & validate", () => {
  test("NL-01 Form chốt: chữ trong ô tiền, vượt mức đề xuất, lý do ngắn", async () => {
    const id = await submitted();
    const page = await phone("test.qa1");
    await open(page, `/phieu/${id}`);
    const lock = page.getByRole("button", { name: /Chốt và khóa phiếu/ });
    await page.getByRole("radio", { name: "Giảm" }).first().tap();
    const amt = page.getByLabel("Số tiền sau khi giảm");
    await amt.fill("abc");
    assert.equal(await amt.inputValue(), "", "ô tiền nhận chữ");
    await amt.fill("999999999");
    await page.getByText("Không được cao hơn mức đề xuất").waitFor(T);
    assert.ok(await lock.isDisabled());
    await amt.fill("50000");
    await page.getByText(/Số tiền giảm phải nhỏ hơn/).waitFor(T);
    await amt.fill("30000");
    await page.getByLabel(/Lý do giảm/).fill("12345678901234");
    await page.getByText(/ít nhất 15 ký tự \(14\/15\)/).waitFor(T);
    assert.ok(await lock.isDisabled());
    await page.getByLabel(/Lý do giảm/).fill("               ");
    assert.ok(await lock.isDisabled(), "lý do toàn khoảng trắng vẫn chốt được");
    await page.getByLabel(/Lý do giảm/).fill("123456789012345");
    assert.ok(!(await lock.isDisabled()), "lý do đủ 15 ký tự mà nút vẫn khóa");
    await page.done("NL-01");
  });

  test("NL-02 Hộp xác nhận có lý do: khóa nút đến khi đủ 15 ký tự", async () => {
    const id = await submitted();
    const page = await phone("test.qa1");
    await open(page, `/phieu/${id}`);
    await page.getByRole("button", { name: /Trả lại cửa hàng/ }).tap();
    const dlg = page.getByRole("alertdialog");
    const ok = dlg.getByRole("button", { name: "Trả lại", exact: true });
    assert.ok(await ok.isDisabled());
    await dlg.getByRole("textbox").fill("ngắn quá");
    assert.ok(await ok.isDisabled());
    await dlg.getByRole("textbox").fill("Cần tăng mức phạt vì lỗi tái phạm");
    assert.ok(!(await ok.isDisabled()));
    await dlg.getByRole("button", { name: "Quay lại" }).tap();
    await dlg.waitFor({ state: "detached" });
    await page.done("NL-02");
  });

  test("NL-03 Bấm Chốt 2 lần liên tiếp chỉ chốt 1 lần", async () => {
    const id = await submitted();
    const page = await phone("test.qa1");
    await open(page, `/phieu/${id}`);
    await page.getByRole("button", { name: /Chốt và khóa phiếu/ }).tap();
    const btn = page.getByRole("alertdialog").getByRole("button", { name: "Chốt phiếu", exact: true });
    await btn.waitFor(T);
    // 2 lần chạm sát nhau (trước khi React kịp khóa nút)
    await btn.evaluate((el) => { el.click(); el.click(); });
    await toast(page, "Đã chốt và khóa phiếu");
    await page.waitForTimeout(1500);
    await page.done("NL-03");
    assert.equal((await events(id)).filter((e) => e.action === "locked").length, 1);
  });

  test("NL-04 Giải trình: lưu nháp giữ nguyên nội dung tiếng Việt khi tải lại", async () => {
    const id = await issued();
    const page = await phone("test.cht1");
    await open(page, `/phieu/${id}`);
    await page.getByRole("radio", { name: /Không đồng ý/ }).first().tap();
    const text = "Ca sáng thiếu người — nhân viên mới, đã nhắc nhở ngay. \"Ngoặc kép\" & <thẻ>";
    await page.getByLabel(/Nội dung giải trình/).first().fill(text);
    await page.getByRole("button", { name: /Lưu nháp/ }).tap();
    await toast(page, /Đã lưu/);
    await page.reload();
    await page.waitForLoadState("networkidle");
    assert.equal(await page.getByLabel(/Nội dung giải trình/).first().inputValue(), text);
    await page.done("NL-04");
  });

  test("NL-05 Xử lý khiếu nại: không cho tăng tiền, cần lý do", async () => {
    const id = await appealed();
    const page = await phone("test.admin");
    await open(page, `/phieu/${id}`);
    const accept = page.getByRole("button", { name: /Chấp nhận, giảm còn/ });
    const keep = page.getByRole("button", { name: "Giữ nguyên kết quả" });
    assert.ok(await keep.isDisabled(), "chưa có lý do mà Giữ nguyên vẫn bật");
    await page.getByLabel(/Lý do xử lý/).fill("Xem xét lại toàn bộ bằng chứng");
    assert.ok(!(await keep.isDisabled()));
    assert.ok(await accept.isDisabled(), "chưa giảm mà Chấp nhận vẫn bật");
    await page.locator("input[id^='ap-']").first().fill("90000");
    await page.getByText("Không được tăng tiền khi xử lý khiếu nại.").waitFor(T);
    assert.ok(await accept.isDisabled());
    await page.done("NL-05");
  });
});

// =====================================================================
describe("Nhóm 6 · Ảnh", () => {
  test("AN-01 Xem ảnh toàn màn hình rồi đóng", async () => {
    const id = await issued();
    const page = await phone("test.cht1");
    await open(page, `/phieu/${id}`);
    const img = page.locator("main img").first();
    await img.waitFor(T);
    assert.ok(await img.evaluate((i) => i.complete && i.naturalWidth > 0), "ảnh minh chứng không tải được");
    await img.tap();
    const dlg = page.locator("dialog[open]");
    await dlg.waitFor(T);
    await page.getByRole("button", { name: /Đóng/ }).last().tap();
    await dlg.waitFor({ state: "detached", timeout: 5000 }).catch(async () => assert.equal(await page.locator("dialog[open]").count(), 0, "không đóng được ảnh"));
    await page.done("AN-01");
  });

  test("AN-02 Chọn file không phải ảnh: báo lỗi, không vỡ trang", async () => {
    const id = await draft({ items: [] });
    const page = await phone("test.qa1");
    await open(page, `/phieu/${id}`);
    await page.getByPlaceholder(/Tìm theo mã hoặc tên lỗi/).fill("DP01");
    await page.locator("[cmdk-item]").first().tap();
    const [chooser] = await Promise.all([page.waitForEvent("filechooser", T), page.getByText("Thêm ảnh", { exact: true }).tap()]);
    await chooser.setFiles({ name: "virus.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
    await page.waitForTimeout(3000);
    assert.equal(await page.getByAltText("Ảnh đã chọn 1").count(), 0, "file text được nhận làm ảnh");
    assert.deepEqual(page.errors.filter((e) => !/image|ảnh/i.test(e)), []);
    await page.done("AN-02");
  });

  test("AN-03 Sửa phiếu đã phát hành: ảnh cũ không có nút xóa", async () => {
    const id = await issued();
    const page = await phone("test.qa1");
    await open(page, `/phieu/${id}`);
    await page.getByRole("button", { name: "Sửa", exact: true }).first().tap();
    await page.getByText("Ảnh đã phát hành không xóa được").waitFor(T);
    assert.equal(await page.getByRole("button", { name: /^Bỏ ảnh/ }).count(), 0);
    await page.done("AN-03");
  });
});

// =====================================================================
describe("Nhóm 5 · Thông báo (giao diện)", () => {
  test("TB-UI-01 Chuông giữ số khi chưa đọc, chỉ trừ khi mở thông báo", async () => {
    await issued();
    await issued();
    const page = await phone("test.cht1");
    const unread = async () => (await svc.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid("test.cht1")).is("read_at", null)).count;
    const bell = async () => Number((await page.getByRole("link", { name: /Thông báo, \d+ chưa đọc/ }).first().getAttribute("aria-label")).match(/\d+/)[0]);
    const n0 = await unread();
    assert.equal(await bell(), n0);
    await open(page, "/thong-bao");
    await page.waitForTimeout(800);
    assert.equal(await unread(), n0, "chỉ mở trang thông báo mà đã bị trừ");
    await page.locator("main ul form button").first().tap();
    await page.waitForURL(id36, T);
    await page.waitForLoadState("networkidle");
    assert.equal(await unread(), n0 - 1);
    assert.equal(await bell(), n0 - 1, "chuông chưa cập nhật sau khi đọc");
    await page.done("TB-UI-01");
  });

  test("TB-UI-02 Thông báo mới hiện ngay (realtime) không cần tải lại", async () => {
    const page = await phone("test.cht1");
    await page.waitForTimeout(2000); // chờ kênh realtime kết nối
    await issued();
    await page.locator("[data-sonner-toast]").first().waitFor({ timeout: 15_000 });
    await page.done("TB-UI-02");
  });
});
