"use client";

export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumImageUrl: string | null;
  spotifyUrl: string;
  reason: string;
}

export function TrackCard({ t }: { t: Track }) {
  return (
    <article className="group bg-paper border border-rule flex flex-col overflow-hidden transition-all duration-300 hover:border-cobalt hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-paper-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={t.albumImageUrl ?? ""}
          alt={`${t.album} album cover`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-col flex-1 px-4 pt-4 pb-5">
        <h3
          className="font-display text-lg leading-tight text-ink"
          style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30, "WONK" 0' }}
        >
          {t.name}
        </h3>
        <p className="mt-1 text-sm text-ink-2">{t.artist}</p>
        <blockquote className="mt-4 pl-3 border-l-2 border-cobalt/70 text-sm text-ink-2 italic leading-relaxed">
          {t.reason}
        </blockquote>
        <div className="mt-auto pt-5">
          <a
            href={t.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ochre inline-block text-sm"
          >
            Open in Spotify ↗
          </a>
        </div>
      </div>
    </article>
  );
}

/** Skeleton card shown while results load. Matches TrackCard dimensions. */
export function TrackCardSkeleton() {
  return (
    <div className="bg-paper border border-rule flex flex-col overflow-hidden">
      <div className="aspect-square bg-paper-3 animate-pulse" />
      <div className="px-4 pt-4 pb-5 flex flex-col gap-3">
        <div className="h-5 w-3/4 bg-paper-3 animate-pulse" />
        <div className="h-4 w-1/2 bg-paper-3 animate-pulse" />
        <div className="mt-2 pl-3 border-l-2 border-rule flex flex-col gap-2">
          <div className="h-3 w-full bg-paper-3 animate-pulse" />
          <div className="h-3 w-2/3 bg-paper-3 animate-pulse" />
        </div>
        <div className="mt-3 h-9 w-32 bg-paper-3 animate-pulse" />
      </div>
    </div>
  );
}
