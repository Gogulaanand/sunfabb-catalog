'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';

const HERO_IMAGE = '/images/home/sunfabb-hero-option-e.png';

const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroSection() {
  return (
    <section
      className="relative flex items-end overflow-hidden"
      style={{ height: 'calc(100svh - 5rem)', minHeight: '600px' }}
    >
      {/* Ken Burns image - MotionProvider's reducedMotion="user" disables on prefers-reduced-motion */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1 }}
        animate={{ scale: 1.06 }}
        transition={{
          duration: 20,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        <Image
          src={HERO_IMAGE}
          alt="Sunfabb bedspread, towels and table linen in a sunlit home"
          fill
          priority
          loading="eager"
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      {/* Bottom-to-top gradient scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

      {/* Hero copy - bottom aligned, staggered reveal on mount */}
      <div className="relative z-10 w-full max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) pb-16 md:pb-28">
        <motion.h1
          className="font-display text-white mb-4"
          style={{
            fontSize: 'clamp(2.5rem, 5vw + 1rem, 5.5rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          Crafted for Comfort
        </motion.h1>

        <motion.p
          className="text-white/80 text-body-md max-w-xs md:max-w-sm mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.12 }}
        >
          Bedspreads, towels, napkins and table linen from India.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.24 }}
        >
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center h-12 px-10 rounded bg-primary text-on-primary text-label-caps hover:bg-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Shop Now
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
