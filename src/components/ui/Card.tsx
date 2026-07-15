import type { PropsWithChildren } from 'react'

type CardProps = PropsWithChildren<{
  className?: string
}>

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl bg-surface shadow-card ${className}`}>
      {children}
    </div>
  )
}
