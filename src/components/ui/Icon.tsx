type IconProps = {
  name: string
  className?: string
}

export function Icon({ name, className = 'icon' }: IconProps) {
  return (
    <svg className={className}>
      <use href={`/icons.svg#i-${name}`} />
    </svg>
  )
}
