"use client";

// Renders one section. The same component drives the public view (editable=false)
// and the editor (editable=true). Section layouts are chosen by `section.type`;
// slots are located by their `label`.

import { EditableImage } from "@/components/editor/EditableImage";
import { EditableText } from "@/components/editor/EditableText";
import { FormSection } from "@/components/sections/FormSection";
import { ImportedSection } from "@/components/sections/ImportedSection";
import { RawHtmlSection } from "@/components/sections/RawHtmlSection";
import type { ImageValue, LinkValue, Section, Slot } from "@/lib/model/types";

export type EditFn = (slotId: string, value: Slot["value"]) => void;
export type EditImageFn = (slotId: string, value: ImageValue) => void;

function slotByLabel(section: Section, label: string): Slot | undefined {
  return section.slots.find((s) => s.label === label);
}

/** Editable link/button: inline label + a small control to edit the href. */
function EditableLink({
  slot,
  editable,
  className,
  style,
  onEdit,
}: {
  slot: Extract<Slot, { type: "link" | "button" }>;
  editable: boolean;
  className?: string;
  style?: React.CSSProperties;
  onEdit?: EditFn;
}) {
  const value: LinkValue = slot.value;
  const label = (
    <EditableText
      slotId={slot.id}
      initial={value.text}
      editable={editable}
      onEdit={(id, text) => onEdit?.(id, { text, href: value.href })}
    />
  );
  if (!editable) {
    return (
      <a href={value.href} className={className} style={style}>
        {value.text}
      </a>
    );
  }
  return (
    <span className={`${className} inline-flex items-center gap-1`} style={style}>
      {label}
      <button
        type="button"
        title={`Link target: ${value.href}`}
        className="text-xs opacity-60 hover:opacity-100"
        onClick={() => {
          const href = window.prompt("Link target (URL):", value.href);
          if (href !== null) onEdit?.(slot.id, { text: value.text, href: href.trim() });
        }}
      >
        🔗
      </button>
    </span>
  );
}

