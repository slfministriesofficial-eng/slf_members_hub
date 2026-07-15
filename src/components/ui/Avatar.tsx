type AvatarProps = {
  initials: string
  color?: string
  size?: number
}

export function Avatar({ initials, color = '#3F6B4C', size = 38 }: AvatarProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials}
    </div>
  )
}
