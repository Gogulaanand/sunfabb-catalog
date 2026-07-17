"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";

interface ProductCardProps {
  slug: string;
  name: string;
  imageUrl?: string | null;
  imageAlt?: string;
  formattedPrice?: string | null;
  aspectRatio?: "3/4" | "square";
  sizes?: string;
}

export function ProductCard({
  slug,
  name,
  imageUrl,
  imageAlt,
  formattedPrice,
  aspectRatio = "3/4",
  sizes = "(max-width: 768px) 50vw, 25vw",
}: ProductCardProps) {
  return (
    <Link
      href={`/catalog/${slug}`}
      className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }}
        className={`relative overflow-hidden rounded-md bg-surface-container mb-3 ${
          aspectRatio === "square" ? "aspect-square" : "aspect-[3/4]"
        }`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt ?? name}
            fill
            className="object-cover"
            sizes={sizes}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-outline text-4xl">
            🧵
          </div>
        )}
      </motion.div>
      <p className="text-title-sm text-on-surface">{name}</p>
      {formattedPrice && (
        <p className="text-price-lg text-on-surface-variant mt-1">
          {formattedPrice}
        </p>
      )}
    </Link>
  );
}
