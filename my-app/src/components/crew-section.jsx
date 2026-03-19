import { Briefcase, User } from "lucide-react"
import Link from "next/link"

export default function CrewSection({ crew }) {
  if (!crew || crew.length === 0) {
    return null
  }

  // Filter and group important crew members, or just take top ones
  // For now let's just show top crew or handle it similarly
  return (
    <section>
      <div className="flex items-center gap-3 mb-6 mt-12">
        <Briefcase className="w-6 h-6 text-primary" />
        <h2 className="text-3xl font-bold text-foreground">Crew</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {crew.map((member) => (
          <Link 
            key={`${member.id}-${member.job}`} 
            href={`/actor/${member.id}`}
            className="text-center group cursor-pointer"
          >
            <div className="w-full aspect-square bg-secondary rounded-full mb-3 overflow-hidden">
              {member.profilePath ? (
                <img
                  src={member.profilePath}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="font-semibold text-foreground text-sm line-clamp-2 mb-1">{member.name}</p>
            {member.job && (
              <p className="text-xs text-muted-foreground line-clamp-2">{member.job}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
