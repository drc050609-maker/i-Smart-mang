"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";

import { useLanguage } from "@/components/language-provider";
import type { EventMediaItem } from "@/lib/event-media";

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function EventMediaCarousel({ media }: { media: EventMediaItem[] }) {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  if (media.length === 0) {
    return null;
  }

  const current = media[activeIndex]!;
  const hasMultiple = media.length > 1;

  function goToPrevious() {
    setActiveIndex((index) => (index === 0 ? media.length - 1 : index - 1));
  }

  function goToNext() {
    setActiveIndex((index) => (index === media.length - 1 ? 0 : index + 1));
  }

  return (
    <div className="relative overflow-hidden bg-black">
      <div className="relative aspect-square w-full">
        {current.media_type === "video" ? (
          <video
            key={current.id}
            src={current.public_url}
            controls
            playsInline
            className="size-full object-contain"
          />
        ) : (
          <img
            src={current.public_url}
            alt=""
            className="size-full object-cover"
          />
        )}
      </div>

      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-gray-900 shadow-sm hover:bg-white"
            aria-label={t("common.previousMedia")}
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-gray-900 shadow-sm hover:bg-white"
            aria-label={t("common.nextMedia")}
          >
            <ChevronRightIcon className="size-5" />
          </button>
          <div className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            {activeIndex + 1}/{media.length}
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {media.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={t("common.showMedia", { index: index + 1 })}
                className={classNames(
                  index === activeIndex ? "bg-white" : "bg-white/50",
                  "size-1.5 rounded-full",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
