import type { VisualVideo } from "./types";
import styles from "./FieldVideo.module.css";

/** Shared by visible cards and the media-free, natural-height measurement bank. */
export default function VideoCaption({ item, measure = false }: { item: VisualVideo; measure?: boolean }) {
  return (
    <div className={styles.captionContainer}>
    <div className={`${styles.caption} ${measure ? "" : styles.captionSpace}`}>
      {item.eyebrow ? (
        <>
          <p className="text-xs uppercase tracking-[0.25em] text-white/35">{item.eyebrow}</p>
          <h3 className={`${styles.captionTitle} font-serif text-white`}>{item.title}</h3>
        </>
      ) : (
        <>
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/35">Field Video</p>
            <h3 className={`${styles.captionTitle} font-serif text-white`}>{item.title}</h3>
          </div>
          <div>
            {item.subtitle && <p className={`${styles.captionSubtitle} text-white/65`}>{item.subtitle}</p>}
            {item.note && <p className={`${styles.captionNote} text-white/45`}>{item.note}</p>}
          </div>
        </>
      )}
    </div>
    </div>
  );
}
