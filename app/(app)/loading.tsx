import { Bone, Panel } from "@/components/common";

/** Khung xương cho các trang danh sách ("Việc của tôi", danh sách phiếu, thông báo…). */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <span role="status" className="sr-only">Đang tải…</span>
      <div className="space-y-5">
        <div className="space-y-2">
          <Bone className="h-8 w-44" />
          <Bone className="h-4 w-64 max-w-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Bone key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
      {[0, 1].map((s) => (
        <div key={s} className="space-y-2.5">
          <Bone className="h-4 w-32" />
          <Panel>
            <div className="divide-y">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2 px-4 py-3.5">
                  <div className="flex justify-between gap-2">
                    <div className="flex gap-2">
                      <Bone className="h-4 w-20" />
                      <Bone className="h-4 w-24 rounded-full" />
                    </div>
                    <Bone className="h-4 w-16" />
                  </div>
                  <Bone className="h-3.5 w-3/4" />
                  <Bone className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ))}
    </div>
  );
}
