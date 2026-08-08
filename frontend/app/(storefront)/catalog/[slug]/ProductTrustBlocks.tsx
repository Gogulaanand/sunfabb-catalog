import Link from 'next/link';
import { SITE } from '@/lib/site-config';

export interface ProductTrustContent {
  dispatchExpectation?: string;
  deliveryRegion?: string;
  returnsSummary?: string;
  paymentPosture?: string;
  businessContact?: string;
}

interface TrustBlock {
  key: keyof ProductTrustContent;
  label: string;
  value: string;
  href?: '/contact';
}

const PLACEHOLDER_VALUES = new Set([
  '...',
  'n/a',
  'placeholder',
  'tbd',
  'to be confirmed',
]);

function verifiedText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed.toLowerCase()))
    return undefined;
  return trimmed;
}

/**
 * Builds only claims supported by the current storefront configuration.
 *
 * Dispatch, delivery and returns use the conservative working copy from the
 * approved storefront configuration. Checkout is opt-in, so the payment
 * posture clearly describes the current lead-generation mode until commerce
 * is explicitly enabled.
 */
export function getProductTrustContent(): ProductTrustContent {
  const content: ProductTrustContent = {};
  const siteName = verifiedText(SITE.name);

  if (siteName) {
    content.businessContact = `Contact ${siteName} at ${SITE.phone.display} or ${SITE.email}.`;
  }

  content.dispatchExpectation = verifiedText(SITE.trust.shippingTimeline);
  content.deliveryRegion = verifiedText(SITE.trust.shippingCoverage);
  content.returnsSummary = verifiedText(SITE.trust.returnWindow);

  if (process.env.ECOMMERCE_ENABLED === 'true') {
    content.paymentPosture = 'Online payment is available at checkout.';
  } else {
    content.paymentPosture =
      'Payment is not taken through this catalogue; confirm payment details with Sunfabb before ordering.';
  }

  return content;
}

export function ProductTrustBlocks({
  content = getProductTrustContent(),
}: {
  content?: ProductTrustContent;
}) {
  const allBlocks: TrustBlock[] = [
    {
      key: 'dispatchExpectation',
      label: 'Dispatch expectation',
      value: verifiedText(content.dispatchExpectation) ?? '',
    },
    {
      key: 'deliveryRegion',
      label: 'Delivery region',
      value: verifiedText(content.deliveryRegion) ?? '',
    },
    {
      key: 'returnsSummary',
      label: 'Returns summary',
      value: verifiedText(content.returnsSummary) ?? '',
    },
    {
      key: 'paymentPosture',
      label: 'Payment posture',
      value: verifiedText(content.paymentPosture) ?? '',
    },
    {
      key: 'businessContact',
      label: 'Business contact',
      value: verifiedText(content.businessContact) ?? '',
      href: '/contact',
    },
  ];
  const blocks = allBlocks.filter((block) => block.value.length > 0);

  if (blocks.length === 0) return null;

  return (
    <section
      aria-labelledby="product-trust-heading"
      className="mt-6 border-t border-outline-variant pt-6"
    >
      <h2
        id="product-trust-heading"
        className="text-label-caps text-on-surface-variant tracking-widest mb-4"
      >
        Good to know
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {blocks.map((block) => (
          <li
            key={block.key}
            className="rounded border border-outline-variant/70 bg-surface-container/30 p-3"
          >
            <h3 className="text-label-caps text-on-surface-variant tracking-widest">
              {block.label}
            </h3>
            {block.href ? (
              <Link
                href={block.href}
                className="mt-1 block text-body-sm text-primary underline underline-offset-4 hover:text-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {block.value}
              </Link>
            ) : (
              <p className="mt-1 text-body-sm text-on-surface">{block.value}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
