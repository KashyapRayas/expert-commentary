import BookFan from './BookFan.jsx'
import styles from './ExpertCommentary.module.css'
import { asset } from './asset.js'

/**
 * The "Exclusive Expert Commentary" section of the SavvyWise site
 * (Figma node 149:1507), with the book fan filling the panel that is empty in
 * the design (node 149:1635).
 */
export default function ExpertCommentary() {
  return (
    <section className={styles.section}>
      <div className={styles.bleed}>
        <div className={styles.rails}>
          <div className={styles.row}>
            <div className={styles.left}>
              <div className={styles.heading}>
                <span className={styles.icon}>
                  <img src={asset("icon-message-square.svg")} alt="" />
                </span>
                <h2>Exclusive Expert Commentary</h2>
              </div>

              <p className={styles.lede}>
                SavvyWise&rsquo;s knowledge base already covers the legislation,
                regulations, rulings and court decisions, continuously updated and
                highly structured. Expert commentary is the layer on top of it —
                prepared and submitted by vetted domain specialists to help you
                interpret the law, not just locate it.
              </p>

              {/*
                The panel is empty in the design and carries its own #E4E4E4
                fill; the fan takes it edge to edge rather than sitting inside
                the frame's 24px padding, since the two share a background and
                the composition needs the width.
              */}
              <div className={styles.panel}>
                <BookFan />
              </div>
            </div>

            <div className={styles.right}>
              <div className={styles.photo}>
                <img src={asset("commentary-photo.jpg")} alt="Adrian Cartland in conversation on stage" />
              </div>

              <figure className={styles.quote}>
                <blockquote>
                  &ldquo;This is cutting edge material. You will not find anything
                  else like this.&rdquo;
                </blockquote>
                <figcaption>
                  <span className={styles.name}>Adrian Cartland</span>
                  <span className={styles.role}>Principal Tax Lawyer at Cartland Law</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
