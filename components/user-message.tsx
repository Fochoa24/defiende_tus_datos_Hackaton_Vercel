import type { ReactNode } from "react"

type UserMessageProps = {
  children: ReactNode
}

export function UserMessage({ children }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[88%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-sm"
        style={{ backgroundColor: "#6366f1" }}
      >
        {children}
      </div>
    </div>
  )
}
