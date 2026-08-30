"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import HiddenAdminTrigger from "./HiddenAdminTrigger";
import { getPhotosPage } from "@/app/lib/actions/public";
import { incrementPhotoStat } from "@/app/lib/actions/photos";

function svgHeart(filled) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
      <path d="M12 20.6s-7.6-4.6-10-9.2C.4 8 2 4.4 5.6 3.6c2.1-.5 4.2.4 5.4 2.1a1 1 0 001.6 0c1.2-1.7 3.3-2.6 5.4-2.1C21.6 4.4 23.2 8 21.6 11.4 19.2 16 12 20.6 12 20.6z" />
    </svg>
  );
}
const svgShare = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M7 12v6a1 1 0 001 1h8a1 1 0 001-1v-6M16 8l-4-4-4 4M12 4v13" />
  </svg>
);

const LIKED_KEY = "iz_liked_photos_v1";
function getLiked() {
  try { return JSON.parse(localStorage.getItem(LIKED_KEY) || "{}"); } catch { return {}; }
}
function setLikedStorage(obj) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify(obj)); } catch {}
}

export default function Gallery({ initialPhotos, hasMoreInitial, totalCount, about }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [hasMore, setHasMore] = useState(hasMoreInitial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [liked, setLiked] = useState({});
  const [markVisible, setMarkVisible] = useState(false);
  const [toast, setToast] = useState("");
  const [needlePct, setNeedlePct] = useState(0);

  const scrollerRef = useRef(null);
  const sentinelRef = useRef(null);
  const toastTimer = useRef(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    setLiked(getLiked());
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { photos: next, hasMore: more } = await getPhotosPage(photos.length);
    setPhotos((prev) => [...prev, ...next]);
    setHasMore(more);
    setLoadingMore(false);
  }, [loadingMore, hasMore, photos.length]);

  // Infinite loading: fetch the next batch shortly before the visitor
  // reaches the end, so hundreds/thousands of photographs never load
  // (or render) all at once.
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: scrollerRef.current, rootMargin: "200% 0px" }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [loadMore]);

  // Reveal-on-scroll for each scene.
  useEffect(() => {
    const scenes = Array.from(document.querySelectorAll(".scene"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.55) entry.target.classList.add("in-view");
          else if (entry.intersectionRatio < 0.15) entry.target.classList.remove("in-view");
        });
      },
      { root: scrollerRef.current, threshold: [0, 0.15, 0.55, 0.8] }
    );
    scenes.forEach((s) => io.observe(s));
    if (scenes[0]) scenes[0].classList.add("in-view");
    return () => io.disconnect();
  }, [photos.length]);

  function showEnter() {
    scrollerRef.current?.scrollIntoView({ behavior: reduceMotion.current ? "auto" : "smooth" });
    setMarkVisible(true);
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setNeedlePct(max > 0 ? el.scrollTop / max : 0);
    if (el.scrollTop > window.innerHeight * 0.4) setMarkVisible(true);
  }

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  async function onLike(photo) {
    if (liked[photo.id]) return; // one-way counter — already liked from this browser
    const nextLiked = { ...liked, [photo.id]: true };
    setLiked(nextLiked);
    setLikedStorage(nextLiked);
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, likes: p.likes + 1 } : p)));
    try { await incrementPhotoStat(photo.id, "likes"); } catch {}
  }

  async function onShare(photo) {
    const url = `${window.location.origin}/#photo-${photo.id}`;
    if (navigator.share) {
      navigator.share({ title: `Islem Zrelli — ${photo.title}`, url }).catch(() => {});
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    } else {
      showToast(url);
    }
    try { await incrementPhotoStat(photo.id, "shares"); } catch {}
  }

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <HiddenAdminTrigger visible={markVisible} />

      <nav className={`rail${markVisible ? " show" : ""}`} aria-hidden="true">
        <div className="track">
          <div className="needle" style={{ transform: `translateY(${needlePct * 320}px)` }} />
        </div>
        <div className="frame-label">Scroll</div>
      </nav>

      <header className="hero">
        <div className="hero-inner">
          <span className="meta">Tunisia — Visual Stories</span>
          <h1>{about?.name || "Islem Zrelli"}</h1>
          <p className="role">Photographer<span className="dot">·</span>Filmmaker<span className="dot">·</span>Environmental Activist</p>
          <button className="enter" onClick={showEnter} aria-label="Enter gallery">
            <span className="arrow-line" />
            Enter Gallery
          </button>
        </div>
        <div className="hero-foot meta">
          <span>{totalCount} Stories</span>
          <span className="rule" />
          <span>Coasts, Deserts &amp; What We're Losing</span>
        </div>
      </header>

      <main className="scroller" ref={scrollerRef} onScroll={onScroll}>
        {photos.map((p, i) => (
          <Scene
            key={p.id}
            photo={p}
            index={i}
            total={photos.length}
            liked={!!liked[p.id]}
            onLike={() => onLike(p)}
            onShare={() => onShare(p)}
          />
        ))}
        {hasMore && <div ref={sentinelRef} className="load-sentinel" />}

        <section className="scene finale" aria-label="Contact">
          <div className="frame-img">
            {about?.profile_photo_url && <img src={about.profile_photo_url} alt={about?.name || ""} loading="lazy" />}
          </div>
          <div className="scrim" />
          <div className="scene-content">
            <span className="tag">End of the Story — For Now</span>
            <h2>Let's Tell the Next One</h2>
            <p className="caption">{about?.short_bio || "Available for documentary commissions, environmental campaigns and collaborations."}</p>
            <div className="social">
              {about?.contact_email && <a href={`mailto:${about.contact_email}`}>Email</a>}
              {(about?.social_links || []).map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>
              ))}
            </div>
            <p className="signoff">{about?.name || "Islem Zrelli"} — Tunisia</p>
          </div>
        </section>
      </main>

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </>
  );
}

function Scene({ photo, index, total, liked, onLike, onShare }) {
  const num = String(index + 1).padStart(2, "0");
  return (
    <section className="scene" id={`photo-${photo.id}`} aria-label={photo.title}>
      <div className="frame-img">
        <img src={photo.image_url} alt={photo.alt_text || photo.title} loading={index < 2 ? "eager" : "lazy"} />
      </div>
      <div className="scrim" />
      <div className="scene-content">
        <span className="tag">{photo.location || ""}</span>
        <h2>{photo.title}</h2>
        <p className="caption">{photo.story}</p>
        <div className="scene-rule" />
        <div className="scene-actions">
          <div className="actions-left">
            <button className={`action-btn like-btn${liked ? " liked" : ""}`} onClick={onLike} aria-pressed={liked} aria-label="Like this photo">
              {svgHeart(liked)}
              <span className="like-count">{photo.likes.toLocaleString()}</span>
            </button>
            <span className="action-divider" aria-hidden="true" />
            <button className="action-btn share-btn" onClick={onShare} aria-label="Share this photo">
              {svgShare}<span>Share</span>
            </button>
          </div>
          <div className="frame-counter"><b>{num}</b> — {String(total).padStart(2, "0")}</div>
        </div>
      </div>
    </section>
  );
}
