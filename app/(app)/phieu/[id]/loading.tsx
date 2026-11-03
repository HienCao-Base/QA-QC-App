import { Bone, Panel } from "@/components/common";

/** Khung xương cho trang chi tiết phiếu. */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span role="status" className="sr-only">Đang tải phiếu…</span>
      <Bone className="h-9 w-24" />
      <Panel className="space-y-4 p-5">
        <div className="flex gap-2">
          <Bone className="h-7 w-32" />
          <Bone className="h-6 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} className="h-4 w-full" />
          ))}
        </div>
      </Panel>
      {[0, 1].map((i) => (
        <Panel key={i} className="space-y-3 p-5">
          <div className="flex justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-4 w-2/3" />
            </div>
            <Bone className="h-4 w-16" />
          </div>
          <Bone className="h-5 w-40 rounded-full" />
          <div className="flex gap-2">
            <Bone className="size-20 rounded-lg" />
            <Bone className="size-20 rounded-lg" />
          </div>
        </Panel>
      ))}
    </div>
  );
}