export function SectionView({
  section,
  editable,
  onEdit,
  onEditImage,
  siteSlug,
  pagePath = "",
}: {
  section: Section;
  editable: boolean;
  onEdit?: EditFn;
  onEditImage?: EditImageFn;
  /** Needed by `form` sections so they know where to POST submissions. */
  siteSlug?: string;
  pagePath?: string;
}) {
  const T = (
    label: string,
    cls: string,
    as: "h1" | "h2" | "h3" | "p" | "div" | "span" = "p",
    style?: React.CSSProperties,
  ) => {
    const s = slotByLabel(section, label);
    if (!s || (s.type !== "text" && s.type !== "richtext")) return null;
    return (
      <EditableText
        slotId={s.id}
        initial={s.value}
        color={s.color}
        editable={editable}
        as={as}
        className={cls}
        style={style}
        onEdit={onEdit}
      />
    );
  };

  const Img = (label: string, cls: string) => {
    const s = slotByLabel(section, label);
    if (!s || s.type !== "image") return null;
    return (
      <EditableImage
        slotId={s.id}
        value={s.value}
        editable={editable}
        className={cls}
        onEditImage={onEditImage}
      />
    );
  };

  const Btn = (label: string, cls: string, style?: React.CSSProperties) => {
    const s = slotByLabel(section, label);
    if (!s || (s.type !== "button" && s.type !== "link")) return null;
    return (
      <EditableLink slot={s} editable={editable} className={cls} style={style} onEdit={onEdit} />
    );
  };

  // Read a color-token slot's value (or a fallback) — drives design tokens.
  const colorOf = (label: string, fallback: string): string => {
    const s = slotByLabel(section, label);
    return s && s.type === "color" ? s.value : fallback;
  };

  // Optional text-color and padding tokens applied to a whole section.
  const textColorSlot = slotByLabel(section, "textColor");
  const textStyle: React.CSSProperties | undefined =
    textColorSlot && textColorSlot.type === "color"
      ? { color: textColorSlot.value }
      : undefined;

  const paddingSlot = slotByLabel(section, "padding");
  const padStyle: React.CSSProperties | undefined =
    paddingSlot && paddingSlot.type === "space"
      ? { paddingTop: paddingSlot.value, paddingBottom: paddingSlot.value }
      : undefined;

  switch (section.type) {
    case "imported":
      // A whole imported document, isolated in a sandboxed frame.
      return (
        <ImportedSection
          siteSlug={siteSlug ?? ""}
          pagePath={pagePath}
          editable={editable}
          onEdit={onEdit}
          onEditImage={onEditImage}
        />
      );

    case "raw-html":
      return (
        <RawHtmlSection
          section={section}
          editable={editable}
          onEdit={onEdit}
          onEditImage={onEditImage}
        />
      );

    case "hero":
      return (
        <section className="mx-auto max-w-4xl px-6 py-24 text-center" style={padStyle}>
          {T("headline", "text-5xl font-bold tracking-tight text-slate-900", "h1", textStyle)}
          {T("subhead", "mx-auto mt-6 max-w-2xl text-lg text-slate-600", "p", textStyle)}
          <div className="mt-8">
            {Btn(
              "cta",
              "inline-block rounded-full px-6 py-3 font-medium text-white hover:opacity-90",
              { backgroundColor: colorOf("accent", "#0f172a") },
            )}
          </div>
          {Img("image", "mx-auto mt-12 w-full max-w-3xl rounded-xl shadow-lg")}
        </section>
      );

    case "features":
      return (
        <section className="mx-auto max-w-5xl px-6 py-16">
          {T("heading", "mb-10 text-center text-3xl font-semibold text-slate-900", "h2")}
          <div className="grid gap-8 sm:grid-cols-3">
            {["one", "two", "three"].map((n) => (
              <div key={n} className="rounded-xl border border-slate-200 p-6">
                {T(`feature-${n}-title`, "text-lg font-semibold text-slate-900", "h3")}
                {T(`feature-${n}-body`, "mt-2 text-sm text-slate-600", "p")}
              </div>
            ))}
          </div>
        </section>
      );

    case "text": {
      // Optional image turns this into a 2-col split (text left, photo right) —
      // covers the very common "photo + copy" landing-page block.
      const imgSlot = slotByLabel(section, "image");
      const hasImage = imgSlot && imgSlot.type === "image";
      return (
        <section
          className={hasImage ? "mx-auto max-w-5xl px-6 py-16" : "mx-auto max-w-3xl px-6 py-16"}
          style={padStyle}
        >
          <div className={hasImage ? "grid items-center gap-10 sm:grid-cols-2" : undefined}>
            <div>
              {T("heading", "mb-4 text-3xl font-semibold text-slate-900", "h2", textStyle)}
              {T("body", "text-lg leading-relaxed text-slate-700", "p", textStyle)}
            </div>
            {hasImage && Img("image", "w-full rounded-xl object-cover shadow-lg")}
          </div>
        </section>
      );
    }

    case "gallery": {
      // A row of up to 4 images — for extra photos that don't fit a hero/text slot.
      const names = ["one", "two", "three", "four"].filter((n) => {
        const s = slotByLabel(section, `image-${n}`);
        return s && s.type === "image";
      });
      return (
        <section className="mx-auto max-w-5xl px-6 py-16" style={padStyle}>
          {T("heading", "mb-10 text-center text-3xl font-semibold text-slate-900", "h2", textStyle)}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {names.map((n) => (
              <div key={n} className="overflow-hidden rounded-xl">
                {Img(`image-${n}`, "h-48 w-full object-cover")}
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "testimonials": {
      // Up to 3 quote/author cards — for real testimonials, not squashed prose.
      const names = ["one", "two", "three"].filter((n) =>
        slotByLabel(section, `testimonial-${n}-quote`),
      );
      return (
        <section className="mx-auto max-w-5xl px-6 py-16" style={padStyle}>
          {T("heading", "mb-10 text-center text-3xl font-semibold text-slate-900", "h2", textStyle)}
          <div className="grid gap-6 sm:grid-cols-3">
            {names.map((n) => (
              <blockquote key={n} className="rounded-xl border border-slate-200 bg-white p-6">
                {T(`testimonial-${n}-quote`, "text-sm text-slate-700", "p")}
                <cite className="mt-4 block text-xs font-medium not-italic text-slate-500">
                  {T(`testimonial-${n}-author`, "", "span")}
                </cite>
              </blockquote>
            ))}
          </div>
        </section>
      );
    }

    case "faq": {
      // Up to 6 Q&A pairs as a native <details>/<summary> accordion — no JS needed.
      const names = ["one", "two", "three", "four", "five", "six"].filter((n) =>
        slotByLabel(section, `faq-${n}-q`),
      );
      return (
        <section className="mx-auto max-w-3xl px-6 py-16" style={padStyle}>
          {T("heading", "mb-8 text-center text-3xl font-semibold text-slate-900", "h2", textStyle)}
          <div className="divide-y divide-slate-200 border-t border-slate-200">
            {names.map((n) => (
              <details key={n} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-slate-900">
                  {T(`faq-${n}-q`, "", "span")}
                  <span className="ml-4 shrink-0 text-slate-400 group-open:hidden">+</span>
                  <span className="ml-4 hidden shrink-0 text-slate-400 group-open:inline">−</span>
                </summary>
                <div className="mt-2 text-sm text-slate-600">{T(`faq-${n}-a`, "", "p")}</div>
              </details>
            ))}
          </div>
        </section>
      );
    }

    case "cta":
      return (
        <section
          className="px-6 py-20 text-center"
          style={{ backgroundColor: colorOf("bg", "#0f172a"), ...padStyle }}
        >
          {T("heading", "text-3xl font-semibold text-white", "h2", textStyle)}
          <div className="mt-8">
            {Btn(
              "button",
              "inline-block rounded-full bg-white px-6 py-3 font-medium text-slate-900 hover:bg-slate-200",
            )}
          </div>
        </section>
      );

    case "form":
      return (
        <FormSection
          section={section}
          siteSlug={siteSlug}
          editable={editable}
          accent={colorOf("accent", "#0f172a")}
        >
          {T("heading", "text-3xl font-semibold text-slate-900", "h2", textStyle)}
          {T("intro", "mt-3 text-slate-600", "p", textStyle)}
        </FormSection>
      );

    case "footer":
      return (
        <footer className="border-t border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
          {T("text", "", "div")}
        </footer>
      );

    default:
      return (
        <section className="mx-auto max-w-3xl px-6 py-8 text-slate-500">
          {section.slots.map((s) =>
            s.type === "text" || s.type === "richtext" ? (
              <EditableText
                key={s.id}
                slotId={s.id}
                initial={s.value}
                editable={editable}
                as="p"
                onEdit={onEdit}
              />
            ) : null,
          )}
        </section>
      );
  }
}
