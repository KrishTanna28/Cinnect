'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function getUserInitial(username) {
  const normalizedUsername = username?.trim()
  return normalizedUsername ? normalizedUsername.charAt(0).toUpperCase() : "?"
}

export default function UserAvatar({
  src,
  username,
  alt,
  title,
  className,
  fallbackClassName
}) {
  return (
    <Avatar className={className} title={title ?? username}>
      {src ? <AvatarImage src={src} alt={alt || username || "User"} className="object-cover" /> : null}
      <AvatarFallback className={cn("bg-primary/15 text-primary font-semibold", fallbackClassName)}>
        {getUserInitial(username)}
      </AvatarFallback>
    </Avatar>
  )
}
